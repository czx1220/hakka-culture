import test from "node:test";
import assert from "node:assert/strict";
import { createMusicServer } from "../server/music-server.mjs";
async function withServer(options, fn) {
  const server = createMusicServer(options);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((r) => server.close(r));
  }
}
const env = {
  FAL_KEY: "test-key",
  MUSIC_ACCESS_CODE: "test-invite-code-12345",
  ALLOWED_ORIGIN: "https://czx1220.github.io",
};
const headers = {
  Authorization: `Bearer ${env.MUSIC_ACCESS_CODE}`,
  "Content-Type": "application/json",
  Origin: env.ALLOWED_ORIGIN,
};
test("unconfigured service and access control never call provider", async () => {
  let called = false;
  await withServer(
    {
      env: {},
      fetchImpl: () => {
        called = true;
      },
    },
    async (base) => {
      assert.equal((await fetch(base + "/api/music")).status, 503);
    },
  );
  await withServer(
    {
      env,
      fetchImpl: () => {
        called = true;
      },
    },
    async (base) => {
      assert.equal((await fetch(base + "/api/music")).status, 401);
      assert.equal(
        (
          await fetch(base + "/api/music", {
            headers: { ...headers, Origin: "https://bad.example" },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await fetch(base + "/api/music", {
            method: "POST",
            headers,
            body: JSON.stringify({ prompt: "x", duration: 500 }),
          })
        ).status,
        400,
      );
    },
  );
  assert.equal(called, false);
});
test("create job, poll and return audio without exposing credentials", async () => {
  let calls = 0;
  await withServer(
    {
      env,
      fetchImpl: async (url, init) => {
        calls++;
        assert.equal(init.headers.Authorization, "Key test-key");
        if (init.method === "POST") {
          assert.equal(JSON.parse(init.body).seconds_total, 8);
          return {
            ok: true,
            json: async () => ({
              status_url: "https://queue.fal.run/job/status",
              response_url: "https://queue.fal.run/job/result",
            }),
          };
        }
        return {
          ok: true,
          json: async () =>
            url.endsWith("status")
              ? { status: "COMPLETED" }
              : { audio: { url: "https://media.example/song.wav" } },
        };
      },
    },
    async (base) => {
      const r = await fetch(base + "/api/music", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: "flute melody", duration: 8 }),
      });
      assert.equal(r.status, 202);
      const { id } = await r.json();
      const result = await (
        await fetch(base + "/api/music/" + id, { headers })
      ).json();
      assert.equal(result.audioUrl, "https://media.example/song.wav");
      assert.equal(JSON.stringify(result).includes("test-key"), false);
      assert.equal(
        (
          await fetch(
            base + "/api/music/00000000-0000-0000-0000-000000000000",
            { headers },
          )
        ).status,
        404,
      );
    },
  );
  assert.equal(calls, 3);
});
test("reject untrusted upstream URLs", async () => {
  await withServer(
    {
      env,
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          status_url: "https://attacker.example/",
          response_url: "https://queue.fal.run/result",
        }),
      }),
    },
    async (base) => {
      assert.equal(
        (
          await fetch(base + "/api/music", {
            method: "POST",
            headers,
            body: JSON.stringify({ prompt: "flute", duration: 8 }),
          })
        ).status,
        502,
      );
    },
  );
});
