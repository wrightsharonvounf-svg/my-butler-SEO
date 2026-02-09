// FACTORY 4.5 STABLE LONG VERSION
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

// --------------------------------
// ВСПОМОГАТЕЛЬНЫЕ
// --------------------------------

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

async function callDeepSeek(prompt, tokens = 2000) {
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
      max_tokens: tokens
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "DeepSeek error");
  }

  return data.choices[0].message.content.trim();
}

// --------------------------------
// ГЕНЕРАЦИЯ СТАТЬИ
// --------------------------------

async function generateLongArticle(topic) {

  const prompt = `
Напиши большую экспертную SEO-статью на русском языке на тему: "${topic}"

ТРЕБОВАНИЯ:
- НЕ пиши H1
- Начни с введения
- Используй только подзаголовки H2
- Объем 1500–2000 слов
- Без markdown символов ** и #
- Заверши статью логичным выводом
- Текст должен быть полностью завершён

Статья должна быть подробной, глубокой и структурированной.
`;

  let text = await callDeepSeek(prompt, 2200);

  // если текст слишком короткий — пробуем один раз дописать
  if (text.length < 6000) {
    console.log("⚠ Статья короткая — пробуем дописать...");

    const continuation = await callDeepSeek(
      `Продолжи и логически заверши статью на тему "${topic}". Без повторов начала.`,
      1500
    );

    text += "\n\n" + continuation;
  }

  return text;
}

// --------------------------------
// СОЗДАНИЕ ПОСТА
// --------------------------------

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

  console.log("📝 Генерируем статью...");
  const article = await generateLongArticle(title);

  if (article.length < 4000) {
    console.log("❌ Статья слишком короткая. Публикация отменена.");
    return;
  }

  const frontmatter = `---
title: "${title}"
description: "${title}"
pubDate: "${date}"
author: "Butler SEO Bot"
---
`;

  fs.writeFileSync(
    filepath,
    frontmatter + "\n" + article,
    "utf-8"
  );

  console.log("✅ Создано:", filename);
}

// --------------------------------
// ЗАПУСК
// --------------------------------

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
