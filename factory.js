// factory.js — чистая генерация через DeepSeek
import fs from 'fs';
import path from 'path';

const POSTS_DIR = './src/content/posts';

// Создаём папку, если её нет
if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
}

// Транслитерация кириллицы в латиницу
function transliterate(title) {
  const ru = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
    з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
    п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
  };
  return title
    .toLowerCase()
    .split('')
    .map(char => ru[char] || char)
    .join('')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Генерация статьи через DeepSeek API
async function generateArticle(topic) {
  const prompt = `
Напиши SEO-статью на русском языке на тему: "${topic}".
Объём: 500–700 слов.
Структура:
1. Заголовок H1
2. Введение
3. 3–4 подзаголовка H2 с пояснениями
4. Заключение

Тон: дружелюбный, экспертный, без воды. Не используй markdown.`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer sk-cf34e5ec6ac74ce9aa9ada71f60d97fe`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 900,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'AI error');

    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error('❌ Ошибка AI:', err.message);
    return `Автоматическая генерация временно недоступна. Тема: ${topic}`;
  }
}

// Создание .md-файла
async function createPost(topic) {
  const title = topic.trim() || 'Новая статья';
  const slug = transliterate(title);
  const pubDate = new Date().toISOString().split('T')[0];
  const filename = `${slug}-${pubDate}.md`;

  const content = await generateArticle(title);

  const frontmatter = `---
title: "${title}"
pubDate: "${pubDate}"
author: "My Butler Factory"
description: "${title}"
tags: ["SEO", "AI", "автоматизация"]
layout: ../../layouts/PostLayout.astro
---

${content}
`;

  fs.writeFileSync(path.join(POSTS_DIR, filename), frontmatter);
  console.log(`✅ Статья создана: ${filename}`);
}

// === ЗАПУСК ФАБРИКИ ===
// === ЗАПУСК ФАБРИКИ: одна статья в день ===
const topicsPath = 'topics.txt';
const topics = fs.readFileSync(topicsPath, 'utf-8')
  .split('\n')
  .map(t => t.trim())
  .filter(t => t);

if (topics.length === 0) {
  console.log("📭 Нет тем для генерации — выход");
  process.exit(0);
}

const nextTopic = topics[0];
console.log(`📝 Генерируем: "${nextTopic}"`);

// Генерим статью
await createPost(nextTopic);

// Удаляем первую тему из списка
const remainingTopics = topics.slice(1).join('\n');
fs.writeFileSync(topicsPath, remainingTopics);

console.log(`✅ Статья "${nextTopic}" опубликована`);
console.log(`📋 Осталось тем: ${remainingTopics.trim() ? remainingTopics.split('\n').length : 0}`);