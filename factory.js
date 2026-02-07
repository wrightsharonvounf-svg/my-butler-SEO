// FACTORY 4.3 STABLE + AUTO FAQ
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

// -------------------------------
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// -------------------------------

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

async function callDeepSeek(prompt, maxTokens = 1500) {
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

// -------------------------------
// ГЕНЕРАЦИЯ СТАТЬИ
// -------------------------------

async function generateArticle(topic) {
  const prompt = `
Напиши экспертную SEO-статью на русском языке на тему: "${topic}"

ВАЖНО:
- НЕ пиши заголовок H1
- Начинай сразу с введения
- Используй только подзаголовки H2
- Объем 1200-1500 слов
- Не используй markdown символы ** или #
- Заканчивай логичным выводом

Статья должна быть полностью завершенной.
`;

  const text = await callDeepSeek(prompt, 1800);

  if (text.length < 800) {
    throw new Error("Слишком короткая статья — отмена публикации");
  }

  return text;
}

// -------------------------------
// ГЕНЕРАЦИЯ FAQ
// -------------------------------

async function generateFAQ(topic) {
  const prompt = `
Сгенерируй 3 коротких вопроса и ответа по теме "${topic}".

Ответ должен быть в JSON формате строго такого вида:

[
  {
    "question": "...",
    "answer": "..."
  }
]

Без пояснений.
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

// -------------------------------
// СОЗДАНИЕ ПОСТА
// -------------------------------

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
  const article = await generateArticle(title);

  console.log("❓ Генерируем FAQ...");
  const faq = await generateFAQ(title);

  const frontmatter = `---
title: "${title}"
description: "${title}"
pubDate: "${date}"
author: "Butler SEO Bot"
faq: ${JSON.stringify(faq, null, 2)}
---
`;

  let faqSection = "";

  if (faq.length > 0) {
    faqSection += `\n\n## Часто задаваемые вопросы\n\n`;

    faq.forEach(item => {
      faqSection += `### ${item.question}\n${item.answer}\n\n`;
    });

    faqSection += `
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faq.map(q => ({
    "@type": "Question",
    "name": q.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": q.answer
    }
  }))
}, null, 2)}
</script>
`;
  }

  fs.writeFileSync(
    filepath,
    frontmatter + "\n" + article + faqSection,
    "utf-8"
  );

  console.log("✅ Создано:", filename);
}

// -------------------------------
// ЗАПУСК
// -------------------------------

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
