// FACTORY 6.1 — CONTENT QUALITY ENGINE

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const POSTS_DIR = "./src/content/posts";

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("❌ Нет DEEPSEEK_API_KEY");
  process.exit(1);
}

/* ------------------ API ------------------ */

async function callAI(messages, maxTokens = 1800) {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
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

  const data = await res.json();

  if (!res.ok) throw new Error("DeepSeek error");

  return data.choices[0].message.content.trim();
}

/* ------------------ UTILS ------------------ */

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-zа-я0-9\s]/gi, "")
    .replace(/\s+/g, "-");
}

function cleanMarkdown(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/^#+\s/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

function isSEOValid(text) {
  return (
    text.length > 1500 &&
    text.includes("##") &&
    /заключение/i.test(text)
  );
}

/* ------------------ GENERATE ARTICLE ------------------ */

async function generateArticle(topic) {
  const messages = [
    {
      role: "user",
      content: `
Напиши экспертную SEO-статью на тему: "${topic}"

Требования:
- 1500+ слов
- H2 подзаголовки
- без H1
- уникальный текст
- в конце Заключение
`
    }
  ];

  return await callAI(messages, 2000);
}

/* ------------------ QUALITY CHECK ------------------ */

async function checkQuality(article) {
  const messages = [
    {
      role: "user",
      content: `
Проверь качество статьи.

Ответь только:

OK

или

REWRITE

Статья:

${article}
`
    }
  ];

  const result = await callAI(messages, 300);
  return result.includes("OK");
}

/* ------------------ CREATE POST ------------------ */

async function createPost(topic) {
  const slug = slugify(topic);
  const date = new Date().toISOString().split("T")[0];

  const filename = `${slug}-${date}.md`;
  const filepath = path.join(POSTS_DIR, filename);

  if (fs.existsSync(filepath)) {
    console.log("⚠ дубль — пропуск");
    return;
  }

  console.log("🧠 Генерация...");
  let article = await generateArticle(topic);

  article = cleanMarkdown(article);

  if (!isSEOValid(article)) {
    console.log("♻ SEO check fail → retry");
    article = cleanMarkdown(await generateArticle(topic));
  }

  console.log("🔍 Проверка качества...");
  const isGood = await checkQuality(article);

  if (!isGood) {
    console.log("♻ QC fail → retry");
    article = cleanMarkdown(await generateArticle(topic));
  }

  const frontmatter = `---
title: "${topic}"
description: "${topic}"
pubDate: "${date}"
author: "Butler SEO Bot"
---
`;

  fs.writeFileSync(filepath, frontmatter + article);

  console.log("✅ Готово:", filename);
}

/* ------------------ RUN ------------------ */

const topic = process.argv[2];

if (!topic) {
  console.log("⚠ Передай тему");
  process.exit();
}

createPost(topic);