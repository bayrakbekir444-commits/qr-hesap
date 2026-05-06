const Iyzipay = require('iyzipay');

let cachedClient = null;

function getClient() {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const uri = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';

  if (!apiKey || !secretKey) {
    throw new Error('iyzico API anahtarları tanımlı değil (IYZICO_API_KEY / IYZICO_SECRET_KEY).');
  }

  cachedClient = new Iyzipay({ apiKey, secretKey, uri });
  return cachedClient;
}

// Kart numarasından temel doğrulama (Luhn)
function isValidCardNumber(num) {
  const s = String(num).replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(s)) return false;
  let sum = 0;
  let alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = parseInt(s[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * 3DS akışı başlatır. iyzico HTML formu döner;
 * frontend bu HTML'i bir iframe'de açıp banka 3DS sayfasını gösterir.
 *
 * @param {object} params
 * @param {string} params.conversationId  — bizim taraf takip ID'miz (ödeme ID'si)
 * @param {number} params.amount          — toplam tutar (TL, ondalıklı sayı)
 * @param {object} params.card            — { holder, number, expireMonth, expireYear, cvc }
 * @param {object} params.buyer           — { id, name, surname, email, phone, ip }
 * @param {object[]} params.items         — [{ id, name, price }]
 * @returns {Promise<{ status, threeDSHtmlContent, paymentId, errorCode, errorMessage }>}
 */
function initiate3DS({ conversationId, amount, card, buyer, items }) {
  const client = getClient();
  const callbackUrl = process.env.IYZICO_CALLBACK_URL;
  if (!callbackUrl) throw new Error('IYZICO_CALLBACK_URL tanımlı değil.');

  const totalStr = Number(amount).toFixed(2);
  const basketItems = (items && items.length ? items : [{ id: 'order', name: 'Sipariş', price: totalStr }])
    .map((it, idx) => ({
      id: String(it.id || `item-${idx + 1}`),
      name: String(it.name || `Ürün ${idx + 1}`).slice(0, 100),
      category1: 'Yiyecek-İçecek',
      itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
      price: Number(it.price).toFixed(2),
    }));

  // Sepet toplamı = price toplamı (iyzico bunu doğruluyor)
  const basketSum = basketItems.reduce((s, b) => s + Number(b.price), 0).toFixed(2);
  // Eğer sepet toplamı amount'la uyuşmazsa tek satıra düş
  const itemsToSend = basketSum === totalStr
    ? basketItems
    : [{ id: 'order', name: 'Sipariş', category1: 'Yiyecek-İçecek', itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL, price: totalStr }];

  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: String(conversationId),
    price: totalStr,
    paidPrice: totalStr,
    currency: Iyzipay.CURRENCY.TRY,
    installment: '1',
    basketId: String(conversationId),
    paymentChannel: Iyzipay.PAYMENT_CHANNEL.WEB,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl,
    paymentCard: {
      cardHolderName: card.holder,
      cardNumber: String(card.number).replace(/\s/g, ''),
      expireMonth: String(card.expireMonth).padStart(2, '0'),
      expireYear: String(card.expireYear).length === 2 ? `20${card.expireYear}` : String(card.expireYear),
      cvc: String(card.cvc),
      registerCard: '0',
    },
    buyer: {
      id: String(buyer.id || 'guest'),
      name: buyer.name || 'Misafir',
      surname: buyer.surname || 'Müşteri',
      gsmNumber: buyer.phone || '+905555555555',
      email: buyer.email || 'guest@qrhesap.net',
      identityNumber: buyer.identityNumber || '11111111111',
      registrationAddress: 'Restoran',
      ip: buyer.ip || '85.34.78.112',
      city: 'Istanbul',
      country: 'Turkey',
    },
    shippingAddress: {
      contactName: buyer.name || 'Misafir',
      city: 'Istanbul',
      country: 'Turkey',
      address: 'Restoran',
    },
    billingAddress: {
      contactName: buyer.name || 'Misafir',
      city: 'Istanbul',
      country: 'Turkey',
      address: 'Restoran',
    },
    basketItems: itemsToSend,
  };

  return new Promise((resolve, reject) => {
    client.threedsInitialize.create(request, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

/**
 * 3DS callback geldiğinde ödemeyi tamamlar.
 * iyzico bize POST atar — paymentId ve conversationData ile birlikte.
 */
function complete3DS({ paymentId, conversationData, conversationId }) {
  const client = getClient();
  return new Promise((resolve, reject) => {
    client.threedsPayment.create({
      locale: Iyzipay.LOCALE.TR,
      conversationId: String(conversationId || ''),
      paymentId: String(paymentId),
      conversationData: conversationData || undefined,
    }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

module.exports = {
  initiate3DS,
  complete3DS,
  isValidCardNumber,
};
