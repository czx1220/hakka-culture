const { JSDOM } = require("jsdom");
const fs = require("fs");
const assert = require("node:assert/strict");
const path = require("path");
const root = path.resolve(__dirname, "..");
(async () => {
  const dom = new JSDOM(fs.readFileSync(root + "/index.html", "utf8"), {
    url: "https://czx1220.github.io/hakka-culture/",
    runScripts: "outside-only",
  });
  const w = dom.window,
    d = w.document;
  w.IntersectionObserver = class {
    observe() {}
  };
  w.URL.createObjectURL = () => "blob:demo";
  w.URL.revokeObjectURL = () => {};
  w.HTMLMediaElement.prototype.pause = function () {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.Audio = class {
    play() {
      return Promise.resolve();
    }
    pause() {}
  };
  const maliciousTitle = "<img src=x onerror=alert(1)>";
  w.fetch = async () => ({
    ok: true,
    json: async () => [
      {
        number: 42,
        title: maliciousTitle,
        user: { login: "guest" },
        body: "### 资源分类\n音乐\n\n### 作者或来源\nGuest\n\n### 资源链接\nhttps://example.com/song.wav\n\n### 资源介绍\nShared song\n\n### 使用许可\nCC0",
      },
      {
        number: 43,
        title: "bad",
        user: { login: "guest" },
        body: "### 资源分类\n音乐\n\n### 资源链接\njavascript:alert(1)",
      },
    ],
  });
  w.eval(
    ["config.js", "app.js", "resources.js", "composer.js"]
      .map((file) => fs.readFileSync(root + "/" + file, "utf8"))
      .join("\n"),
  );
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(d.querySelectorAll(".resource-card").length, 4);
  assert.equal(d.querySelectorAll(".resource-card img").length, 0);
  assert(
    d.querySelector("#resource-grid").textContent.includes(maliciousTitle),
  );
  d.querySelector('[data-category="音乐"]').click();
  assert.equal(d.querySelectorAll(".resource-card").length, 1);
  d.querySelector(".resource-actions button:last-child").click();
  assert.equal(JSON.parse(w.localStorage.getItem("hakka-favorites"))[0], "42");
  d.querySelector(".resource-actions button").click();
  assert.equal(
    d.querySelector("#dialog-content a").href,
    "https://example.com/song.wav",
  );
  d.querySelector(".close").click();
  d.querySelector("#resource-search").value = "找不到";
  d.querySelector("#resource-search").dispatchEvent(new w.Event("input"));
  assert.equal(d.querySelector("#resource-empty").hidden, false);
  d.querySelector("#submit-resource").click();
  let opened;
  w.open = (url) => {
    opened = url;
  };
  const f = d.querySelector("#resource-form");
  f.elements.title.value = "原创曲";
  f.elements.author.value = "作者";
  f.elements.url.value = "https://example.com/song.wav";
  f.elements.description.value = "描述";
  f.dispatchEvent(new w.Event("submit", { cancelable: true }));
  assert(
    opened.startsWith("https://github.com/czx1220/hakka-culture/issues/new?"),
  );
  assert(
    new URL(opened).searchParams.get("body").includes("### 资源分类\n音乐"),
  );
  d.querySelector(".close").click();
  d.querySelector('[data-mode="ai"]').click();
  assert.equal(d.querySelector("#generate-button").disabled, true);
  assert(d.querySelector("#mode-description").textContent.includes("尚未开通"));
  d.querySelector('[data-mode="demo"]').click();
  d.querySelector("[data-prompt]").click();
  assert(d.querySelector("#prompt").value.includes("竹笛"));
  d.querySelector("#compose-form").dispatchEvent(
    new w.Event("submit", { cancelable: true }),
  );
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(d.querySelector("#compose-result").hidden, false);
  assert.equal(d.querySelector("#download").href, "blob:demo");
  assert.equal(w.eval("makeWav(1,8)").size, 44 + 22050 * 8 * 2);
  d.querySelector('[data-filter="器乐"]').click();
  assert.equal(d.querySelectorAll(".music-card").length, 1);
  for (const a of d.querySelectorAll('a[href^="#"]'))
    assert(d.querySelector(a.getAttribute("href")));
  console.log(
    "PASS: approved resources, unsafe URL filtering, XSS text rendering, favorites, search, details, GitHub submission, unconfigured AI state, demo audio, music filters and anchors",
  );
  dom.window.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
