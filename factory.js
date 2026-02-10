// FACTORY 4.7 FINAL STABLE
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

/* -------------------------------------------------- */
/* ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ */
/* -------------------------------------------------- */

function transliterate(text) {
  const map = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',
    з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',
    п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',
    ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'
  };

  return text.toLowerCase()
    .split("")
    .map(c => map[c] || c)
    .join("")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

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

async function callDeepSeek(messages, maxTokens = 1800) {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.7,
      max_tokens: maxTokens
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "DeepSeek error");
  }

  return data.choices[0].message.content.trim();
}

/* -------------------------------------------------- */
/* ПРОВЕРКА ОБРЫВА */
/* -------------------------------------------------- */

function isComplete(text) {
  if (!text) return false;

  const trimmed = text.trim();

  if (trimmed.length < 1600) return false;

  const lastChar = trimmed.slice(-1);
  if (![".", "!", "?"].includes(lastChar)) return false;

  if (!trimmed.toLowerCase().includes("заключение") &&
      !trimmed.toLowerCase().includes("вывод")) {
    return false;
  }

  return true;
}

/* -------------------------------------------------- */
/* ГЕНЕРАЦИЯ С АВТО-ПРОДОЛЖЕНИЕМ */
/* -------------------------------------------------- */

async function generateArticle(topic) {
  let article = "";
  let attempts = 0;

  let messages = [{
    role: "user",
    content: `
Напиши экспертную SEO-статью на русском языке на тему: "${topic}"

Требования:
- Не используй H1
- Используй H2
- Объем 1500–2000 слов
- В конце обязательно добавь раздел "Заключение"
- Статья должна быть полностью завершенной
`
  }];

  while (attempts < 5) {
    const part = await callDeepSeek(messages);
    article += "\n\n" + part;

    if (isComplete(article)) {
      return article;
    }

    messages = [
      { role: "assistant", content: article },
      {
        role: "user",
        content: "Продолжи статью с места обрыва. Не повторяй текст. Обязательно заверши статью разделом 'Заключение'."
      }
    ];

    attempts++;
  }

  if (!isComplete(article)) {
    throw new Error("Статья не завершена корректно");
  }

  return article;
}

/* -------------------------------------------------- */
/* СОЗДАНИЕ ПОСТА */
/* -------------------------------------------------- */

async function createPost(topic) {
  const title = topic.trim();
  const slug = transliterate(title);
  const date = new Date().toISOString().split("T")[0];

  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  const filename = `${slug}-${date}.md`;
  const filepath = path.join(POSTS_DIR, filename);

  if (fs.existsSync(filepath)) {
    console.log("⚠ Уже существует:", filename);
    return;
  }

  console.log("📝 Генерируем статью...");
  const article = await generateArticle(title);

  const frontmatter = `---
title: "${title}"
description: "${title}"
pubDate: "${date}"
author: "Butler SEO Bot"
---
`;

  fs.writeFileSync(filepath, frontmatter + "\n" + article, "utf-8");

  console.log("✅ Создано:", filename);
}

/* -------------------------------------------------- */
/* ЗАПУСК */
/* -------------------------------------------------- */

(async function run() {
  try {
    let topics = readList(TOPICS_FILE);

    if (topics.length > 0) {
      const topic = topics.shift();
      await createPost(topic);
      writeList(TOPICS_FILE, topics);
      return;
    }

    let queue = readList(QUEUE_FILE);

    if (queue.length === 0) {
      console.log("📭 Очередь пуста");
      return;
    }

    const next = queue.shift();
    writeList(TOPICS_FILE, [next]);
    writeList(QUEUE_FILE, queue);

    await createPost(next);

  } catch (err) {
    console.error("❌ Factory аварийно завершён:", err.message);
    process.exit(1);
  }
})();

