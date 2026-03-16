import fs from "fs";
import path from "path";

const postsDir = "./src/content/posts";

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\wа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function detectCluster(title) {

  const t = title.toLowerCase();

  if (t.includes("налог")) return "taxes";
  if (t.includes("доход")) return "profit";
  if (t.includes("район")) return "districts";
  if (t.includes("инвест")) return "investments";

  return "profit";
}

function createPost(title, content) {

  const slug = slugify(title);

  const date = new Date().toISOString().slice(0, 10);

  const cluster = detectCluster(title);

  const fileName = `${slug}-${date}.md`;

  const frontmatter = `---
title: ${title}
description: ${title}
pubDate: ${date}
cluster: ${cluster}
tags:
 - аренда
 - недвижимость
---

${content}
`;

  fs.writeFileSync(
    path.join(postsDir, fileName),
    frontmatter
  );

  console.log("✅ Готово:", fileName);
}

export default createPost;