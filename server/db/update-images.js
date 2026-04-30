// Demo ürünleri için doğrulanmış (HTTP 200) yüksek kaliteli Unsplash/Pexels URL'leri.

const { getPool, initDb } = require('./init');

const IMAGE_MAP = {
  'Ayran':            'https://images.pexels.com/photos/26648792/pexels-photo-26648792.jpeg?auto=compress&cs=tinysrgb&w=640',
  'Kola':             'https://images.unsplash.com/photo-1574706226623-e5cc0da928c6?w=640&q=80',
  'Çay':              'https://images.unsplash.com/photo-1579005162638-11c872e1586e?w=640&q=80',
  'Türk Kahvesi':     'https://images.unsplash.com/photo-1576685880864-50b3b35f1c55?w=640&q=80',
  'Mercimek Çorbası': 'https://images.pexels.com/photos/12077978/pexels-photo-12077978.jpeg?auto=compress&cs=tinysrgb&w=640',
  'Ezogelin Çorbası': 'https://images.pexels.com/photos/29850843/pexels-photo-29850843.jpeg?auto=compress&cs=tinysrgb&w=640',
  'Karışık Salata':   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=640&q=80',
  'Humus':            'https://images.unsplash.com/photo-1637949385162-e416fb15b2ce?w=640&q=80',
  'Adana Kebap':      'https://images.pexels.com/photos/7439809/pexels-photo-7439809.jpeg?auto=compress&cs=tinysrgb&w=640',
  'İskender':         'https://images.pexels.com/photos/18062057/pexels-photo-18062057.jpeg?auto=compress&cs=tinysrgb&w=640',
  'Tavuk Şiş':        'https://images.unsplash.com/photo-1705359573325-f2006d5e459f?w=640&q=80',
  'Köfte':            'https://images.unsplash.com/photo-1620791144170-8a443bf37a33?w=640&q=80',
  'Pide':             'https://images.unsplash.com/photo-1771574208749-e3f497200d6f?w=640&q=80',
  'Lahmacun':         'https://images.pexels.com/photos/24427086/pexels-photo-24427086.jpeg?auto=compress&cs=tinysrgb&w=640',
  'Künefe':           'https://images.pexels.com/photos/37206691/pexels-photo-37206691.jpeg?auto=compress&cs=tinysrgb&w=640',
  'Baklava':          'https://images.unsplash.com/photo-1482930172332-2293d7138235?w=640&q=80',
  'Sütlaç':           'https://images.pexels.com/photos/30403808/pexels-photo-30403808.jpeg?auto=compress&cs=tinysrgb&w=640',
  'Kazandibi':        'https://images.pexels.com/photos/16668398/pexels-photo-16668398.jpeg?auto=compress&cs=tinysrgb&w=640',
};

(async () => {
  try {
    await initDb();
    const pool = getPool();
    const { rows: items } = await pool.query('SELECT id, name FROM menu_items');
    let ok = 0;
    for (const item of items) {
      const url = IMAGE_MAP[item.name];
      if (url) {
        await pool.query('UPDATE menu_items SET image_url = $1 WHERE id = $2', [url, item.id]);
        ok++;
        console.log('✓', item.name);
      } else {
        console.log('-', item.name, '(eşleşme yok)');
      }
    }
    console.log(`\n${ok}/${items.length} ürün güncellendi.`);
    process.exit(0);
  } catch (err) {
    console.error('Update images hatası:', err);
    process.exit(1);
  }
})();
