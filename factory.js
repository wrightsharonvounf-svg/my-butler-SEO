// factory.js 4.0 — Production Safe Version

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

/* ------------------ UTILS ------------------ */

function transliterate(text) {
  const ru = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',
    з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',
    п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',
    ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'
  };

  return text.toLowerCase()
    .split('')
    .map(c => ru[c] || c)
    .join('')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
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

/* ------------------ AI GENERATION ------------------ */

async function callDeepSeek(prompt) {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2500
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "AI error");
  }

  return data.choices?.[0]?.message?.content?.trim();
}

async function generateArticle(topic) {
  const prompt = `
Напиши SEO-статью на русском языке на тему: "${topic}"

Требования:
- Без H1
- Без markdown-звездочек
- Используй подзаголовки H2 и H3
- 2000+ слов
- В конце добавь раздел FAQ с 3 вопросами
- Обязательно допиши финал статьи

Начинай сразу с текста.
`;

  const content = await callDeepSeek(prompt);

  if (!content || content.length < 800) {
    throw new Error("Контент слишком короткий или пустой");
  }

  return content;
}

/* ------------------ FILE CREATION ------------------ */

async function createPost(topic) {
  const title = topic.trim();
  const slug = transliterate(title);
  const pubDate = new Date().toISOString().split("T")[0];
  const filename = `${slug}-${pubDate}.md`;
  const filepath = path.join(POSTS_DIR, filename);

  if (fs.existsSync(filepath)) {
    console.log("⚠ Уже существует:", filename);
    return;
  }

  let content;

  try {
    content = await generateArticle(title);
  } catch (err) {
    console.error("❌ AI ошибка:", err.message);
    return; // НЕ создаем файл если ошибка
  }

  const frontmatter = `---
title: "${title}"
description: "${title}"
pubDate: "${pubDate}"
author: "Butler SEO Bot"
---

`;

  const finalContent = frontmatter + content;

  // Финальная проверка
  if (!finalContent.startsWith("---")) {
    console.error("❌ Frontmatter поврежден. Отмена.");
    return;
  }

  fs.writeFileSync(filepath, finalContent, "utf-8");
  console.log("✅ Создано:", filename);
}

/* ------------------ FACTORY LOGIC ------------------ */

(async function runFactory() {
  let topics = readList(TOPICS_FILE);

  if (topics.length > 0) {
    const topic = topics.shift();
    console.log("📝 Генерируем:", topic);
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

  console.log("📥 Переносим в публикацию:", next);
  await createPost(next);
})();

