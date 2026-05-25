// Türk yemek/içecek isimlerine gerçek fotoğraf URL'leri (Wikimedia Commons & TheMealDB — doğrulandı).
// Eşleşme yoksa SVG emoji placeholder fallback.

const W = (p) => `https://upload.wikimedia.org/wikipedia/commons/${p}`;
const M = (h) => `https://www.themealdb.com/images/media/meals/${h}`;

// İsim → gerçek foto URL (doğrulandı, çalışıyor)
const FOOD_IMAGES = {
  // Et / Kebap
  'adana kebap': W('thumb/5/55/Adana_kebab.jpg/330px-Adana_kebab.jpg'),
  'adana':       W('thumb/5/55/Adana_kebab.jpg/330px-Adana_kebab.jpg'),
  'urfa kebap':  W('thumb/5/55/Adana_kebab.jpg/330px-Adana_kebab.jpg'),
  'şiş kebap':   W('thumb/5/55/Adana_kebab.jpg/330px-Adana_kebab.jpg'),
  'sis kebap':   W('thumb/5/55/Adana_kebab.jpg/330px-Adana_kebab.jpg'),
  'kebap':       W('thumb/5/55/Adana_kebab.jpg/330px-Adana_kebab.jpg'),
  'köfte':       W('thumb/3/38/Koofteh_tabrizi.jpg/330px-Koofteh_tabrizi.jpg'),
  'kofte':       W('thumb/3/38/Koofteh_tabrizi.jpg/330px-Koofteh_tabrizi.jpg'),
  'döner':       W('a/ad/D%C3%B6ner_kebab_slicing.jpg'),
  'doner':       W('a/ad/D%C3%B6ner_kebab_slicing.jpg'),
  'iskender':    W('thumb/3/3e/%C4%B0skender_Kebap.jpg/330px-%C4%B0skender_Kebap.jpg'),
  'iskender kebap': W('thumb/3/3e/%C4%B0skender_Kebap.jpg/330px-%C4%B0skender_Kebap.jpg'),
  'mantı':       W('thumb/c/ca/Kayseride_bir_restoranda_Kayseri_mant%C4%B1s%C4%B1_%28cropped%29.jpg/330px-Kayseride_bir_restoranda_Kayseri_mant%C4%B1s%C4%B1_%28cropped%29.jpg'),
  'manti':       W('thumb/c/ca/Kayseride_bir_restoranda_Kayseri_mant%C4%B1s%C4%B1_%28cropped%29.jpg/330px-Kayseride_bir_restoranda_Kayseri_mant%C4%B1s%C4%B1_%28cropped%29.jpg'),
  'sucuk':       W('thumb/0/0b/Sucuk-1.jpg/330px-Sucuk-1.jpg'),
  'biftek':      M('pbzcrx1763765096.jpg'),

  // Pide / Lahmacun
  'lahmacun':    W('thumb/c/c7/Lahmacun.jpg/330px-Lahmacun.jpg'),
  'pide':        W('thumb/a/a6/Su_B%C3%B6re%C4%9Fi.JPG/330px-Su_B%C3%B6re%C4%9Fi.JPG'),
  'pizza':       W('thumb/c/c8/Pizza_Margherita_stu_spivack.jpg/330px-Pizza_Margherita_stu_spivack.jpg'),

  // Çorba
  'mercimek çorbası': W('thumb/6/61/EgFoodLentilSoup.jpg/330px-EgFoodLentilSoup.jpg'),
  'mercimek corbasi': W('thumb/6/61/EgFoodLentilSoup.jpg/330px-EgFoodLentilSoup.jpg'),
  'mercimek':         W('thumb/6/61/EgFoodLentilSoup.jpg/330px-EgFoodLentilSoup.jpg'),
  'ezogelin':         W('thumb/6/61/EgFoodLentilSoup.jpg/330px-EgFoodLentilSoup.jpg'),
  'domates çorbası':  W('thumb/8/8c/Tomato_soup%2C_plant-based_%2844040252791%29.jpg/330px-Tomato_soup%2C_plant-based_%2844040252791%29.jpg'),
  'domates corbasi':  W('thumb/8/8c/Tomato_soup%2C_plant-based_%2844040252791%29.jpg/330px-Tomato_soup%2C_plant-based_%2844040252791%29.jpg'),

  // Kahvaltı / Hamur
  'menemen':     W('thumb/f/fd/My_breakfast_menemen.jpg/330px-My_breakfast_menemen.jpg'),
  'su böreği':   W('thumb/a/a6/Su_B%C3%B6re%C4%9Fi.JPG/330px-Su_B%C3%B6re%C4%9Fi.JPG'),
  'su boregi':   W('thumb/a/a6/Su_B%C3%B6re%C4%9Fi.JPG/330px-Su_B%C3%B6re%C4%9Fi.JPG'),
  'börek':       W('thumb/a/a6/Su_B%C3%B6re%C4%9Fi.JPG/330px-Su_B%C3%B6re%C4%9Fi.JPG'),
  'borek':       W('thumb/a/a6/Su_B%C3%B6re%C4%9Fi.JPG/330px-Su_B%C3%B6re%C4%9Fi.JPG'),

  // Salata
  'çoban salata':    W('thumb/9/94/Salad_platter.jpg/330px-Salad_platter.jpg'),
  'coban salata':    W('thumb/9/94/Salad_platter.jpg/330px-Salad_platter.jpg'),
  'mevsim salata':   W('thumb/9/94/Salad_platter.jpg/330px-Salad_platter.jpg'),
  'salata':          W('thumb/9/94/Salad_platter.jpg/330px-Salad_platter.jpg'),

  // Tatlı
  'künefe':      W('thumb/c/c8/K%C3%BCnefe.jpg/330px-K%C3%BCnefe.jpg'),
  'kunefe':      W('thumb/c/c8/K%C3%BCnefe.jpg/330px-K%C3%BCnefe.jpg'),
  'baklava':     W('thumb/c/c7/Baklava%281%29.png/330px-Baklava%281%29.png'),

  // Burger / Sandviç
  'burger':      W('thumb/0/0b/RedDot_Burger.jpg/330px-RedDot_Burger.jpg'),
  'hamburger':   W('thumb/0/0b/RedDot_Burger.jpg/330px-RedDot_Burger.jpg'),
  'cheeseburger':W('thumb/0/0b/RedDot_Burger.jpg/330px-RedDot_Burger.jpg'),

  // İçecekler
  'türk kahvesi':W('thumb/b/b5/T%C3%BCrk_Kahvesi_-_Bakir_Cezve.jpg/330px-T%C3%BCrk_Kahvesi_-_Bakir_Cezve.jpg'),
  'turk kahvesi':W('thumb/b/b5/T%C3%BCrk_Kahvesi_-_Bakir_Cezve.jpg/330px-T%C3%BCrk_Kahvesi_-_Bakir_Cezve.jpg'),
  'kahve':       W('thumb/b/b5/T%C3%BCrk_Kahvesi_-_Bakir_Cezve.jpg/330px-T%C3%BCrk_Kahvesi_-_Bakir_Cezve.jpg'),
  'ayran':       W('thumb/8/8e/Fresh_ayran.jpg/330px-Fresh_ayran.jpg'),
  'çay':         W('thumb/8/8a/Cup_of_black_tea.JPG/330px-Cup_of_black_tea.JPG'),
  'cay':         W('thumb/8/8a/Cup_of_black_tea.JPG/330px-Cup_of_black_tea.JPG'),
  'su':          W('0/02/Stilles_Mineralwasser.jpg'),
  'kola':        W('thumb/2/27/Coca_Cola_Flasche_-_Original_Taste.jpg/330px-Coca_Cola_Flasche_-_Original_Taste.jpg'),
  'coca cola':   W('thumb/2/27/Coca_Cola_Flasche_-_Original_Taste.jpg/330px-Coca_Cola_Flasche_-_Original_Taste.jpg'),
  'limonata':    W('thumb/1/10/Lemonade_-_27682817724.jpg/330px-Lemonade_-_27682817724.jpg'),
  'lemonade':    W('thumb/1/10/Lemonade_-_27682817724.jpg/330px-Lemonade_-_27682817724.jpg'),
};

