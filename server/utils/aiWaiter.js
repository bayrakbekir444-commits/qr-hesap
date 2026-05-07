const Anthropic = require('@anthropic-ai/sdk');

let cachedClient = null;
function getClient() {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY tanımlı değil.');
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

const LANG_NAMES = { tr: 'Türkçe', en: 'English', ar: 'العربية' };

function buildMenuContext(categories) {
  const lines = [];
  for (const cat of categories || []) {
    if (!cat.items || cat.items.length === 0) continue;
    lines.push(`\n## ${cat.name}`);
    for (const item of cat.items) {
      if (item.active === 0) continue;
      const price = Number(item.price).toFixed(2);
      const desc = item.description ? ` — ${item.description}` : '';
      lines.push(`- ${item.name} (${price} TL)${desc}`);
    }
  }
  return lines.join('\n');
}

function buildSystemPrompt({ restaurantName, menuText, lang }) {
  const langName = LANG_NAMES[lang] || 'Türkçe';
  return `Sen ${restaurantName} restoranının dijital garsonusun. Müşterilere ${langName} dilinde cevap ver.

Görevin:
- Müşterinin sorularına SADECE aşağıdaki menüden cevap ver
- Yemek önerileri yap (acılı, vejetaryen, hafif, doyurucu vs.)
- Bütçeye göre kombinasyonlar öner (ör: "200 TL'ye 2 kişi")
- Allerjen/diyet sorularına yardım et
- Yan ürün öner ("yanına ayran ister misiniz?")
- Kısa, samimi, garsona benzer konuş — uzun listelemeler yapma
- Asla menüde olmayan bir ürünü önerme
- Fiyatları her zaman söyle

KURALLAR:
- Sadece yemek/içecek/restoran konularında konuş
- Politik, kişisel, alakasız konulara "Sadece menü hakkında yardımcı olabilirim" de
- Cevapların 3-4 cümleyi geçmesin
- Markdown kullanma, düz yazı

MENÜ:
${menuText}`;
}

async function chat({ restaurantName, categories, lang, history, userMessage }) {
  const client = getClient();
  const menuText = buildMenuContext(categories);
  const system = buildSystemPrompt({ restaurantName, menuText, lang });

  const messages = [];
  for (const msg of (history || []).slice(-6)) {
    if (msg && (msg.role === 'user' || msg.role === 'assistant') && msg.content) {
      messages.push({ role: msg.role, content: String(msg.content).slice(0, 1000) });
    }
  }
  messages.push({ role: 'user', content: String(userMessage).slice(0, 1000) });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system,
    messages,
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  return {
    text,
    usage: {
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0,
    },
  };
}

module.exports = { chat };
