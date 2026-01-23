// update-old-post.js
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const POSTS_DIR = './src/content/posts';

// Найти все .md-файлы
const files = glob.sync(`${POSTS_DIR}/**/*.md`);

if (files.length === 0) {
  console.log("📭 Нет статей для обновления");
  process.exit(0);
}

// Выбрать случайную статью
const randomFile = files[Math.floor(Math.random() * files.length)];
console.log(`📝 Обновляем: ${randomFile}`);

// Прочитать файл
let content = fs.readFileSync(randomFile, 'utf-8');

// Извлечь frontmatter (всё между ---)
const frontmatterMatch = content.match(/^(---\s[\s\S]+?---)/m);
if (!frontmatterMatch) {
  console.error("❌ Нет frontmatter");
  process.exit(1);
}

let frontmatter = frontmatterMatch[0];
const body = content.slice(frontmatterMatch[0].length);

// Обновить lastUpdated
const now = new Date().toISOString().split('T')[0];
const lastUpdatedLine = `lastUpdated: "${now}"`;

// Если есть lastUpdated — замени
if (frontmatter.includes('lastUpdated')) {
  frontmatter = frontmatter.replace(
    /(lastUpdated: )".*?"/,
    `$1"${now}"`
  );
} else {
  // Если нет — добавь после pubDate
  frontmatter = frontmatter.replace(
    /(pubDate: ".*?")/,
    `$1\n${lastUpdatedLine}`
  );
}

// Добавить пометку в начало тела
const updateNote = `> 🔁 **Обновлено: ${new Date().toLocaleDateString('ru-RU')}**\n\n`;
const newBody = updateNote + body;

// Сохранить
fs.writeFileSync(randomFile, frontmatter + newBody);
console.log(`✅ Статья обновлена: ${randomFile}`);
