// ===== НАСТРОЙКИ (меняй под клиента) =====
const INSTAGRAM_USERNAME = "your_shop"; // ник продавца без @
const CURRENCY = "₸";

// Товары. Фото: положи файлы в папку img/ и укажи путь, например "img/hortensia.jpg".
// Если img пустое, показывается заглушка с эмодзи.
const PRODUCTS = [
  { id: "hortensia", name: "Гортензия метельчатая", desc: "Крупные белые соцветия, цветёт до осени. Саженец 2 года.", price: 3000, img: "", icon: "🌸" },
  { id: "peony", name: "Пион красный", desc: "Махровый, морозостойкий. Корневая система закрытая.", price: 2500, img: "", icon: "🌺" },
  { id: "rose", name: "Роза плетистая", desc: "Для арок и заборов, зимует под лёгким укрытием.", price: 3500, img: "", icon: "🌹" },
  { id: "lavender", name: "Лаванда узколистная", desc: "Аромат, пчёлы, сухие букеты. Компактный куст.", price: 1200, img: "", icon: "🪻" },
  { id: "phlox", name: "Флокс метельчатый", desc: "Цветёт всё лето, нетребователен к уходу.", price: 1500, img: "", icon: "🌼" },
  { id: "iris", name: "Ирис бородатый", desc: "Смесь сортов, делёнки с хорошими корнями.", price: 1000, img: "", icon: "🌷" },
  { id: "hosta", name: "Хоста пёстролистная", desc: "Для тени, декоративная листва.", price: 1800, img: "", icon: "🌿" },
  { id: "clematis", name: "Клематис крупноцветковый", desc: "Лиана с цветами до 15 см в диаметре.", price: 3200, img: "", icon: "💜" }
];

// ===== КОРЗИНА =====
let cart = {};

try {
  cart = JSON.parse(localStorage.getItem("cart") || "{}");
} catch (e) {
  cart = {};
}

function saveCart() {
  try {
    localStorage.setItem("cart", JSON.stringify(cart));
  } catch (e) {
    // хранилище недоступно: корзина просто не сохранится между визитами
  }
}

function formatPrice(n) {
  return n.toLocaleString("ru-RU") + " " + CURRENCY;
}

function getItems() {
  return PRODUCTS
    .filter(p => cart[p.id] > 0)
    .map(p => ({ ...p, qty: cart[p.id] }));
}

// ===== ОТРИСОВКА =====
const catalogEl = document.getElementById("catalog");

function renderCatalog() {
  catalogEl.innerHTML = PRODUCTS.map((p, i) => `
    <article class="card">
      <div class="photo">
        <span class="code">GL-${String(i + 1).padStart(2, "0")}</span>
        ${p.img ? `<img src="${p.img}" alt="${p.name}" loading="lazy">` : `<span aria-hidden="true">${p.icon}</span>`}
      </div>
      <div class="card-body">
        <h3 class="name">${p.name}</h3>
        <p class="desc">${p.desc}</p>
        <p class="price">${formatPrice(p.price)}</p>
        <div class="qty">
          <button type="button" data-action="minus" data-id="${p.id}" aria-label="Убрать одну штуку: ${p.name}">−</button>
          <output id="qty-${p.id}">${cart[p.id] || 0}</output>
          <button type="button" data-action="plus" data-id="${p.id}" aria-label="Добавить одну штуку: ${p.name}">+</button>
        </div>
      </div>
    </article>
  `).join("");
}

function updateBar() {
  const items = getItems();
  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  document.getElementById("cartbar").hidden = count === 0;
  document.getElementById("cartCount").textContent = count + " шт.";
  document.getElementById("cartTotal").textContent = formatPrice(total);
}

catalogEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.dataset.id;
  const current = cart[id] || 0;
  cart[id] = btn.dataset.action === "plus" ? current + 1 : Math.max(0, current - 1);

  document.getElementById("qty-" + id).textContent = cart[id];
  saveCart();
  updateBar();
});

// ===== ЗАКАЗ =====
const dialog = document.getElementById("orderDialog");
const orderText = document.getElementById("orderText");
const nameInput = document.getElementById("clientName");
const hint = document.getElementById("orderHint");

function buildOrderText() {
  const items = getItems();
  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const name = nameInput.value.trim();

  const lines = items.map(i => `• ${i.name} × ${i.qty} = ${formatPrice(i.qty * i.price)}`);
  const intro = name ? `Здравствуйте! Меня зовут ${name}. Хочу заказать:` : "Здравствуйте! Хочу заказать:";

  return [intro, ...lines, `Итого: ${formatPrice(total)}`].join("\n");
}

document.getElementById("openOrder").addEventListener("click", () => {
  orderText.value = buildOrderText();
  dialog.showModal();
});

nameInput.addEventListener("input", () => {
  orderText.value = buildOrderText();
});

document.getElementById("closeOrder").addEventListener("click", () => dialog.close());

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // запасной способ для старых браузеров
    orderText.removeAttribute("readonly");
    orderText.select();
    const ok = document.execCommand("copy");
    orderText.setAttribute("readonly", "");
    return ok;
  }
}

// Копия заказа владельцу через форму Netlify (работает после деплоя на Netlify)
function sendCopyToOwner(text) {
  const body = new URLSearchParams({
    "form-name": "order",
    name: nameInput.value.trim(),
    order: text
  });

  fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  }).catch(() => {});
}

document.getElementById("sendOrder").addEventListener("click", async () => {
  const text = buildOrderText();
  const copied = await copyText(text);

  sendCopyToOwner(text);

  hint.textContent = copied
    ? "Заказ скопирован. Открываем чат: вставьте сообщение (долгое нажатие, «Вставить») и отправьте."
    : "Не удалось скопировать автоматически. Выделите текст заказа выше, скопируйте его и вставьте в чат.";

  window.open(`https://ig.me/m/${INSTAGRAM_USERNAME}`, "_blank", "noopener");
});

// ===== СТАРТ =====
renderCatalog();
updateBar();
