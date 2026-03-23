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
function generateContent(title, slug) {
  return `
<h1>${title} в СПб — полный разбор</h1>

<p><strong>Коротко:</strong></p>
<ul>
<li>Самый выгодный вариант зависит от дохода</li>
<li>Налоги можно оптимизировать</li>
<li>Ошибки могут стоить до 30% дохода</li>
</ul>

<p>В Санкт-Петербурге сдача квартиры может приносить стабильный доход, но важно правильно выбрать стратегию и налоговый режим.</p>

<p>Разберём подробно: ${title.toLowerCase()}.</p>

<h2>Какие есть способы сдачи квартиры</h2>

<p>Существует несколько вариантов:</p>

<ul>
<li>Физическое лицо</li>
<li>Самозанятость</li>
<li>ИП</li>
<li>Патент</li>
</ul>

<h2>Сравнение вариантов</h2>

<table>
<tr>
<th>Способ</th>
<th>Налог</th>
<th>Когда подходит</th>
</tr>
<tr>
<td>Самозанятость</td>
<td>4–6%</td>
<td>1–2 квартиры</td>
</tr>
<tr>
<td>Физлицо</td>
<td>13%</td>
<td>разово</td>
</tr>
<tr>
<td>Патент</td>
<td>фиксированный</td>
<td>стабильный доход</td>
</tr>
</table>

<h2>Пример расчёта для квартиры в СПб</h2>

<p>Допустим, квартира сдаётся за 60 000 ₽ в месяц.</p>

<ul>
<li>Самозанятость: ~2 400 ₽</li>
<li>Физлицо: ~7 800 ₽</li>
<li>Патент: зависит от района</li>
</ul>

<h2>Когда выгодно использовать разные варианты</h2>

<p>Самозанятость подходит для небольшого дохода, а патент — при стабильной загрузке квартиры.</p>

<h2>Как начать сдавать квартиру официально</h2>

<ol>
<li>Выбрать налоговый режим</li>
<li>Зарегистрироваться</li>
<li>Заключить договор</li>
<li>Платить налог</li>
</ol>

<h2>Часто задаваемые вопросы</h2>

<h3>Нужно ли открывать ИП?</h3>
<p>Нет, можно использовать самозанятость.</p>

<h3>Можно ли сдавать несколько квартир?</h3>
<p>Да, но есть ограничения.</p>

<h2>Полезные статьи</h2>

<p>
<a href="/blog/nalog-na-arendu-kvartiry-spb/">Налог на аренду квартиры</a><br>
<a href="/blog/dohodnost-arendy-v-spb/">Доходность аренды</a>
</p>

<hr>

<p><strong>Хотите узнать доходность вашей квартиры в Санкт-Петербурге?</strong><br>
Оставьте заявку — рассчитаем прибыль и подскажем лучший формат сдачи.</p>
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

  const content = generateContent(post.title, post.slug);

  const frontmatter = `---
title: "${post.title}"
description: "${post.title}"
pubDate: ${date}
cluster: ${post.cluster}
---

${content}
`;

  fs.writeFileSync(
    path.join(postsDir, `${post.slug}.md`),
    frontmatter
  );

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
  "Как снизить налог с аренды квартиры в СПб",
  "Сколько можно заработать на аренде квартиры в СПб",
  "Лучшие районы для сдачи квартиры в СПб",
  "Стоит ли инвестировать в недвижимость в СПб",
  "Как увеличить доход от сдачи квартиры в СПб",
  "Какие риски при сдаче квартиры в СПб",
  "Нужно ли платить налог с аренды квартиры в СПб",
  "Как выбрать арендатора в СПб",
  "Как сдавать квартиру официально в СПб",
  "Посуточная или долгосрочная аренда в СПб — что выгоднее"
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