// === ЗАПУСК ФАБРИКИ: умная очередь ===

const TOPICS_FILE = 'topics.txt';
const QUEUE_FILE = 'topics-queue.txt';

// Читаем текущую очередь публикаций
let topics = fs.readFileSync(TOPICS_FILE, 'utf-8')
  .split('\n')
  .map(t => t.trim())
  .filter(t => t);

// Если нет тем для публикации — переносим одну из очереди
if (topics.length === 0) {
  console.log("📭 topics.txt пуст — берём тему из очереди");

  const queue = fs.readFileSync(QUEUE_FILE, 'utf-8')
    .split('\n')
    .map(t => t.trim())
    .filter(t => t);

  if (queue.length === 0) {
    console.log("🚫 Нет тем ни в topics.txt, ни в очереди — выход");
    process.exit(0);
  }

  const nextTopic = queue[0];
  console.log(`📥 Переносим в публикацию: "${nextTopic}"`);

  // Пишем в topics.txt
  fs.writeFileSync(TOPICS_FILE, nextTopic);

  // Удаляем из очереди
  const newQueue = queue.slice(1).join('\n');
  fs.writeFileSync(QUEUE_FILE, newQueue);

  // Обновляем topics
  topics = [nextTopic];
}

// Берём первую тему
const currentTopic = topics[0];
console.log(`📝 Генерируем статью: "${currentTopic}"`);

// Генерируем статью
await createPost(currentTopic);

// Удаляем из topics.txt
const remaining = topics.slice(1);
fs.writeFileSync(TOPICS_FILE, remaining.join('\n'));

console.log(`✅ Статья "${currentTopic}" опубликована`);
console.log(`📋 Осталось в текущей очереди: ${remaining.length}`);
