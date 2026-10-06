(() => {
  const config = window.HAKKA_CONFIG;
  const issueBase = `https://github.com/${config.repository}/issues`;
  const seeds = [
    {
      id: "starter-1",
      title: "声音采集记录模板",
      category: "文献",
      author: "客韵编辑台",
      license: "CC0",
      description:
        "记录采集地点、声音特征、表演者授权与整理信息。原创空白模板，可用于你的文化采风。",
      url: "assets/field-recording.txt",
      builtin: true,
    },
    {
      id: "starter-2",
      title: "山水土楼 · 原创插画",
      category: "素材",
      author: "客韵编辑台",
      license: "CC BY 4.0",
      description:
        "网站原创 SVG 艺术示意，可下载用于非遗介绍、活动海报和文化共创。使用时请署名“客韵”。",
      url: "assets/landscape.svg",
      builtin: true,
    },
    {
      id: "starter-3",
      title: "五声音阶 · 创作练习谱",
      category: "乐谱",
      author: "客韵编辑台",
      license: "CC0",
      description:
        "以 1、2、3、5、6 为基础的原创简谱练习及创作提示，不是真实传统曲目的转录。",
      url: "assets/pentatonic-score.txt",
      builtin: true,
    },
  ];
  let community = [],
    category = "全部",
    favorites = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem("hakka-favorites") || "[]");
    if (Array.isArray(saved))
      favorites = new Set(saved.filter((x) => typeof x === "string"));
  } catch {}
  const grid = document.querySelector("#resource-grid");
  function node(tag, text, cls) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function safeUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password
        ? u.href
        : null;
    } catch {
      return null;
    }
  }
  function field(body, name) {
    const match = body.match(
      new RegExp(`(?:^|\\n)### ${name}\\s*\\n([\\s\\S]*?)(?=\\n### |$)`),
    );
    return match?.[1].trim() || "";
  }
  function parseIssue(issue) {
    if (issue.pull_request || typeof issue.body !== "string") return null;
    const rawLink = field(issue.body, "资源链接");
    const attachment = rawLink.match(/!?\[[^\]]*\]\((https:\/\/[^\s)]+)\)/);
    const url = safeUrl(attachment ? attachment[1] : rawLink),
      cat = field(issue.body, "资源分类");
    if (!url || !["音乐", "乐谱", "影像", "文献", "素材"].includes(cat))
      return null;
    return {
      id: String(issue.number),
      title: issue.title.replace(/^\[资源\]\s*/, ""),
      category: cat,
      author: field(issue.body, "作者或来源") || issue.user.login,
      license: field(issue.body, "使用许可"),
      description: field(issue.body, "资源介绍"),
      url,
      discussion: `${issueBase}/${issue.number}`,
    };
  }
  function renderResources() {
    const q = document
      .querySelector("#resource-search")
      .value.trim()
      .toLowerCase();
    const only = document.querySelector("#favorites-only").checked;
    const list = [...community, ...seeds].filter(
      (r) =>
        (category === "全部" || r.category === category) &&
        (!only || favorites.has(r.id)) &&
        `${r.title} ${r.author} ${r.description}`.toLowerCase().includes(q),
    );
    grid.replaceChildren();
    document.querySelector("#resource-count").textContent =
      `${list.length} 份资源 · ${community.length} 份社区投稿`;
    document.querySelector("#resource-empty").hidden = !!list.length;
    list.forEach((r) => {
      const card = node("article", null, "resource-card");
      const top = node("div", null, "resource-card-top");
      top.append(
        node("span", r.category, "resource-type"),
        node("small", r.builtin ? "平台原创" : "社区共享"),
      );
      card.append(
        top,
        node("h3", r.title),
        node("p", r.description, "resource-description"),
        node("small", `${r.author} · ${r.license}`, "resource-author"),
      );
      const actions = node("div", null, "resource-actions");
      const detail = node("button", "查看资源 ↗", "text-link");
      detail.onclick = () => openDetail(r);
      const favorite = node(
        "button",
        favorites.has(r.id) ? "♥ 已收藏" : "♡ 收藏",
        "text-link",
      );
      favorite.setAttribute("aria-pressed", String(favorites.has(r.id)));
      favorite.onclick = () => {
        const next = new Set(favorites);
        next.has(r.id) ? next.delete(r.id) : next.add(r.id);
        try {
          localStorage.setItem("hakka-favorites", JSON.stringify([...next]));
          favorites = next;
          renderResources();
        } catch {
          toast("收藏未保存，浏览器存储不可用。");
        }
      };
      actions.append(detail, favorite);
      card.append(actions);
      grid.append(card);
    });
  }
  function openDetail(r) {
    const content = document.querySelector("#dialog-content");
    content.replaceChildren(
      node("div", `${r.category} / RESOURCE`, "eyebrow"),
      node("h2", r.title),
      node("p", r.description),
      node("p", `作者或来源：${r.author}`),
      node("p", `使用许可：${r.license}`),
    );
    if (r.category === "音乐" || r.category === "影像") {
      const media = node(r.category === "音乐" ? "audio" : "video");
      media.controls = true;
      media.preload = "none";
      media.src = r.url;
      media.style.width = "100%";
      media.style.marginTop = "18px";
      media.onplay = () => {
        stopAudio();
        document.querySelector("#generated-audio").pause();
      };
      const hint = node(
        "p",
        "如果资源链接不是直接音视频文件，请点击下方链接打开。",
        "fine-print",
      );
      content.append(media, hint);
    }
    const a = node("a", r.builtin ? "下载资源 ↓" : "打开资源链接 ↗", "button");
    a.href = r.url;
    if (r.builtin) a.download = r.url.split("/").pop();
    else {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    content.append(a);
    if (r.discussion) {
      const discuss = node("a", "讨论 / 报告资源问题 ↗", "discussion-link");
      discuss.href = r.discussion;
      discuss.target = "_blank";
      discuss.rel = "noopener noreferrer";
      content.append(discuss);
    }
    dialog.showModal();
  }
  async function loadResources(live = false) {
    const status = document.querySelector("#resource-status"),
      refresh = document.querySelector("#refresh-resources");
    refresh.disabled = true;
    status.textContent = "正在同步社区资源…";
    try {
      let all = [];
      if (!live) {
        const response = await fetch("assets/resources.json", {
          cache: "no-cache",
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error();
        const issues = await response.json();
        if (!Array.isArray(issues)) throw new Error();
        all = issues.map(parseIssue).filter(Boolean);
      }
      for (let page = 1; live && page <= 10; page++) {
        const url = `https://api.github.com/repos/${config.repository}/issues?state=open&labels=${encodeURIComponent(config.approvedLabel)}&per_page=100&page=${page}`;
        const response = await fetch(url, {
          headers: { Accept: "application/vnd.github+json" },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error();
        const issues = await response.json();
        if (!Array.isArray(issues)) throw new Error();
        all.push(...issues.map(parseIssue).filter(Boolean));
        if (issues.length < 100) break;
      }
      community = all;
      renderResources();
      status.textContent = community.length
        ? "资源已加载。收藏仅保存在当前浏览器。"
        : "还没有已审核的社区投稿，先使用下方原创资源，或分享第一份收藏。";
    } catch {
      status.textContent =
        "资源暂时无法同步，可能是网络或请求额度限制。已显示的资源仍可使用，请稍后刷新。";
    } finally {
      refresh.disabled = false;
    }
  }
  window.openResourceSubmission = (title = "") => {
    const content = document.querySelector("#dialog-content");
    content.innerHTML = `<div class="eyebrow">SHARE SOMETHING MEANINGFUL</div><h2>分享你的资源</h2><p>下一步将在 GitHub 登录并公开提交投稿，审核后展示在资源库。请分享你有权传播的资源。</p><form id="resource-form" class="resource-form"><label>资源名称<input name="title" required maxlength="80"></label><label>资源分类<select name="category"><option>音乐</option><option>乐谱</option><option>影像</option><option>文献</option><option>素材</option></select></label><label>作者或来源<input name="author" required maxlength="80"></label><label>资源链接（选填）<input name="url" type="url" placeholder="https://… 或下一步上传文件"></label><label>资源介绍<textarea name="description" required maxlength="800" placeholder="资源内容、适用场景，以及访问或下载方式"></textarea></label><label>使用许可<select name="license"><option>仅供学习欣赏，其他使用请联系作者</option><option>CC BY 4.0</option><option>CC BY-NC 4.0</option><option>CC0</option></select></label><label class="rights-check"><input type="checkbox" required> 我有权分享该资源，并确认链接可公开访问</label><button class="button">前往 GitHub 提交 ↗</button><p class="fine-print">没有链接？下一步将文件拖入 GitHub 正文的“资源链接”区域，等待上传完成再提交。MP3、WAV、PDF 等文件通常限 25 MB；更大的文件请使用外部链接。</p></form>`;
    const form = content.querySelector("form");
    form.elements.title.value = title;
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const url = safeUrl(data.get("url"));
      if (data.get("url").trim() && !url) {
        toast("请填写不含账号密码的 HTTPS 公开链接。");
        return;
      }
      const clean = (s) => String(s).trim().replace(/^### /gm, "＃＃＃ ");
      const body = `### 资源分类\n${clean(data.get("category"))}\n\n### 作者或来源\n${clean(data.get("author"))}\n\n### 资源链接\n${url || "请将文件拖入这里，上传完成后保留生成的链接并删除本句。"}\n\n### 资源介绍\n${clean(data.get("description"))}\n\n### 使用许可\n${clean(data.get("license"))}\n\n### 权利确认\n我有权分享该资源，并确认链接可公开访问。`;
      const query = new URLSearchParams({
        title: `[资源] ${clean(data.get("title"))}`,
        body,
        labels: "resource-pending",
      });
      window.open(`${issueBase}/new?${query}`, "_blank", "noopener,noreferrer");
    };
    const help = node("a", "直接使用 GitHub 投稿表单 ↗", "discussion-link");
    help.href = `${issueBase}/new?template=resource.yml`;
    help.target = "_blank";
    help.rel = "noopener noreferrer";
    content.append(help);
    dialog.showModal();
  };
  document.querySelector("#submit-resource").onclick = () =>
    window.openResourceSubmission();
  document.querySelectorAll("[data-category]").forEach(
    (b) =>
      (b.onclick = () => {
        category = b.dataset.category;
        document
          .querySelectorAll("[data-category]")
          .forEach((x) => x.classList.toggle("selected", x === b));
        renderResources();
      }),
  );
  document.querySelector("#resource-search").oninput = renderResources;
  document.querySelector("#favorites-only").onchange = renderResources;
  document.querySelector("#refresh-resources").onclick = () =>
    loadResources(true);
  renderResources();
  dialog.addEventListener("close", () =>
    dialog.querySelectorAll("audio,video").forEach((media) => media.pause()),
  );
  loadResources();
})();
