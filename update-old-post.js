// update-old-post.js
import fs from 'fs';
import path from 'path';
import glob from 'glob';

// Папка с markdown-статьями
const POSTS_DIR = path.join('src', 'content', 'blog');

// Шаблон для генерации нового абзаца
const generateFreshParagraph = (title) => {
  const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  return `\n\n*Обновлено ${date}: свежие советы и рекомендации по теме "${title}".*`;
};

// Получаем все markdown-файлы
glob(`${POSTS_DIR}/**/*.md`, (err, files) => {
  if (err) throw err;

  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');

    // Разделяем frontmatter и тело статьи
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatterMatch) {
      console.warn(`⚠️ Frontmatter не найден в файле: ${file}`);
      return;
    }

    const frontmatter = frontmatterMatch[0];
    let body = content.slice(frontmatter.length);

    // Получаем title из frontmatter
    const titleMatch = frontmatter.match(/title:\s*["']?(.+?)["']?\s*$/m);
    const title = titleMatch ? titleMatch[1] : 'Статья';

    // Генерируем свежий абзац
    const freshParagraph = generateFreshParagraph(title);

    // Добавляем только если его ещё нет
    if (!body.includes(freshParagraph.trim())) {
      body += freshParagraph;
    }

    // Обновляем дату публикации в frontmatter (если есть pubDate)
    const pubDateMatch = frontmatter.match(/pubDate:\s*["']?(.+?)["']?\s*$/m);
    let updatedFrontmatter = frontmatter;
    if (pubDateMatch) {
      const newPubDate = new Date().toISOString();
      updatedFrontmatter = frontmatter.replace(pubDateMatch[0], `pubDate: "${newPubDate}"`);
    }

    // Сохраняем обратно
    fs.writeFileSync(file, updatedFrontmatter + body, 'utf-8');
    console.log(`✅ Обновлена статья: ${file}`);
  });
});

