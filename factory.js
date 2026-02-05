// factory.js v3.0 — стабильная генерация без обрывов
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const POSTS_DIR = "./src/content/posts";
const TOPICS_FILE = "topics.txt";
const QUEUE_FILE = "topics-queue.txt";

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("❌ Нет DEEPSEEK_API_KEY");
  process.exit(1);
}

if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
}

// Транслитерация
function transliterate(title) {
  const ru = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",
    з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",
    п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",
    ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
  };

  return title.toLowerCase()
    .split("")
    .map(c => ru[c] || c)
    .join("")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// === Запрос к DeepSeek ===
async function askAI(prompt) {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 3500
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "AI error");
  }

  return data.choices[0].message.content.trim();
}

// === Генерация статьи ===
async function generateArticle(topic) {
  console.log("🤖 Генерация основной части...");

  const basePrompt = `
Напиши подробную SEO-статью на русском языке на тему: "${topic}"

ТРЕБОВАНИЯ:
- Объем 1500–2000 слов
- НЕ добавляй заголовок H1
- Начинай сразу с введения
- Используй подзаголовки H2 и H3
- Не используй символы # или **
- Текст должен быть цельным и логически завершенным
`;

  let article = await askAI(basePrompt);

  // Если текст слишком короткий — догенерируем
  if (article.length < 4000) {
    console.log("🔄 Текст короткий, догенерируем продолжение...");
    const continuationPrompt = `
Продолжи статью на тему "${topic}".
Добавь еще 3-4 смысловых блока.
Не повторяй уже написанное.
`;
    const continuation = await askAI(continuationPrompt);
    article += "\n\n" + continuation;
  }

  return article;
}

// === Создание статьи ===
async function createPost(topic) {
  const title = topic.trim();
  const slug = transliterate(title);
  const pubDate = new Date().toISOString().split("T")[0];
  const filename = `${slug}-${pubDate}.md`;
  const filepath = path.join(POSTS_DIR, filename);

  if (fs.existsSync(filepath)) {
    console.log("⚠️ Уже существует");
    return;
  }

  const content = await generateArticle(title);

  const frontmatter = `---
title: "${title}"
description: "${title}"
pubDate: "${pubDate}"
author: "Butler SEO Bot"
---

${content}
`;

  fs.writeFileSync(filepath, frontmatter, "utf-8");
  console.log("✅ Статья создана:", filename);
}

// === Очередь ===
function readList(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf-8")
    .split("\n")
    .map(t => t.trim())
    .filter(Boolean);
}

function writeList(file, list) {
  fs.writeFileSync(file, list.join("\n"), "utf-8");
}

(async function runFactory() {
  let topics = readList(TOPICS_FILE);

  if (topics.length > 0) {
    const topic = topics.shift();
    console.log("📝 Генерируем:", topic);
    await createPost(topic);
    writeList(TOPICS_FILE, topics);
    process.exit(0);
  }

  let queue = readList(QUEUE_FILE);

  if (queue.length === 0) {
    console.log("📭 Очередь пуста");
    process.exit(0);
  }

  const next = queue.shift();
  writeList(TOPICS_FILE, [next]);
  writeList(QUEUE_FILE, queue);

  console.log("📥 Переносим в публикацию:", next);
  await createPost(next);
})();
