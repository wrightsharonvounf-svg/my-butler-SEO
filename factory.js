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
  const isInvestment = title.toLowerCase().includes("инвест");

  return `
<h1>${title}</h1>

<p><strong>Коротко:</strong></p>
<ul>
<li>Да — если покупаете с расчётом на долгий срок</li>
<li>Нет — если рассчитываете на быстрый доход</li>
<li>Средняя доходность в СПб — 4–6% годовых</li>
<li>Главный риск — рост цен быстрее аренды</li>
</ul>

<p>Инвестиции в недвижимость в Санкт-Петербурге остаются популярным способом сохранить и приумножить капитал.</p>

${isInvestment ? `
<h2>Когда стоит инвестировать в недвижимость в СПб</h2>

<ul>
<li>если покупка ниже рынка</li>
<li>если долгий горизонт (5+ лет)</li>
<li>если под посуточную аренду</li>
</ul>

<h2>Когда лучше не инвестировать</h2>

<ul>
<li>если рассчитываете на быстрый доход</li>
<li>если покупка в ипотеку с высокой ставкой</li>
<li>если слабая локация</li>
</ul>

<h2>Ключевые показатели рынка</h2>

<table>
<tr>
<th>Параметр</th>
<th>СПб 2026</th>
</tr>
<tr>
<td>Доходность</td>
<td>4–6%</td>
</tr>
<tr>
<td>Окупаемость</td>
<td>15–20 лет</td>
</tr>
<tr>
<td>Риск</td>
<td>средний</td>
</tr>
</table>

<h2>Пример инвестиции</h2>

<p>Квартира стоит 10 млн ₽</p>
<p>Сдаётся за 45 000 ₽</p>

<ul>
<li>Доход в год: 540 000 ₽</li>
<li>Доходность: ~5.4%</li>
</ul>

<h2>Альтернативы инвестициям в недвижимость</h2>

<ul>
<li>банковские вклады</li>
<li>облигации</li>
<li>коммерческая недвижимость</li>
</ul>
` : `
<h2>Какие есть способы сдачи квартиры</h2>

<ul>
<li>Физлицо</li>
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
<td>Физлицо</td>
<td>13%</td>
<td>редкая сдача</td>
</tr>
<tr>
<td>Самозанятость</td>
<td>4%</td>
<td>1–2 квартиры</td>
</tr>
<tr>
<td>ИП</td>
<td>6%</td>
<td>несколько объектов</td>
</tr>
</table>

<h2>Пример расчёта</h2>

<p>Квартира сдаётся за 50 000 ₽</p>

<ul>
<li>Физлицо: 6 500 ₽</li>
<li>Самозанятость: 2 000 ₽</li>
</ul>
`}

<h2>Часто задаваемые вопросы</h2>

<h3>Стоит ли инвестировать в 2026 году?</h3>
<p>Да, если рассматривать долгосрочную стратегию.</p>

<h3>Какая доходность в СПб?</h3>
<p>В среднем 4–6% годовых.</p>

<h3>Можно ли увеличить доход?</h3>
<p>Да, через посуточную аренду и правильный выбор района.</p>

<h3>Есть ли риски?</h3>
<p>Да, особенно при неправильной оценке рынка.</p>

<h3>Что важнее — цена или локация?</h3>
<p>Локация всегда важнее.</p>

<h2>Полезные статьи</h2>

<p>
<a href="/blog/nalog-na-arendu-kvartiry-spb/">Налог на аренду</a><br>
<a href="/blog/skolko-prinosit-kvartira/">Сколько приносит квартира</a><br>
<a href="/blog/samozanyatost-ili-patent/">Самозанятость или патент</a>
</p>

<hr>

<p><strong>Хотите рассчитать доходность квартиры под инвестиции?</strong><br>
Оставьте заявку — подберём стратегию и посчитаем прибыль.</p>
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