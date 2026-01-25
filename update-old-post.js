// update-old-post.js
import fs from 'fs';
import path from 'path';
import glob from 'glob';
import OpenAI from 'openai';

// Инициализация API (ключ из GitHub Secrets)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const POSTS_DIR = path.join('src', 'content', 'blog');

// Генерация уникального абзаца через GPT
async function generateFreshParagraph(title) {
  const prompt = `Напиши один уникальный абзац в Markdown на тему "${title}".
Абзац должен быть информативным, интересным, подходить для блога о недвижимости.
Не добавляй HTML, только текст.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 150
  });

  return `\n\n${response.choices[0].message.content.trim()}`;
}

// Основная функция
async function updatePosts() {
  const files = glob.sync(`${POSTS_DIR}/**/*.md`);

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');

    // Разделяем frontmatter и тело
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatterMatch) {
      console.warn(`⚠️ Frontmatter не найден в файле: ${file}`);
      continue;
    }

    const frontmatter = frontmatterMatch[0];
    let body = content.slice(frontmatter.length);

    // Берем title для генерации
    const titleMatch = frontmatter.match(/title:\s*["']?(.+?)["']?/m);
    const title = titleMatch ? titleMatch[1] : 'Статья';

    // Генерация уникального абзаца
    const freshParagraph = await generateFreshParagraph(title);

    // Добавляем абзац, если его ещё нет
    if (!body.includes(freshParagraph.trim())) {
      body += freshParagraph;
    }

    // Обновляем pubDate
    const pubDateMatch = frontmatter.match(/pubDate:\s*["']?(.+?)["']?/m);
    let updatedFrontmatter = frontmatter;
    if (pubDateMatch) {
      const newPubDate = new Date().toISOString();
      updatedFrontmatter = frontmatter.replace(pubDateMatch[0], `pubDate: "${newPubDate}"`);
    }

    // Сохраняем обратно
    fs.writeFileSync(file, updatedFrontmatter + body, 'utf-8');
    console.log(`✅ Обновлена статья: ${file}`);
  }
}

// Запуск
updatePosts()
  .then(() => console.log('Все статьи обновлены!'))
  .catch(err => console.error(err));