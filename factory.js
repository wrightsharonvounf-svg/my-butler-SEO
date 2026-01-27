// factory.js — инфо-генератор под недвижимость + финансы

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const POSTS_DIR = './src/content/posts';

const ALLOWED_CATEGORIES = {
  arenda: ['аренда', 'сдача', 'квартира', 'арендатор'],
  ipoteka: ['ипотека', 'кредит', 'банк', 'ставка'],
  investicii: ['инвестиции', 'доходность', 'окупаемость', 'капитал'],
  nalogi: ['налог', 'вычет', 'ндфл', 'продажа']
};

// Проверка категории по ключевым словам
function detectCategory(topic) {
  const lower = topic.toLowerCase();
  for (const [cat, keys] of Object.entries(ALLOWED_CATEGORIES)) {
    if (keys.some(k => lower.includes(k))) return cat;
  }
  return null;
}

// Создание папки категории
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Транслитерация
function transliterate(title) {
  const ru = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
    к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
    х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'
  };
  return title.toLowerCase()
    .split('')
    .map(char => ru[char] || char)
    .join('')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Генерация статьи
async function generateArticle(topic) {
  const prompt = `
Напиши информационную SEO-статью на русском языке на тему: "${topic}".
Это должен быть ИНФОРМАЦИОННЫЙ материал, без рекламы и услуг.

Объём: 1200–1500 слов.
Структура:
1. Заголовок H1
2. Введение
3. 4–5 подзаголовков H2
4. Заключение

Стиль: экспертный, нейтральный, полезный.
Не упоминай компании, услуги и коммерцию.
`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1400,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// Создание статьи
async function createPost(topic) {
  const category = detectCategory(topic);

  if (!category) {
    console.log(`⛔ Пропущена тема (не инфо): ${topic}`);
    return;
  }

  const catDir = path.join(POSTS_DIR, category);
  ensureDir(catDir);

  const slug = transliterate(topic);
  const pubDate = new Date().toISOString().split('T')[0];
  const filename = `${slug}-${pubDate}.md`;

  const content = await generateArticle(topic);

  const frontmatter = `---
title: "${title}"
pubDate: ${pubDate}
author: "Butler SEO Bot"
description: "${title}"
tags:
  - недвижимость
  - финансы
  - аренда
  - ипотека
---

${content}
`;


  fs.writeFileSync(path.join(catDir, filename), frontmatter);
  console.log(`✅ Опубликовано: ${category}/${filename}`);
}

// === ЗАПУСК ===

const TOPICS_FILE = 'topics.txt';

const topics = fs.readFileSync(TOPICS_FILE, 'utf-8')
  .split('\n')
  .map(t => t.trim())
  .filter(Boolean);

if (!topics.length) {
  console.log("📭 Нет тем для публикации");
  process.exit(0);
}

const topic = topics[0];
await createPost(topic);

// Удаляем опубликованную тему
fs.writeFileSync(TOPICS_FILE, topics.slice(1).join('\n'));

