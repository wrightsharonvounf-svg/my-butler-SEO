import fs from "fs";
import path from "path";

const postsDir = "./src/content/posts";

// --------------------
// 🔤 ТРАНСЛИТ
// --------------------
function transliterate(str) {
  const map = {
    а: "a", б: "b", в: "v", г: "g", д: "d",
    е: "e", ё: "e", ж: "zh", з: "z", и: "i",
    й: "y", к: "k", л: "l", м: "m", н: "n",
    о: "o", п: "p", р: "r", с: "s", т: "t",
    у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
    ш: "sh", щ: "sch", ь: "", ы: "y", ъ: "",
    э: "e", ю: "yu", я: "ya"
  };

  return str
    .toLowerCase()
    .split("")
    .map((char) => map[char] || char)
    .join("");
}

// --------------------
// 🔗 SLUG
// --------------------
function slugify(str) {
  return transliterate(str)
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --------------------
// 🧠 КЛАСТЕРЫ (SEO)
// --------------------
function detectCluster(title) {
  const t = title.toLowerCase();

  if (t.includes("налог")) return "taxes";
  if (t.includes("доход") || t.includes("заработ")) return "profit";
  if (t.includes("район")) return "districts";
  if (t.includes("инвест")) return "investments";

  return "profit";
}

// --------------------
// 🧹 ОЧИСТКА
// --------------------
function cleanPosts() {
  if (fs.existsSync(postsDir)) {
    fs.rmSync(postsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(postsDir, { recursive: true });
  console.log("🧹 Очистили posts");
}

// --------------------
// ✍️ КОНТЕНТ (SEO структура)
// --------------------
function generateContent(title) {
  return `
## ${title}

Разберём подробно: ${title.toLowerCase()}.

### 📊 Что влияет

- Район и спрос
- Тип аренды (долгосрок / посуточно)
- Налоги и расходы

### 💡 Как увеличить доход

1. Правильно выбрать локацию  
2. Оптимизировать налоги  
3. Повысить привлекательность квартиры  

### ⚠️ Риски

- Простой квартиры  
- Проблемные арендаторы  
- Налоговые вопросы  

### ✅ Вывод

${title} — ключевой фактор доходности. Грамотный подход даёт +20–40% к прибыли.
`;
}

// --------------------
// 🔗 ПЕРЕЛИНКОВКА
// --------------------
function generateRelated(posts, currentSlug) {
  const related = posts
    .filter(p => p.slug !== currentSlug)
    .slice(0, 3);

  return `
## 🔗 Статьи по теме

${related.map(p => `- [${p.title}](/blog/${p.slug})`).join("\n")}
`;
}

// --------------------
// 📝 СОЗДАНИЕ ПОСТА
// --------------------
function createPost(post, allPosts) {
  const date = new Date().toISOString().slice(0, 10);

  const filePath = path.join(postsDir, `${post.slug}.md`);

  const content = `
${generateContent(post.title)}

${generateRelated(allPosts, post.slug)}

---

## 💰 Хотите узнать доходность квартиры?

Оставьте заявку — рассчитаем реальную доходность с учётом налогов и стратегии аренды.
`;

  const frontmatter = `---
title: "${post.title}"
description: "${post.title}"
pubDate: ${date}
cluster: ${post.cluster}
tags:
  - аренда
  - недвижимость
---

${content}
`;

  fs.writeFileSync(filePath, frontmatter);

  console.log(`✅ ${post.slug}`);
}

// --------------------
// 🚀 MAIN
// --------------------
async function runFactory() {
  console.log("🚀 Factory started");

  cleanPosts();

  // 🔥 ТВОИ ТЕМЫ (можно расширять)
  const topics = [
    "Как снизить налог с аренды квартиры",
    "Сколько можно заработать на аренде квартиры",
    "Лучшие районы для сдачи квартиры",
    "Стоит ли инвестировать в недвижимость в 2026",
    "Как увеличить доход от сдачи квартиры",
    "Какие риски при сдаче квартиры",
    "Нужно ли платить налог с аренды",
    "Как выбрать арендатора",
    "Как сдавать квартиру официально",
    "Посуточная или долгосрочная аренда что выгоднее"
  ];

  // 👉 формируем структуру
  const posts = topics.map(title => ({
    title,
    slug: slugify(title),
    cluster: detectCluster(title)
  }));

  // 👉 защита от дублей
  const uniquePosts = Object.values(
    posts.reduce((acc, post) => {
      acc[post.slug] = post;
      return acc;
    }, {})
  );

  // 👉 генерация
  for (const post of uniquePosts) {
    createPost(post, uniquePosts);
  }

  console.log(`🔥 Готово: ${uniquePosts.length} статей`);
}

// --------------------
runFactory().catch(err => {
  console.error("💥 ERROR:", err);
  process.exit(1);
});