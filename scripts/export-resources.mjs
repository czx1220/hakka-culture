import { writeFile } from "node:fs/promises";
const repository = process.env.GITHUB_REPOSITORY || "czx1220/hakka-culture";
const headers = { Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN)
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
const issues = [];
for (let page = 1; ; page++) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/issues?state=open&labels=resource-approved&per_page=100&page=${page}`,
    { headers, signal: AbortSignal.timeout(20000) },
  );
  if (!response.ok)
    throw new Error(`Resource export failed: HTTP ${response.status}`);
  const batch = await response.json();
  if (!Array.isArray(batch)) throw new Error("Invalid resource response");
  issues.push(
    ...batch
      .filter((x) => !x.pull_request)
      .map((x) => ({
        number: x.number,
        title: x.title,
        body: x.body,
        user: { login: x.user.login },
      })),
  );
  if (batch.length < 100) break;
}
await writeFile(
  "assets/resources.json",
  JSON.stringify(issues, null, 2) + "\n",
);
console.log(`Exported ${issues.length} approved resources`);
