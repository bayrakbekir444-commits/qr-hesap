// Türk yemek/içecek isimlerini Pexels foto URL'lerine eşler.
// Restoran sahibi ürün adı yazıp foto yüklemezse backend otomatik atar.

const px = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;

const FOOD_IMAGES = {
  // Çorbalar
  'mercimek çorbası': px(539451),
  'mercimek corbasi': px(539451),
  'ezogelin': px(539451),
  'tarhana': px(1109197),
  'işkembe': px(1109197),
  'iskembe': px(1109197),
  'yayla çorba': px(1109197),
  'domates çorbası': px(539451),

  // Et / Kebap / Ana Yemek
  'adana kebap': px(1639565),
  'urfa kebap': px(1639565),
  'şiş kebap': px(461198),
  'sis kebap': px(461198),
  'kuzu şiş': px(461198),
  'tavuk şiş': px(461198),
  'tavuk sis': px(461198),
  'köfte': px(1639565),
  'kofte': px(1639565),
  'izgara köfte': px(1639565),
  'mercimek köftesi': px(8951534),
  'içli köfte': px(8951534),
  'icli kofte': px(8951534),
  'kuzu pirzola': px(461198),
  'biftek': px(2233729),
  'döner': px(8753650),
  'doner': px(8753650),
  'iskender': px(8753650),
  'iskender kebap': px(8753650),
  'tantuni': px(8753650),
  'lahmacun': px(905847),
  'pide': px(4193869),
  'kıymalı pide': px(4193869),
  'kasarli pide': px(4193869),
  'karışık pide': px(4193869),

  // Pilav / Garnitür / Mezeler
  'pilav': px(1640774),
  'bulgur pilavı': px(1640774),
  'patates kızartması': px(1640777),
  'patates kizartmasi': px(1640777),
  'humus': px(4955246),
  'haydari': px(4955246),
  'cacık': px(4955246),
  'cacik': px(4955246),
  'şakşuka': px(4955246),
  'saksuka': px(4955246),
  'çoban salata': px(1660027),
  'mevsim salata': px(1660027),
  'salata': px(1660027),

  // Tatlılar
  'künefe': px(3026808),
  'kunefe': px(3026808),
  'baklava': px(4099124),
  'sütlaç': px(3026808),
  'sutlac': px(3026808),
  'kazandibi': px(3026808),
  'kemalpaşa': px(4099124),
  'şekerpare': px(4099124),
  'tulumba': px(4099124),
  'dondurma': px(1132558),

  // İçecekler
  'ayran': px(3735170),
  'limonata': px(2456435),
  'şalgam': px(2456435),
  'salgam': px(2456435),
  'türk kahvesi': px(1162455),
  'turk kahvesi': px(1162455),
  'kahve': px(1162455),
  'çay': px(312418),
  'cay': px(312418),
  'nescafe': px(1207386),
  'latte': px(1207386),
  'cappuccino': px(1207386),
  'kola': px(2983100),
  'fanta': px(2983100),
  'soda': px(2983100),
  'sprite': px(2983100),
  'su': px(2983100),
  'meyve suyu': px(96974),
  'portakal suyu': px(96974),

  // Kahvaltı
  'menemen': px(1860203),
  'sucuklu yumurta': px(1860203),
  'serpme kahvaltı': px(1660030),
  'kahvaltı': px(1660030),
  'kahvalti': px(1660030),
  'simit': px(4255484),
  'poğaça': px(4255484),
  'pogaca': px(4255484),
  'börek': px(4255484),
  'borek': px(4255484),

  // Burger / Hamburger / Sandviç
  'burger': px(1639557),
  'hamburger': px(1639557),
  'cheeseburger': px(1639557),
  'sandviç': px(1639557),
  'sandvic': px(1639557),
  'tost': px(1571997),
  'kumru': px(1571997),
};

// Anahtar kelime → görsel (eşleşmediyse parçalı arama)
// 3+ karakter zorunlu; "su", "et" gibi kısa kelimeler tehlikeli (sulu köfte → su)
const KEYWORD_MAP = [
  ['çorba', px(539451)],
  ['corba', px(539451)],
  ['kebap', px(1639565)],
  ['köfte', px(1639565)],
  ['kofte', px(1639565)],
  ['döner', px(8753650)],
  ['doner', px(8753650)],
  ['pizza', px(905847)],
  ['pide', px(4193869)],
  ['lahma', px(905847)],
  ['salata', px(1660027)],
  ['pilav', px(1640774)],
  ['tatlı', px(4099124)],
  ['tatli', px(4099124)],
  ['baklava', px(4099124)],
  ['kahve', px(1162455)],
  ['ayran', px(3735170)],
  ['burger', px(1639557)],
  ['sandviç', px(1639557)],
  ['sandvic', px(1639557)],
  ['tost', px(1571997)],
  ['börek', px(4255484)],
  ['borek', px(4255484)],
  ['kahvaltı', px(1660030)],
  ['kahvalti', px(1660030)],
  ['tavuk', px(461198)],
  ['balık', px(842571)],
  ['balik', px(842571)],
];

// Kısa, tam eşleşme zorunlu kelimeler (kola, su, çay, et, vs.)
// Bu set "Su" tek başına ise su fotosu, "Sulu Köfte" ise köfte fotosu vermek için
const EXACT_ONLY = new Set(['su', 'çay', 'cay', 'kola', 'fanta', 'sprite', 'soda', 'et', 'sicak', 'sıcak', 'soguk', 'soğuk']);

const EXACT_IMAGES = {
  'su': 'https://images.pexels.com/photos/416528/pexels-photo-416528.jpeg?auto=compress&cs=tinysrgb&w=800',
  'çay': px(312418),
  'cay': px(312418),
  'kola': 'https://images.pexels.com/photos/2983100/pexels-photo-2983100.jpeg?auto=compress&cs=tinysrgb&w=800',
  'fanta': 'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg?auto=compress&cs=tinysrgb&w=800',
  'sprite': px(2983100),
  'soda': px(2983100),
};

const DEFAULT_IMAGE = px(958545); // generic plated food

function normalize(str) {
  return String(str || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zçğıöşü0-9\s]/gi, '')
    .trim();
}

function findImageForName(name) {
  if (!name) return DEFAULT_IMAGE;
  const raw = String(name).toLocaleLowerCase('tr-TR').trim();

  // 0. Kısa exact-only kelimeler (su / çay / kola vs.) — sadece tam eşleşme
  if (EXACT_ONLY.has(raw) && EXACT_IMAGES[raw]) return EXACT_IMAGES[raw];

  // 1. Tam eşleşme (sözlükten)
  if (FOOD_IMAGES[raw]) return FOOD_IMAGES[raw];
  const norm = normalize(name);
  if (FOOD_IMAGES[norm]) return FOOD_IMAGES[norm];

  // 2. İçerme (örn. "Acılı Adana Kebap" → "adana kebap")
  //    Sadece 4+ karakter anahtarları kullan (yanlış pozitif önleme)
  for (const key of Object.keys(FOOD_IMAGES)) {
    if (key.length >= 4 && raw.includes(key)) return FOOD_IMAGES[key];
  }

  // 3. Anahtar kelime fallback (sadece 4+ karakter)
  for (const [kw, url] of KEYWORD_MAP) {
    if (kw.length >= 4 && raw.includes(kw)) return url;
  }

  // 4. Hiçbir şey eşleşmedi
  return DEFAULT_IMAGE;
}

module.exports = { findImageForName };
