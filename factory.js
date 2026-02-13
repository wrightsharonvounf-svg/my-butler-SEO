// FACTORY 6.0 — SEO BRAIN
// Production-grade article generator with duplicate protection

import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const POSTS_DIR = "./src/content/posts";
const TOPICS_FILE = "topics.txt";
const QUEUE_FILE = "topics-queue.txt";

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("❌ Missing DEEPSEEK_API_KEY");
  process.exit(1);
}

/* ============================================================
   UTILITIES
============================================================ */

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`)
};

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

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readLines(file) {
  try {
    const data = await fs.readFile(file, "utf-8");
    return data.split("\n").map(l => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function writeLines(file, lines) {
  await fs.writeFile(file, lines.join("\n"), "utf-8");
}

/* ============================================================
   DUPLICATE PROTECTION ENGINE
============================================================ */

async function getExistingPostsMeta() {
  try {
    const files = await fs.readdir(POSTS_DIR);
    return files.filter(f => f.endsWith(".md"));
  } catch {
    return [];
  }
}

async function slugExists(slug) {
  const files = await getExistingPostsMeta();
  return files.some(f => f.startsWith(slug + "-"));
}

async function titleExists(title) {
  const files = await getExistingPostsMeta();

  for (const file of files) {
    const content = await fs.readFile(path.join(POSTS_DIR, file), "utf-8");
    if (content.includes(`title: "${title}"`)) {
      return true;
    }
  }

  return false;
}

/* ============================================================
   AI ENGINE
============================================================ */

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

function isComplete(article) {
  const text = article.trim();

  if (text.length < 1800) return false;
  if (!text.toLowerCase().includes("заключение")) return false;

  const lastChar = text.slice(-1);
  if (![".", "!", "?"].includes(lastChar)) return false;

  return true;
}

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
- Объем 1800+ слов
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
        content: "Продолжи статью с места обрыва. Не повторяй текст. Обязательно добавь полноценный раздел 'Заключение'."
      }
    ];

    attempts++;
  }

  throw new Error("Article generation incomplete");
}

/* ============================================================
   POST CREATION
============================================================ */

async function createPost(topic) {
  const cleanTitle = topic.trim();
  const slug = transliterate(cleanTitle);
  const date = new Date().toISOString().split("T")[0];

  await ensureDir(POSTS_DIR);

  if (await slugExists(slug)) {
    log.warn(`Slug already exists: ${slug}`);
    return false;
  }

  if (await titleExists(cleanTitle)) {
    log.warn(`Title already exists: ${cleanTitle}`);
    return false;
  }

  log.info("Generating article...");
  const article = await generateArticle(cleanTitle);

  const frontmatter = `---
title: "${cleanTitle}"
description: "${cleanTitle}"
pubDate: "${date}"
author: "Butler SEO Bot"
---
`;

  const filename = `${slug}-${date}.md`;
  const filepath = path.join(POSTS_DIR, filename);

  await fs.writeFile(filepath, frontmatter + "\n" + article, "utf-8");

  log.success(`Created: ${filename}`);
  return true;
}

/* ============================================================
   MAIN ENGINE
============================================================ */

async function runFactory() {
  const topics = await readLines(TOPICS_FILE);
  const queue = await readLines(QUEUE_FILE);

  let topic = null;

  if (topics.length > 0) {
    topic = topics.shift();
    await writeLines(TOPICS_FILE, topics);
  } else if (queue.length > 0) {
    topic = queue.shift();
    await writeLines(QUEUE_FILE, queue);
  } else {
    log.info("Queue empty");
    return;
  }

  const created = await createPost(topic);

  if (!created) {
    log.warn("Skipping duplicate. Trying next topic...");
    await runFactory();
  }
}

/* ============================================================
   EXECUTION
============================================================ */

runFactory().catch(err => {
  log.error(err.message);
  process.exit(1);
});
