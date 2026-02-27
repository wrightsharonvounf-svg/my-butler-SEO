import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const POSTS_DIR = "./src/content/posts";
const TOPICS_FILE = "./topics.txt";
const QUEUE_FILE = "./topics-queue.txt";

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("❌ Нет DEEPSEEK_API_KEY");
  process.exit(1);
}

/* ---------------- utils ---------------- */

const ensureFile = (file) => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "");
};

const readList = (file) => {
  ensureFile(file);
  return fs.readFileSync(file, "utf-8")
    .split("\n")
    .map(t => t.trim())
    .filter(Boolean);
};

const writeList = (file, list) => {
  fs.writeFileSync(file, list.join("\n"));
};

const transliterate = (text) =>
  text.toLowerCase()
    .replace(/[^a-zа-я0-9\s]/gi, "")
    .replace(/\s+/g, "-");

/* ---------------- AI ---------------- */

async function callAI(prompt) {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1800,
    }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error("AI error");

  return data.choices[0].message.content.trim();
}

/* ---------------- article ---------------- */

async function generateArticle(topic) {
  console.log("🧠 Генерация статьи:", topic);

  return await callAI(`
Напиши SEO статью 1500+ слов.

Тема: ${topic}

Без H1.
С подзаголовками H2.
С заключением.
Полностью законченный текст.
`);
}

/* ---------------- create post ---------------- */

async function createPost(topic) {
  const slug = transliterate(topic);
  const date = new Date().toISOString().split("T")[0];

  const fileName = `${slug}-${date}.md`;
  const filePath = path.join(POSTS_DIR, fileName);

  if (fs.existsSync(filePath)) {
    console.log("⚠ Дубль:", fileName);
    return;
  }

  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  const content = await generateArticle(topic);

  const frontmatter = `---
title: "${topic}"
description: "${topic}"
pubDate: "${date}"
author: "Butler SEO Bot"
---

`;

  fs.writeFileSync(filePath, frontmatter + content);

  console.log("✅ Создано:", fileName);
}

/* ---------------- topic logic ---------------- */

function getNextTopic() {
  let topics = readList(TOPICS_FILE);

  if (topics.length > 0) {
    const topic = topics.shift();
    writeList(TOPICS_FILE, topics);
    return topic;
  }

  let queue = readList(QUEUE_FILE);

  if (queue.length === 0) return null;

  const topic = queue.shift();
  writeList(QUEUE_FILE, queue);

  return topic;
}

/* ---------------- run ---------------- */

(async () => {
  try {
    const topic = getNextTopic();

    if (!topic) {
      console.log("📭 Нет тем");
      return;
    }

    console.log("🚀 Тема:", topic);

    await createPost(topic);

  } catch (e) {
    console.error("❌ Ошибка factory:", e.message);
    process.exit(1);
  }
})();