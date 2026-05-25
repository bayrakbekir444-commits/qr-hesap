// Türk yemek/içecek isimlerinden otomatik görsel üretir.
// Pexels foto guess'i yerine: renkli + emoji + isim placeholder (her zaman çalışır).
// Restoran sahibi isterse manuel URL yapıştırabilir.


// Kategori → { emoji, renk (HEX, # yok) }
const CATEGORIES = {
  soup:    { emoji: '🍲', bg: 'b45309', fg: 'fff7ee' },
  meat:    { emoji: '🍖', bg: 'c1432a', fg: 'fff7ee' },
  kebab:   { emoji: '🍢', bg: 'a04429', fg: 'fff7ee' },
  pide:    { emoji: '🫓', bg: 'b97c34', fg: 'fff7ee' },
  pizza:   { emoji: '🍕', bg: 'b91c1c', fg: 'fff7ee' },
  rice:    { emoji: '🍚', bg: 'd97706', fg: '1a1a2e' },
  salad:   { emoji: '🥗', bg: '15803d', fg: 'fff7ee' },
  dessert: { emoji: '🍰', bg: 'be185d', fg: 'fff7ee' },
  coffee:  { emoji: '☕', bg: '78350f', fg: 'fff7ee' },
  tea:     { emoji: '🍵', bg: '991b1b', fg: 'fff7ee' },
  water:   { emoji: '💧', bg: '0284c7', fg: 'fff7ee' },
  juice:   { emoji: '🧃', bg: 'ea580c', fg: 'fff7ee' },
  soda:    { emoji: '🥤', bg: '7c2d12', fg: 'fff7ee' },
  ayran:   { emoji: '🥛', bg: 'e5e7eb', fg: '1a1a2e' },
  burger:  { emoji: '🍔', bg: 'a16207', fg: 'fff7ee' },
  sandwich:{ emoji: '🥪', bg: 'ca8a04', fg: '1a1a2e' },
  pastry:  { emoji: '🥐', bg: 'd97706', fg: '1a1a2e' },
  egg:     { emoji: '🍳', bg: 'f59e0b', fg: '1a1a2e' },
  chicken: { emoji: '🍗', bg: 'a16207', fg: 'fff7ee' },
  fish:    { emoji: '🐟', bg: '0369a1', fg: 'fff7ee' },
  fruit:   { emoji: '🍎', bg: 'dc2626', fg: 'fff7ee' },
  default: { emoji: '🍽️', bg: 'f5a623', fg: '1a1a2e' },
};

// İsmin içinde geçen kelimeye göre kategori
const RULES = [
  // İçecekler
  { kw: ['ayran'],                                     cat: 'ayran' },
  { kw: ['kahve', 'espresso', 'latte', 'cappuccino', 'mocha', 'nescafe'], cat: 'coffee' },
  { kw: ['çay', 'cay'],                                cat: 'tea' },
  { kw: ['kola', 'fanta', 'sprite', 'gazoz', 'soda'],  cat: 'soda' },
  { kw: ['meyve suyu', 'portakal suyu', 'limonata', 'şalgam', 'salgam'], cat: 'juice' },
  { kw: ['su'],                                        cat: 'water' },

  // Çorba
  { kw: ['çorba', 'corba', 'tarhana', 'mercimek çorba', 'ezogelin'], cat: 'soup' },

  // Et / Kebap
  { kw: ['döner', 'doner', 'iskender', 'tantuni'],     cat: 'kebab' },
  { kw: ['kebap', 'köfte', 'kofte', 'şiş', 'sis', 'pirzola', 'biftek', 'sucuk'], cat: 'meat' },
  { kw: ['tavuk', 'piliç', 'pilic'],                   cat: 'chicken' },
  { kw: ['balık', 'balik', 'somon', 'levrek', 'çupra', 'hamsi'], cat: 'fish' },

  // Hamur işleri
  { kw: ['lahmacun', 'pizza'],                         cat: 'pizza' },
  { kw: ['pide'],                                      cat: 'pide' },
  { kw: ['simit', 'poğaça', 'pogaca', 'börek', 'borek', 'açma', 'acma'], cat: 'pastry' },

  // Burger / Sandviç
  { kw: ['burger', 'hamburger', 'cheeseburger'],       cat: 'burger' },
  { kw: ['sandviç', 'sandvic', 'tost', 'kumru', 'wrap'], cat: 'sandwich' },

  // Yan ürünler
  { kw: ['pilav', 'bulgur', 'makarna', 'spagetti'],    cat: 'rice' },
  { kw: ['salata', 'çoban', 'coban', 'mevsim'],        cat: 'salad' },

  // Tatlı
  { kw: ['künefe', 'kunefe', 'baklava', 'sütlaç', 'sutlac', 'kazandibi', 'tulumba', 'şekerpare', 'sekerpare', 'kemalpaşa', 'dondurma', 'tatlı', 'tatli', 'pasta', 'cheesecake'], cat: 'dessert' },

  // Kahvaltı
  { kw: ['menemen', 'omlet', 'yumurta'],               cat: 'egg' },

  // Meyve
  { kw: ['elma', 'muz', 'portakal', 'meyve tab'],      cat: 'fruit' },
];

// Kısa kelimeler için sadece tam eşleşme (su/çay/kola/...)
const EXACT_ONLY = new Set(['su', 'çay', 'cay', 'kola', 'fanta', 'sprite', 'soda', 'et']);

function detectCategory(name) {
  if (!name) return 'default';
  const raw = String(name).toLocaleLowerCase('tr-TR').trim();

  // 0. Kısa kelimeler: sadece tam eşleşme
  if (EXACT_ONLY.has(raw)) {
    for (const r of RULES) {
      if (r.kw.includes(raw)) return r.cat;
    }
  }

  // 1. Kuralları uzun-anahtar-önce sırasıyla dolaş
  const sortedRules = [...RULES].sort((a, b) => {
    const aMax = Math.max(...a.kw.map((k) => k.length));
    const bMax = Math.max(...b.kw.map((k) => k.length));
    return bMax - aMax;
  });
  for (const r of sortedRules) {
    for (const k of r.kw) {
      if (k.length < 4 && raw !== k) continue; // kısa kelime sadece tam eşleşme
      if (raw.includes(k)) return r.cat;
    }
  }
  return 'default';
}

function findImageForName(name) {
  const cat = detectCategory(name);
  const c = CATEGORIES[cat] || CATEGORIES.default;
  // SVG data URI — her tarayıcıda emoji düzgün, network çağrısı yok, kesin çalışır.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#${c.bg}" stop-opacity="0.95"/><stop offset="100%" stop-color="#${c.bg}" stop-opacity="1"/></linearGradient></defs><rect width="600" height="450" fill="url(#g)"/><text x="300" y="240" font-size="240" text-anchor="middle" dominant-baseline="central" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${c.emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

module.exports = { findImageForName, detectCategory };
