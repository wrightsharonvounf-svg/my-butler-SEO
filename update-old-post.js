// update-old-post.js — безопасное обновление инфо-статей

import fs from 'fs';
import path from 'path';
import glob from 'glob';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const POSTS_DIR = path.join('src', 'content', 'posts');

const ALLOWED_CATEGORIES = ['arenda', 'ipoteka', 'investicii', 'nalogi'];

// Генерация свежего абзаца
async function generateFreshParagraph(title) {
  const prompt = `Напиши один новый абзац (3–5 предложений) для информационной статьи на тему "${title}".
Без рекламы, без услуг, без призывов.
Тон: экспертный, нейтральный.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200
  });

  return response.choices[0].message.content.trim();
}

async function updatePosts() {
  const files = glob.sync(`${POSTS_DIR}/**/*.md`);

  for (const file of files) {
    const category = file.split(path.sep).slice(-2, -1)[0];
    if (!ALLOWED_CATEGORIES.includes(category)) {
      console.log(`⏭ Пропущено (не инфо): ${file}`);
      continue;
    }

    let content = fs.readFileSync(file, 'utf-8');

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatterMatch) continue;

    let frontmatter = frontmatterMatch[0];
    let body = content.slice(frontmatter.length);

    const titleMatch = frontmatter.match(/title:\s*["']?(.+?)["']?/m);
    const title = titleMatch ? titleMatch[1] : 'Статья';

    const freshParagraph = await generateFreshParagraph(title);

    // Вставляем в середину статьи
    const paragraphs = body.split('\n\n');
    const middleIndex = Math.floor(paragraphs.length / 2);
    paragraphs.splice(middleIndex, 0, freshParagraph);
    body = paragraphs.join('\n\n');

    // Добавляем updatedDate
    const updatedDate = new Date().toISOString();
    if (frontmatter.includes('updatedDate')) {
      frontmatter = frontmatter.replace(/updatedDate:\s*["']?(.+?)["']?/m, `updatedDate: "${updatedDate}"`);
    } else {
      frontmatter = frontmatter.replace('---\n', `---\nupdatedDate: "${updatedDate}"\n`);
    }

    fs.writeFileSync(file, frontmatter + body, 'utf-8');
    console.log(`🔄 Обновлена статья: ${file}`);
  }
}

updatePosts()
  .then(() => console.log('✅ Обновление инфо-статей завершено'))
  .catch(err => console.error(err));
