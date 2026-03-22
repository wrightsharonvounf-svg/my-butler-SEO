import fs from "fs";
import path from "path";

const postsDir = "./src/content/posts";

// --------------------
// 🔤 Транслитерация
// --------------------
function transliterate(str) {
  const map = {
    а: "a", б: "b", в: "v", г: "g", д: "d",
    е: "e", ё: "e", ж: "zh", з: "z", и: "i",
    й: "y", к: "k", л: "l", м: "m", н: "n",
    о: "o", п: "p", р: "r", с: "s", т: "t",
    у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
    ш: "sh", щ: "sch", ь: "", ы: "y", ъ: "",
    э: "e", ю: "yu", я: "ya"
  };

  return str
    .toLowerCase()
    .split("")
    .map((char) => map[char] || char)
    .join("");
}

// --------------------
// 🔗 Slug
// --------------------
function slugify(str) {
  return transliterate(str)
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --------------------
// 🧠 Кластеры
// --------------------
function detectCluster(title) {
  const t = title.toLowerCase();

  if (t.includes("налог")) return "taxes";
  if (t.includes("доход") || t.includes("заработ")) return "profit";
  if (t.includes("район")) return "districts";
  if (t.includes("инвест")) return "investments";

  return "profit";
}

// --------------------
// ✍️ Создание поста
// --------------------
function createPost(title, content) {
  const slug = slugify(title);
  const date = new Date().toISOString().slice(0, 10);
  const cluster = detectCluster(title);

  const fileName = `${slug}.md`;
  const filePath = path.join(postsDir, fileName);

  const frontmatter = `---
title: "${title}"
description: "${title}"
pubDate: ${date}
cluster: ${cluster}
tags:
  - аренда
  - недвижимость
---

${content}
`;

  fs.writeFileSync(filePath, frontmatter);

  console.log(`✅ ${fileName}`);
}

// --------------------
// 🧹 Очистка
// --------------------
function cleanPosts() {
  if (fs.existsSync(postsDir)) {
    fs.rmSync(postsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(postsDir, { recursive: true });

  console.log("🧹 Очистили папку posts");
}

// --------------------
// 🚀 Главный запуск
// --------------------
async function runFactory() {
  console.log("🚀 Factory started");
  console.log("📁 CWD:", process.cwd());

  cleanPosts();

  // 👉 сюда потом подключим генерацию (API / GPT / парсинг)
  const topics = [
    "Как снизить налог с аренды квартиры",
    "Сколько можно заработать на аренде квартиры",
    "Лучшие районы для сдачи квартиры",
    "Стоит ли инвестировать в недвижимость в 2026",
  ];

  for (const title of topics) {
    createPost(
      title,
      "Это автоматически сгенерированная статья. Здесь будет SEO-контент."
    );
  }

  console.log("🔥 Factory finished");
}

// --------------------
// ❗ Гарантированный запуск
// --------------------
runFactory().catch((err) => {
  console.error("💥 ERROR:", err);
  process.exit(1);
});