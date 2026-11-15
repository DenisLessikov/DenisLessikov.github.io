// ===== НАСТРОЙКИ (меняй под клиента) =====
const CONFIG = {
  instagram: "gortenziay_lab",   // ник без @
  whatsapp: "87058002625",  // номер без + и пробелов; "" скрывает кнопку
  telegram: "+7 705 800 26 25",             // ник без @; "" скрывает кнопку
  currency: "₸",
  minOrder: 1500,
  deliveryNote: "Самовывоз бесплатно. Доставка по городу от 1 500 ₸, стоимость уточним в чате.",
  //banner: "Весенняя акция: скидка 10% на пионы",  // "" скрывает баннер
  sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWhXruKsNcUF1sOKi-tsGVGnGY96VNqgSx0djUTFgTRRiLECis7vPc72PgdEoKs2Xwsptz0W6BOVIW/pub?gid=86916318&single=true&output=csv"              // ссылка на опубликованный CSV Google Таблицы; "" = список ниже
};

// Отзывы: скриншоты кладём в img/reviews/, например ["img/reviews/1.jpg"]
const REVIEWS = [];

// Статусы: in, preorder, soon, out
const STATUS = { in: "В наличии", preorder: "Под заказ", soon: "Скоро", out: "Нет в наличии" };

// Запасной список товаров (если таблица не подключена или недоступна)
const P = (id, name, cat, desc, price, status, height, care, frost, icon) =>
  ({ id, name, cat, desc, price, status, height, care, frost, icon, imgs: [] });

let PRODUCTS = [
  P("h1", "Гортензия метельчатая", "Гортензии", "Крупные белые соцветия, цветёт до осени.", 3000, "in", "до 1,5 м", "Солнце или полутень, кислая влажная почва", "до −35 °C", "🌸"),
  P("h2", "Гортензия древовидная", "Гортензии", "Шаровидные соцветия, неприхотлива.", 2800, "in", "до 1,2 м", "Полутень, регулярный полив", "до −30 °C", "🤍"),
  P("peony", "Пион красный", "Многолетники", "Махровый, закрытая корневая система.", 2500, "preorder", "до 80 см", "Солнце, не заглублять почку", "до −40 °C", "🌺"),
  P("lav", "Лаванда узколистная", "Многолетники", "Аромат и сухие букеты, компактный куст.", 1200, "in", "до 50 см", "Солнце, лёгкая почва без застоя воды", "до −25 °C", "🪻"),
  P("phlox", "Флокс метельчатый", "Многолетники", "Цветёт всё лето, нетребователен.", 1500, "in", "до 90 см", "Солнце или полутень, полив в жару", "до −35 °C", "🌼"),
  P("iris", "Ирис бородатый", "Многолетники", "Смесь сортов, делёнки с хорошими корнями.", 1000, "soon", "до 70 см", "Солнце, корневище у поверхности", "до −30 °C", "🌷"),
  P("rose", "Роза плетистая", "Кустарники и лианы", "Для арок и заборов.", 3500, "in", "до 3 м", "Солнце, укрытие на зиму", "до −25 °C с укрытием", "🌹"),
  P("clem", "Клематис крупноцветковый", "Кустарники и лианы", "Цветы до 15 см в диаметре.", 3200, "out", "до 2,5 м", "Солнечная сторона, тень у корней", "до −30 °C", "💜")
];

// ===== ПОМОЩНИКИ =====
const el = (id) => document.getElementById(id);
const money = (n) => n.toLocaleString("ru-RU") + " " + CONFIG.currency;
const canBuy = (p) => p.status === "in" || p.status === "preorder";
const items = () => PRODUCTS.filter(p => cart[p.id] > 0 && canBuy(p)).map(p => ({ ...p, qty: cart[p.id] }));
const total = () => items().reduce((s, i) => s + i.qty * i.price, 0);

let cart = {};
try { cart = JSON.parse(localStorage.getItem("cart") || "{}"); } catch (e) { cart = {}; }
const saveCart = () => { try { localStorage.setItem("cart", JSON.stringify(cart)); } catch (e) {} };