// Kısa kelimeler: sadece tam eşleşme (su/çay/kola/et)
const EXACT_ONLY = new Set(['su', 'çay', 'cay', 'kola', 'et']);

// Anahtar kelime → gerçek foto (4+ karakter)
const KEYWORDS = [
  ['kebap',    FOOD_IMAGES['kebap']],
  ['köfte',    FOOD_IMAGES['köfte']],
  ['kofte',    FOOD_IMAGES['kofte']],
  ['döner',    FOOD_IMAGES['döner']],
  ['doner',    FOOD_IMAGES['doner']],
  ['lahmacun', FOOD_IMAGES['lahmacun']],
  ['pizza',    FOOD_IMAGES['pizza']],
  ['pide',     FOOD_IMAGES['pide']],
  ['mercimek', FOOD_IMAGES['mercimek']],
  ['çorba',    FOOD_IMAGES['domates çorbası']],
  ['corba',    FOOD_IMAGES['domates çorbası']],
  ['salata',   FOOD_IMAGES['salata']],
  ['künefe',   FOOD_IMAGES['künefe']],
  ['kunefe',   FOOD_IMAGES['kunefe']],
  ['baklava',  FOOD_IMAGES['baklava']],
  ['burger',   FOOD_IMAGES['burger']],
  ['kahve',    FOOD_IMAGES['kahve']],
  ['ayran',    FOOD_IMAGES['ayran']],
  ['börek',    FOOD_IMAGES['börek']],
  ['borek',    FOOD_IMAGES['borek']],
  ['sucuk',    FOOD_IMAGES['sucuk']],
  ['mantı',    FOOD_IMAGES['mantı']],
  ['manti',    FOOD_IMAGES['manti']],
  ['menemen',  FOOD_IMAGES['menemen']],
];

// SVG placeholder fallback (en son seçenek)
function svgPlaceholder() {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450"><rect fill="#f5a623" width="600" height="450"/><text x="300" y="240" font-size="240" text-anchor="middle" dominant-baseline="central" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">🍽️</text></svg>';
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function normalize(str) {
  return String(str || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
}

function findImageForName(name) {
  if (!name) return svgPlaceholder();
  const raw = normalize(name);

  // 1. Kısa exact-only kelimeler
  if (EXACT_ONLY.has(raw) && FOOD_IMAGES[raw]) return FOOD_IMAGES[raw];

  // 2. Tam eşleşme
  if (FOOD_IMAGES[raw]) return FOOD_IMAGES[raw];

  // 3. İçerme — uzun anahtarlar (4+ karakter)
  const sortedKeys = Object.keys(FOOD_IMAGES)
    .filter((k) => k.length >= 4)
    .sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (raw.includes(key)) return FOOD_IMAGES[key];
  }

  // 4. Anahtar kelime fallback
  for (const [kw, url] of KEYWORDS) {
    if (kw.length >= 4 && raw.includes(kw)) return url;
  }

  // 5. SVG placeholder
  return svgPlaceholder();
}

module.exports = { findImageForName };
