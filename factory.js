// factory.js — версия 3.1 (FAQ + Schema + стабильная генерация)

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const POSTS_DIR = "./src/content/posts";
const TOPICS_FILE = "topics.txt";
const QUEUE_FILE = "topics-queue.txt";

// ======================
// Проверка API ключа
// ======================

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("❌ Нет DEEPSEEK_API_KEY");
  process.exit(1);
}

// ======================
// Утилиты
// ======================

if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
}

function transliterate(title) {
  const ru = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",
    з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",
    п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",
    ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
  };

  return title
    .toLowerCase()
    .split("")
    .map(c => ru[c] || c)
    .join("")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ======================
// Универсальный AI запрос
// ======================

async function askAI(prompt, maxTokens = 1800) {
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
      max_tokens: maxTokens
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "DeepSeek error");
  }

  return data.choices[0].message.content.trim();
}

// ======================
// Генерация статьи
// ======================

async function generateArticle(topic) {
  console.log("✍ Генерация статьи...");

  const prompt = `
Напиши SEO-статью на русском языке на тему: "${topic}".

Требования:
- Объем 1200–1600 слов
- НЕ добавляй H1
- Используй только H2 и H3
- Без markdown типа ** или #
- Начни с введения
- Структурированный текст
- Без обрывов
`;

  return await askAI(prompt, 2500);
}

// ======================
// Генерация FAQ
// ======================

async function generateFAQ(topic) {
  console.log("🧠 Генерация FAQ...");

  const prompt = `
Сгенерируй 5 популярных вопросов и ответов по теме: "${topic}".

Требования:
- Реальные поисковые формулировки
- Ответ 2–4 предложения
- Без markdown
- Формат строго:

Вопрос: ...
Ответ: ...
`;

  const raw = await askAI(prompt, 800);

  const faqItems = [];
  const blocks = raw.split("Вопрос:").filter(Boolean);

  blocks.forEach(block => {
    const parts = block.split("Ответ:");
    if (parts.length === 2) {
      faqItems.push({
        question: parts[0].trim(),
        answer: parts[1].trim()
      });
    }
  });

  return faqItems.slice(0, 5);
}

// ======================
// Создание статьи
// ======================

async function createPost(topic) {
  const title = topic.trim();
  const slug = transliterate(title);
  const pubDate = new Date().toISOString().split("T")[0];
  const filename = `${slug}-${pubDate}.md`;
  const filepath = path.join(POSTS_DIR, filename);

  if (fs.existsSync(filepath)) {
    console.log("⚠ Уже существует");
    return;
  }

  try {
    const content = await generateArticle(title);
    const faqItems = await generateFAQ(title);

    // ----- FAQ Markdown -----
    let faqSection = "\n\n## Часто задаваемые вопросы\n\n";

    faqItems.forEach(item => {
      faqSection += `### ${item.question}\n${item.answer}\n\n`;
    });

    // ----- FAQ Schema -----
    const faqSchema = `
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqItems.map(item => ({
    "@type": "Question",
    "name": item.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.answer
    }
  }))
}, null, 2)}
</script>
`;

    const fullContent = `
---
title: "${title}"
description: "${title}"
pubDate: "${pubDate}"
author: "Butler SEO Bot"
---

${content}

${faqSection}

${faqSchema}
`;

    fs.writeFileSync(filepath, fullContent, "utf-8");
    console.log(`✅ Создано: ${filename}`);

  } catch (err) {
    console.error("❌ Ошибка:", err.message);
  }
}

// ======================
// Очередь
// ======================

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

// ======================
// Запуск
// ======================

(async function runFactory() {
  let topics = readList(TOPICS_FILE);

  if (topics.length > 0) {
    const topic = topics.shift();
    console.log(`📝 Генерируем: ${topic}`);
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

  console.log(`📥 Переносим в публикацию: ${next}`);
  await createPost(next);
})();