const filter = { cat: "Все", q: "" };

// ===== ЗАГРУЗКА ИЗ GOOGLE ТАБЛИЦЫ =====
// Колонки: id, name, cat, desc, price, status, height, care, frost, icon, imgs (через |)
function parseCSV(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift().map(h => h.trim());
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}

async function loadSheet() {
  try {
    const rows = parseCSV(await (await fetch(CONFIG.sheetUrl)).text());
    PRODUCTS = rows.map(r => ({
      ...r, price: Number(r.price) || 0, status: STATUS[r.status] ? r.status : "in",
      icon: r.icon || "🌿", imgs: r.imgs ? r.imgs.split("|") : []
    }));
  } catch (e) { /* остаётся запасной список */ }
}

// ===== КАТАЛОГ =====
function renderChips() {
  const cats = ["Все", ...new Set(PRODUCTS.map(p => p.cat))];
  el("chips").innerHTML = cats.map(c =>
    `<button type="button" class="chip" data-action="cat" data-cat="${c}" aria-pressed="${c === filter.cat}">${c}</button>`).join("");
}

function card(p) {
  const n = PRODUCTS.indexOf(p) + 1;
  const photo = p.imgs[0] ? `<img src="${p.imgs[0]}" alt="${p.name}" loading="lazy">` : `<span aria-hidden="true">${p.icon}</span>`;
  const badge = p.status === "in" ? "" : `<span class="badge ${p.status}">${STATUS[p.status]}</span>`;
  const ctrl = canBuy(p)
    ? `<div class="qty">
         <button type="button" data-action="minus" data-id="${p.id}" aria-label="Убрать: ${p.name}">−</button>
         <output id="qty-${p.id}">${cart[p.id] || 0}</output>
         <button type="button" data-action="plus" data-id="${p.id}" aria-label="Добавить: ${p.name}">+</button>
       </div>`
    : `<p class="unavailable">${STATUS[p.status]}</p>`;
  return `<article class="card ${canBuy(p) ? "" : "off"}">
    <div class="photo"><span class="code">GL-${String(n).padStart(2, "0")}</span>${badge}${photo}</div>
    <div class="card-body">
      <h3><button type="button" class="name" data-action="info" data-id="${p.id}">${p.name}</button></h3>
      <p class="desc">${p.desc}</p>
      <p class="price">${money(p.price)}</p>
      ${ctrl}
    </div></article>`;
}

function renderCatalog() {
  const q = filter.q.toLowerCase();
  const list = PRODUCTS.filter(p =>
    (filter.cat === "Все" || p.cat === filter.cat) && (p.name + " " + p.desc).toLowerCase().includes(q));
  el("catalog").innerHTML = list.length ? list.map(card).join("")
    : `<p class="empty">Ничего не найдено. Сбросьте поиск или выберите другую категорию.</p>`;
}

function updateBar() {
  const list = items();
  el("cartbar").hidden = list.length === 0;
  el("cartCount").textContent = list.reduce((s, i) => s + i.qty, 0) + " шт.";
  el("cartTotal").textContent = money(total());
}

function openInfo(id) {
  const p = PRODUCTS.find(x => x.id === id);
  const pics = p.imgs.length ? p.imgs.map(s => `<img src="${s}" alt="${p.name}">`).join("") : `<div class="ph">${p.icon}</div>`;
  el("infoBody").innerHTML = `
    <div class="gallery">${pics}</div>
    <h2>${p.name}</h2>
    <p class="price">${money(p.price)} · ${STATUS[p.status]}</p>
    <p>${p.desc}</p>
    <dl class="specs">
      <dt>Высота</dt><dd>${p.height || "-"}</dd>
      <dt>Посадка и уход</dt><dd>${p.care || "-"}</dd>
      <dt>Морозостойкость</dt><dd>${p.frost || "-"}</dd>
    </dl>
    ${canBuy(p) ? `<button class="btn" type="button" data-action="plus" data-id="${p.id}">Добавить в заказ</button>` : ""}`;
  el("infoDialog").showModal();
}

