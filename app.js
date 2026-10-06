const tracks = [
  { title: "山间来信", type: "山歌", note: "山歌意象 · 五声旋律", seed: 1 },
  { title: "土楼听雨", type: "器乐", note: "器乐意象 · 温柔慢板", seed: 2 },
  { title: "远方的乡音", type: "新编", note: "新编意象 · 轻快节拍", seed: 3 },
];
let filter = "all",
  currentAudio = null,
  currentButton = null,
  currentUrl = null,
  generatedUrl = null;
const grid = document.querySelector("#music-grid");
function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentButton) {
    currentButton.textContent = "▶";
    currentButton.setAttribute("aria-label", "播放演示旋律");
    currentButton.closest(".music-card")?.classList.remove("playing");
    currentButton = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}
function makeWav(seed, duration, mood = "gentle", instrument = "piano") {
  const rate = 22050,
    length = rate * duration,
    buffer = new ArrayBuffer(44 + length * 2),
    view = new DataView(buffer);
  const write = (offset, str) =>
    [...str].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, length * 2, true);
  const scale = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25],
    beat = mood === "bright" ? 0.28 : mood === "deep" ? 0.65 : 0.46;
  for (let i = 0; i < length; i++) {
    const t = i / rate,
      n = Math.floor(t / beat),
      x = t % beat,
      f =
        scale[(n * 3 + seed + Math.floor(n / 4)) % scale.length] *
        (mood === "deep" ? 0.5 : 1);
    const envelope =
      Math.min(x / 0.015, 1) *
      Math.exp(
        -x * (instrument === "flute" ? 2 : instrument === "pluck" ? 9 : 5),
      ) *
      Math.min((duration - t) / 0.15, 1);
    const sample =
      (Math.sin(2 * Math.PI * f * x) +
        (instrument === "flute" ? 0.08 : instrument === "pluck" ? 0.5 : 0.25) *
          Math.sin(4 * Math.PI * f * x)) *
      0.24 *
      envelope;
    view.setInt16(
      44 + i * 2,
      Math.max(-32767, Math.min(32767, sample * 32767)),
      true,
    );
  }
  return new Blob([buffer], { type: "audio/wav" });
}
function render() {
  stopAudio();
  grid.replaceChildren();
  const q = document.querySelector("#search").value.trim();
  const shown = tracks.filter(
    (t) =>
      (filter === "all" || t.type === filter) &&
      (t.title + t.type + t.note).includes(q),
  );
  document.querySelector("#empty").hidden = shown.length > 0;
  shown.forEach((t) => {
    const card = document.createElement("article");
    card.className = "music-card";
    card.innerHTML = `<div class="record"><div class="disc"><div class="disc-center"></div></div></div><span class="track-type">${t.type} / DEMO SOUND</span><div class="track-meta"><div><h3>${t.title}</h3><small>${t.note}</small></div><button class="audio-button" aria-label="播放${t.title}演示旋律">▶</button></div>`;
    card.querySelector("button").onclick = async (e) => {
      const button = e.currentTarget;
      if (button === currentButton) {
        stopAudio();
        return;
      }
      stopAudio();
      document.querySelector("#generated-audio").pause();
      currentUrl = URL.createObjectURL(
        makeWav(t.seed, 12, t.seed === 3 ? "bright" : "gentle"),
      );
      currentAudio = new Audio(currentUrl);
      currentButton = button;
      button.textContent = "Ⅱ";
      button.setAttribute("aria-label", "停止播放");
      card.classList.add("playing");
      currentAudio.onended = stopAudio;
      try {
        await currentAudio.play();
      } catch {
        stopAudio();
        toast("播放未成功，请再试一次。");
      }
    };
    grid.append(card);
  });
}
document.querySelectorAll("[data-filter]").forEach(
  (b) =>
    (b.onclick = () => {
      filter = b.dataset.filter;
      document
        .querySelectorAll("[data-filter]")
        .forEach((x) => x.classList.toggle("selected", x === b));
      render();
    }),
);
document.querySelector("#search").oninput = render;
render();
const details = {
  performance: [
    "南客之音 · 山海共鸣",
    "以参考资料中的公益展演为灵感，汇聚山歌、戏曲与现代编曲，让客家文化走向更广阔的舞台。",
    "这是展演内容预告。当前尚未接入真实演出视频或直播，后续可在这里观看完整节目与文化解说。",
  ],
  folk: [
    "一声山歌，一生乡情",
    "从劳动生活到节庆相聚，歌声记录着人与故乡的联系。这个栏目将展示客家山歌片段，并配合歌词、译文与文化故事。",
    "当前为栏目示例，真实曲目与解说待补充。",
  ],
  opera: [
    "一折戏里的客家记忆",
    "这里将以传统戏曲选段为入口，介绍唱腔、表演和作品中的生活故事，让更多年轻人认识客家戏曲。",
    "当前为栏目示例，演出视频与作品资料待补充。",
  ],
  fusion: [
    "当乡音遇见新节拍",
    "邀请创作者把传统旋律与钢琴、电子音乐及其他音乐风格相结合，探索客家音乐的当代表达。",
    "你可以先前往 AI 共创板块，体验本地合成旋律。",
  ],
  craft: [
    "客韵 · 日常系列",
    "让土楼的轮廓、山歌的诗意与客家纹样进入日常。首期概念包括帆布袋、明信片与文化书签。",
    "当前仅为文创概念展示，未开放购买或支付。",
  ],
};
const dialog = document.querySelector("dialog");
document.querySelectorAll("[data-detail]").forEach(
  (b) =>
    (b.onclick = () => {
      const key = b.dataset.detail;
      const content = document.querySelector("#dialog-content");
      content.replaceChildren();
      if (key === "share") {
        content.innerHTML =
          '<div class="eyebrow">YOUR IDEA, OUR NEXT CHAPTER</div><h2>留下你的共创灵感</h2><p>把想法记录在当前浏览器，随时回来继续。Demo 暂不公开发布或上传至服务器。</p><form id="idea-form"><label for="idea">你的灵感</label><textarea id="idea" required maxlength="1000" placeholder="想用山歌讲述怎样的故事？"></textarea><button class="button">保存到本机 ↗</button></form>';
        try {
          content.querySelector("textarea").value =
            localStorage.getItem("hakka-idea") || "";
        } catch {}
        content.querySelector("form").onsubmit = (e) => {
          e.preventDefault();
          try {
            localStorage.setItem(
              "hakka-idea",
              content.querySelector("textarea").value,
            );
            dialog.close();
            toast("灵感已保存在当前浏览器");
          } catch {
            toast("浏览器无法保存，请复制并保留你的灵感。");
          }
        };
      } else {
        const [title, ...paragraphs] = details[key];
        const h = document.createElement("h2");
        h.textContent = title;
        content.append(h);
        paragraphs.forEach((text) => {
          const p = document.createElement("p");
          p.textContent = text;
          content.append(p);
        });
      }
      dialog.showModal();
    }),
);
document.querySelector(".close").onclick = () => dialog.close();
dialog.onclick = (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
};
let toastTimer;
function toast(message) {
  const t = document.querySelector("#toast");
  t.textContent = message;
  t.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.style.display = "none"), 3000);
}
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting)
        document
          .querySelectorAll("nav a")
          .forEach((a) =>
            a.classList.toggle("active", a.hash === "#" + e.target.id),
          );
    });
  },
  { rootMargin: "-10% 0px -65% 0px" },
);
document
  .querySelectorAll("main section[id]")
  .forEach((s) => observer.observe(s));
