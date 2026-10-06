(() => {
  let mode = "demo",
    busy = false,
    requestId = null,
    resultSource = "demo";
  const config = window.HAKKA_CONFIG,
    form = document.querySelector("#compose-form"),
    status = document.querySelector("#generation-status"),
    button = document.querySelector("#generate-button");
  const styles = {
      gentle: "warm, gentle, soothing",
      bright: "bright, upbeat, rhythmic",
      deep: "atmospheric, spacious, meditative",
    },
    instruments = {
      piano: "piano",
      flute: "bamboo flute",
      pluck: "plucked strings, guzheng",
    };
  function updateMode() {
    const ai = mode === "ai";
    document.querySelectorAll("[data-mode]").forEach((b) => {
      b.classList.toggle("selected", b.dataset.mode === mode);
      b.disabled = busy;
    });
    document.querySelector("#mode-description").textContent = ai
      ? config.musicApiBase
        ? "AI 纯音乐生成 · 输入描述后提交，生成可能需要数分钟。"
        : "AI 音乐服务尚未开通，暂时可使用旋律演示。"
      : "本地规则合成，可立即试听；不调用 AI 模型。";
    document.querySelector("#ai-access").hidden = !ai || !config.musicApiBase;
    button.disabled = busy || (ai && !config.musicApiBase);
    button.textContent = busy
      ? "正在创作，请稍候…"
      : ai
        ? "✦ 开始 AI 作曲"
        : "✦ 生成演示旋律";
  }
  document.querySelectorAll("[data-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        mode = b.dataset.mode;
        status.textContent = "";
        updateMode();
      }),
  );
  document.querySelectorAll("[data-prompt]").forEach(
    (b) =>
      (b.onclick = () => {
        document.querySelector("#prompt").value = b.dataset.prompt;
      }),
  );
  async function api(path, body) {
    const r = await fetch(config.musicApiBase.replace(/\/$/, "") + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${document.querySelector("#access-code").value}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "服务请求失败，请稍后再试。");
    return data;
  }
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const prompt = document.querySelector("#prompt").value.trim();
    if (!prompt) return;
    if (mode === "ai" && !config.musicApiBase) return;
    if (mode === "ai" && !document.querySelector("#access-code").value.trim()) {
      status.textContent = "请填写创作邀请码。";
      return;
    }
    busy = true;
    updateMode();
    stopAudio();
    const player = document.querySelector("#generated-audio");
    player.pause();
    document.querySelector("#compose-result").hidden = true;
    status.textContent =
      mode === "ai" ? "正在提交音乐创作…" : "正在生成演示旋律…";
    const duration = Number(document.querySelector("#duration").value),
      mood = document.querySelector("#mood").value,
      instrument = document.querySelector("#instrument").value;
    try {
      let url;
      if (mode === "demo") {
        let seed = 0;
        for (const char of prompt)
          seed = (seed * 31 + char.codePointAt(0)) % 997;
        const blob = makeWav(seed, duration, mood, instrument);
        if (generatedUrl) URL.revokeObjectURL(generatedUrl);
        generatedUrl = URL.createObjectURL(blob);
        url = generatedUrl;
      } else {
        const job = await api("/api/music", {
          prompt: `Instrumental music, Hakka-inspired pentatonic melody. ${prompt}. ${styles[mood]}, ${instruments[instrument]}. No vocals.`,
          duration,
        });
        requestId = job.id;
        let result;
        for (let i = 0; i < 100; i++) {
          await sleep(3000);
          result = await api(`/api/music/${encodeURIComponent(requestId)}`);
          status.textContent =
            result.status === "IN_QUEUE"
              ? "作品已排队，正在等待生成…"
              : "AI 正在编曲和生成音频…";
          if (result.status === "COMPLETED") break;
        }
        if (result?.status !== "COMPLETED")
          throw new Error(
            "生成时间较长，请稍后使用下方“查询上次任务”，不要重复提交。",
          );
        url = result.audioUrl;
        if (!/^https:\/\//.test(url))
          throw new Error("音乐服务返回了无效链接。");
      }
      showResult(url, mode);
      status.textContent =
        mode === "ai"
          ? "AI 音乐已生成，请及时保存音频。"
          : "演示旋律已生成（本地规则合成，非 AI）。";
      requestId = null;
    } catch (error) {
      status.textContent =
        error.name === "TimeoutError"
          ? "请求超时。若任务已提交，请查询上次任务。"
          : error.message;
    } finally {
      busy = false;
      updateMode();
      document.querySelector("#retry-job").hidden = !requestId;
    }
  };
  function showResult(url, source) {
    resultSource = source;
    document.querySelector("#generated-audio").src = url;
    const download = document.querySelector("#download");
    download.href = url;
    if (source === "ai") {
      download.removeAttribute("download");
      download.target = "_blank";
      download.rel = "noopener noreferrer";
      download.textContent = "打开音频并保存 ↗";
    } else {
      download.download = "hakka-demo.wav";
      download.removeAttribute("target");
      download.textContent = "下载旋律 ↓";
    }
    document.querySelector("#compose-result").hidden = false;
    document.querySelector('#compose-result [role="status"]').textContent =
      source === "ai" ? "我的 AI 音乐作品" : "我的演示旋律";
  }
  const retry = document.createElement("button");
  retry.id = "retry-job";
  retry.type = "button";
  retry.className = "text-link";
  retry.textContent = "查询上次任务 ↻";
  retry.hidden = true;
  status.after(retry);
  retry.onclick = async () => {
    retry.disabled = true;
    try {
      const result = await api(`/api/music/${encodeURIComponent(requestId)}`);
      if (result.status === "COMPLETED") {
        if (!/^https:\/\//.test(result.audioUrl))
          throw new Error("无效音频链接");
        showResult(result.audioUrl, "ai");
        status.textContent = "AI 音乐已生成，请及时保存。";
        requestId = null;
        retry.hidden = true;
      } else status.textContent = "上次任务仍在处理中，请稍后查询。";
    } catch (e) {
      status.textContent = e.message;
    } finally {
      retry.disabled = false;
    }
  };
  document.querySelector("#generated-audio").onplay = stopAudio;
  document.querySelector("#share-composition").onclick = () =>
    window.openResourceSubmission(
      resultSource === "ai" ? "我的 AI 音乐作品" : "我的原创旋律演示",
    );
  updateMode();
})();
