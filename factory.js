// FACTORY 6.2 — CONTENT COMPLETION GUARD

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

/* -------------------------------------------------- */
/* CONFIG */
/* -------------------------------------------------- */

const POSTS_DIR = "./src/content/posts";
const TOPICS_FILE = "./topics.txt";
const QUEUE_FILE = "./topics-queue.txt";

const MIN_LENGTH = 1800;
const MAX_ATTEMPTS = 6;

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("❌ Нет DEEPSEEK_API_KEY");
  process.exit(1);
}

/* -------------------------------------------------- */
/* UTILS */
/* -------------------------------------------------- */

const transliterate = text =>
  text
    .toLowerCase()
    .replace(/[^a-zа-я0-9\s]/gi, "")
    .replace(/\s+/g, "-");

const readLines = file =>
  fs.existsSync(file)
    ? fs.readFileSync(file, "utf-8").split("\n").map(t => t.trim()).filter(Boolean)
    : [];

const writeLines = (file, arr) =>
  fs.writeFileSync(file, arr.join("\n"));

const existingSlugs = () => {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR).map(f => f.split(".md")[0]);
};

/* -------------------------------------------------- */
/* API */
/* -------------------------------------------------- */

async function callDeepSeek(messages, max_tokens = 2000) {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.7,
      max_tokens
    })
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error?.message || "DeepSeek API error");

  return data.choices[0].message.content.trim();
}

/* -------------------------------------------------- */
/* COMPLETION CHECK */
/* -------------------------------------------------- */

function isComplete(text) {
  const t = text.trim();

  if (t.length < MIN_LENGTH) return false;

  if (!/[.!?]$/.test(t)) return false;

  if (!t.toLowerCase().includes("заключение") &&
      !t.toLowerCase().includes("вывод"))
    return false;

  return true;
}

/* -------------------------------------------------- */
/* ARTICLE GENERATION */
/* -------------------------------------------------- */

async function generateArticle(topic) {
  let article = "";
  let attempt = 0;

  let messages = [
    {
      role: "user",
      content: `
Напиши SEO-статью на тему: "${topic}"

Требования:
- 1800+ слов
- Только H2
- Без H1
- Глубокая экспертность
- В конце раздел "Заключение"
`
    }
  ];

  while (attempt < MAX_ATTEMPTS) {
    const part = await callDeepSeek(messages);

    article += "\n\n" + part;

    if (isComplete(article)) return article;

    messages = [
      { role: "assistant", content: article },
      {
        role: "user",
        content: "Продолжи статью с места обрыва. Не повторяй текст. Заверши её."
      }
    ];

    attempt++;
  }

  throw new Error("❌ Статья не завершена после всех попыток");
}

/* -------------------------------------------------- */
/* POST CREATION */
/* -------------------------------------------------- */

async function createPost(topic) {
  const title = topic.trim();
  const slugBase = transliterate(title);
  const date = new Date().toISOString().split("T")[0];

  const slug = `${slugBase}-${date}`;
  const filePath = path.join(POSTS_DIR, `${slug}.md`);

  const duplicates = existingSlugs();

  if (duplicates.includes(slug)) {
    console.log("⚠ Дубль — пропуск:", slug);
    return false;
  }

  console.log("📝 Генерация:", title);

  const article = await generateArticle(title);

  const frontmatter = `---
title: "${title}"
description: "${title}"
pubDate: "${date}"
author: "Butler SEO Bot"
---
`;

  fs.mkdirSync(POSTS_DIR, { recursive: true });

  fs.writeFileSync(filePath, frontmatter + "\n" + article);

  console.log("✅ Готово:", slug);

  return true;
}

/* -------------------------------------------------- */
/* TOPIC ENGINE */
/* -------------------------------------------------- */

function getNextTopic() {
  let topics = readLines(TOPICS_FILE);

  if (topics.length > 0) {
    const t = topics.shift();
    writeLines(TOPICS_FILE, topics);
    return t;
  }

  let queue = readLines(QUEUE_FILE);

  if (queue.length === 0) return null;

  const next = queue.shift();

  writeLines(QUEUE_FILE, queue);

  return next;
}

/* -------------------------------------------------- */
/* RUN */
/* -------------------------------------------------- */

(async () => {
  try {
    const topic = getNextTopic();

    if (!topic) {
      console.log("📭 Нет тем");
      return;
    }

    const created = await createPost(topic);

    if (!created) {
      console.log("➡ Берём следующую тему...");
      return await run();
    }
  } catch (e) {
    console.error("❌ Factory crash:", e.message);
    process.exit(1);
  }
})();