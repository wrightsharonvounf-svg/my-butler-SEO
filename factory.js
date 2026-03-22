import fs from "fs";
import path from "path";

const postsDir = "./src/content/posts";

// 👉 гарантируем что папка есть
fs.mkdirSync(postsDir, { recursive: true });

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

  const filePath = path.join(postsDir, fileName);

  fs.writeFileSync(filePath, frontmatter);

  console.log("✅ Готово:", fileName);
}

// 🚀 ГЛАВНАЯ ТОЧКА ВХОДА
async function runFactory() {
  console.log("🚀 Factory started");

  // 👉 тестовые темы (потом заменим на генерацию)
  const topics = [
    "Как снизить налог с аренды квартиры",
    "Сколько можно заработать на аренде квартиры",
    "Лучшие районы для сдачи квартиры",
    "Стоит ли инвестировать в недвижимость в 2026"
  ];

  for (const title of topics) {
    createPost(title, "Автоматически сгенерированный контент...");
  }

  console.log("🔥 Factory finished");
}

runFactory().catch((e) => {
  console.error("💥 ERROR:", e);
  process.exit(1);
});