// Один обработчик на все кнопки (делегирование событий)
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const { action, id } = b.dataset;

  if (action === "plus" || action === "minus") {
    cart[id] = Math.max(0, (cart[id] || 0) + (action === "plus" ? 1 : -1));
    const out = el("qty-" + id); if (out) out.textContent = cart[id];
    saveCart(); updateBar();
    if (b.closest("#infoDialog")) el("infoDialog").close();
  } else if (action === "info") openInfo(id);
  else if (action === "cat") { filter.cat = b.dataset.cat; renderChips(); renderCatalog(); }
  else if (action === "close") el(b.dataset.target).close();
  else if (action === "send") submit(b.dataset.ch);
});

el("search").addEventListener("input", (e) => { filter.q = e.target.value.trim(); renderCatalog(); });

// ===== ЗАКАЗ =====
const val = (id) => el(id).value.trim();
const msg = (t) => { el("orderMsg").textContent = t; };

function orderText() {
  const lines = items().map(i => `• ${i.name} × ${i.qty} = ${money(i.qty * i.price)}`);
  return ["Здравствуйте! Хочу заказать:", ...lines, `Итого: ${money(total())}`,
    val("fName") && `Имя: ${val("fName")}`,
    val("fPhone") && `Телефон: ${val("fPhone")}`,
    val("fComment") && `Комментарий: ${val("fComment")}`].filter(Boolean).join("\n");
}

const refresh = () => { el("orderText").value = orderText(); };
el("orderForm").addEventListener("input", refresh);

el("openOrder").addEventListener("click", () => {
  msg(""); refresh(); el("orderDialog").showModal();
});

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const t = el("orderText"); t.removeAttribute("readonly"); t.select();
    const ok = document.execCommand("copy"); t.setAttribute("readonly", ""); return ok;
  }
}

// Копия заказа владельцу через форму Netlify (работает после деплоя на Netlify)
function sendCopyToOwner(text) {
  const body = new URLSearchParams({
    "form-name": "order", name: val("fName"), phone: val("fPhone"),
    comment: val("fComment"), order: text
  });
  fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() }).catch(() => {});
}

function submit(channel) {
  if (total() < CONFIG.minOrder) return msg(`Минимальная сумма заказа: ${money(CONFIG.minOrder)}.`);
  if (val("fPhone").replace(/\D/g, "").length < 6) return msg("Укажите телефон, чтобы мы могли с вами связаться.");

  const text = orderText();
  sendCopyToOwner(text);

  if (channel === "wa") {
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`, "_blank");
    return msg("Открываем WhatsApp: сообщение уже заполнено, останется нажать «Отправить».");
  }
  // Instagram и Telegram: копируем и открываем чат сразу, в момент нажатия (иначе браузер блокирует окно)
  const copying = copyText(text);
  window.open(channel === "ig" ? `https://ig.me/m/${CONFIG.instagram}` : `https://t.me/${CONFIG.telegram}`, "_blank");
  copying.then(ok => msg(ok
    ? "Заказ скопирован. В чате вставьте сообщение (долгое нажатие, «Вставить») и отправьте."
    : "Не удалось скопировать автоматически. Скопируйте текст заказа выше и вставьте в чат."));
}

// ===== СТАРТ =====
if (CONFIG.banner) { el("banner").textContent = CONFIG.banner; el("banner").hidden = false; }
el("deliveryNote").textContent = `Минимальный заказ: ${money(CONFIG.minOrder)}. ${CONFIG.deliveryNote}`;
el("igLink").href = `https://ig.me/m/${CONFIG.instagram}`;
el("btnWa").hidden = !CONFIG.whatsapp;
el("btnTg").hidden = !CONFIG.telegram;

if (REVIEWS.length) {
  el("reviewsGrid").innerHTML = REVIEWS.map(s => `<img src="${s}" alt="Отзыв покупателя" loading="lazy">`).join("");
  el("reviews").hidden = false;
}

const draw = () => { renderChips(); renderCatalog(); updateBar(); };
draw();
if (CONFIG.sheetUrl) loadSheet().then(draw);
