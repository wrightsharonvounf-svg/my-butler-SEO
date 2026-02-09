// FACTORY 4.4 MULTI-STAGE STABLE
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

// ------------------------------------------------
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ------------------------------------------------

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

async function callDeepSeek(prompt, maxTokens = 1200) {
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

// ------------------------------------------------
// MULTI-STAGE ГЕНЕРАЦИЯ СТАТЬИ
// ------------------------------------------------

async function generateStructure(topic) {
  const prompt = `
Создай структуру SEO-статьи на тему "${topic}".

Ответ строго в JSON формате:

{
  "sections": [
    "Название раздела 1",
    "Название раздела 2",
    "Название раздела 3",
    "Название раздела 4"
  ]
}

Без пояснений.
`;

  const raw = await callDeepSeek(prompt, 400);

  try {
    const jsonStart = raw.indexOf("{");
    const json = JSON.parse(raw.slice(jsonStart));
    return json.sections.slice(0, 4);
  } catch {
    throw new Error("Ошибка генерации структуры");
  }
}

async function generateIntro(topic) {
  return await callDeepSeek(`
Напиши введение к статье на тему "${topic}".
Без заголовков.
300-400 слов.
`, 700);
}

async function generateSection(topic, sectionTitle) {
  return await callDeepSeek(`
Напиши раздел статьи "${sectionTitle}" по теме "${topic}".
Используй только текст.
500-700 слов.
`, 1000);
}

async function generateConclusion(topic) {
  return await callDeepSeek(`
Напиши заключение к статье "${topic}".
300-400 слов.
Без заголовков.
`, 600);
}

async function generateFullArticle(topic) {
  console.log("📐 Генерируем структуру...");
  const sections = await generateStructure(topic);

  console.log("✍ Генерируем введение...");
  const intro = await generateIntro(topic);

  let body = intro + "\n\n";

  for (const section of sections) {
    console.log("📄 Генерируем раздел:", section);
    const content = await generateSection(topic, section);
    body += `## ${section}\n\n${content}\n\n`;
  }

  console.log("🔚 Генерируем заключение...");
  const conclusion = await generateConclusion(topic);

  body += conclusion;

  if (body.length < 3000) {
    throw new Error("Статья слишком короткая — отмена публикации");
  }

  return body;
}

// ------------------------------------------------
// FAQ
// ------------------------------------------------

async function generateFAQ(topic) {
  const prompt = `
Сгенерируй 3 вопроса и ответа по теме "${topic}".

Ответ строго JSON:

[
  { "question": "...", "answer": "..." }
]
`;

  const raw = await callDeepSeek(prompt, 500);

  try {
    const jsonStart = raw.indexOf("[");
    const json = JSON.parse(raw.slice(jsonStart));
    return json.slice(0, 3);
  } catch {
    return [];
  }
}

// ------------------------------------------------
// СОЗДАНИЕ ПОСТА
// ------------------------------------------------

async function createPost(topic) {
  const title = topic.trim();
  const slug = transliterate(title);
  const date = new Date().toISOString().split("T")[0];

  const filename = `${slug}-${date}.md`;
  const filepath = path.join(POSTS_DIR, filename);

  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  if (fs.existsSync(filepath)) {
    console.log("⚠ Уже существует:", filename);
    return;
  }

  const article = await generateFullArticle(title);
  const faq = await generateFAQ(title);

  const frontmatter = `---
title: "${title}"
description: "${title}"
pubDate: "${date}"
author: "Butler SEO Bot"
faq: ${JSON.stringify(faq, null, 2)}
---
`;

  fs.writeFileSync(filepath, frontmatter + "\n" + article, "utf-8");

  console.log("✅ Создано:", filename);
}

// ------------------------------------------------
// ЗАПУСК
// ------------------------------------------------

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
