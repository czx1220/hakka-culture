import http from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";

const MODEL = "fal-ai/stable-audio-25/text-to-audio";
const QUEUE = "https://queue.fal.run";
function providerUrl(value) {
  const url = new URL(value);
  if (url.origin !== QUEUE || url.username || url.password)
    throw new Error("Invalid upstream endpoint");
  return url.href;
}
export function createMusicServer({
  env = process.env,
  fetchImpl = fetch,
  now = Date.now,
} = {}) {
  const jobs = new Map(),
    requests = [];
  const origin = env.ALLOWED_ORIGIN || "https://czx1220.github.io";
  const invite = env.MUSIC_ACCESS_CODE || "";
  const configured = Boolean(env.FAL_KEY && invite.length >= 16);
  const authorized = (value) => {
    const actual = Buffer.from(value || ""),
      expected = Buffer.from(`Bearer ${invite}`);
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  };
  async function upstream(url, payload) {
    const response = await fetchImpl(providerUrl(url), {
      method: payload ? "POST" : "GET",
      headers: {
        Authorization: `Key ${env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(25000),
      redirect: "error",
    });
    if (!response.ok) throw new Error("Upstream request failed");
    return response.json();
  }
  return http.createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    if (req.headers.origin && req.headers.origin !== origin)
      return send(403, { error: "此来源未获授权。" });
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    const path = new URL(req.url, "http://localhost").pathname;
    if (path === "/health" && req.method === "GET")
      return send(200, { configured });
    if (!configured) return send(503, { error: "AI 服务尚未配置。" });
    if (!authorized(req.headers.authorization))
      return send(401, { error: "创作邀请码无效。" });
    for (const [id, job] of jobs)
      if (now() - job.created > 30 * 60 * 1000) jobs.delete(id);
    while (requests.length && now() - requests[0] > 3600000) requests.shift();
    if (path === "/api/music" && req.method === "POST") {
      if (requests.length >= 10)
        return send(429, { error: "本小时创作额度已用完，请稍后重试。" });
      if ([...jobs.values()].filter((j) => !j.done).length >= 2)
        return send(429, { error: "当前有作品正在生成，请稍后重试。" });
      let raw = "";
      try {
        for await (const chunk of req) {
          raw += chunk;
          if (Buffer.byteLength(raw) > 16000) {
            send(413, { error: "描述内容过长。" });
            return;
          }
        }
        let input;
        try {
          input = JSON.parse(raw);
        } catch {
          return send(400, { error: "请求格式无效。" });
        }
        if (
          typeof input.prompt !== "string" ||
          !input.prompt.trim() ||
          input.prompt.length > 2000 ||
          ![8, 16, 24].includes(input.duration)
        )
          return send(400, { error: "请提供有效描述及 8、16 或 24 秒时长。" });
        // Recheck after reading the body: another request may have reserved a slot.
        if (
          requests.length >= 10 ||
          [...jobs.values()].filter((j) => !j.done).length >= 2
        )
          return send(429, { error: "当前创作额度或并发已满，请稍后重试。" });
        // Reserve before awaiting the provider, so parallel submissions respect the limit.
        const id = randomUUID();
        jobs.set(id, { created: now(), done: false, submitting: true });
        requests.push(now());
        try {
          const result = await upstream(`${QUEUE}/${MODEL}`, {
            prompt: input.prompt,
            seconds_total: input.duration,
          });
          const statusUrl = providerUrl(result.status_url),
            resultUrl = providerUrl(result.response_url);
          jobs.set(id, { created: now(), statusUrl, resultUrl, done: false });
          return send(202, { id });
        } catch {
          jobs.delete(id);
          return send(502, {
            error:
              "音乐服务未能确认任务，请稍后检查服务商后台，避免立即重复提交。",
          });
        }
      } catch {
        return send(400, { error: "无法读取请求。" });
      }
    }
    const match = path.match(/^\/api\/music\/([a-f0-9-]{36})$/);
    if (match && req.method === "GET") {
      const job = jobs.get(match[1]);
      if (!job)
        return send(404, {
          error: "任务已过期或服务已重启。请检查服务商任务记录。",
        });
      if (job.audioUrl)
        return send(200, { status: "COMPLETED", audioUrl: job.audioUrl });
      try {
        const result = await upstream(job.statusUrl);
        if (result.status === "COMPLETED") {
          const output = await upstream(job.resultUrl);
          const audio =
            typeof output.audio === "string" ? output.audio : output.audio?.url;
          const audioUrl = new URL(audio);
          if (
            audioUrl.protocol !== "https:" ||
            audioUrl.username ||
            audioUrl.password
          )
            throw new Error();
          job.done = true;
          job.audioUrl = audioUrl.href;
          return send(200, { status: "COMPLETED", audioUrl: job.audioUrl });
        }
        if (!["IN_QUEUE", "IN_PROGRESS"].includes(result.status)) {
          job.done = true;
          return send(502, { error: "音乐生成失败，请稍后重试。" });
        }
        return send(200, { status: result.status });
      } catch {
        return send(502, {
          error: "暂时无法获取生成状态，请稍后查询上次任务。",
        });
      }
    }
    return send(404, { error: "接口不存在。" });
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = Number(process.env.PORT || 8787);
  createMusicServer().listen(port, "0.0.0.0", () =>
    console.log(`Music API listening on port ${port}`),
  );
}
