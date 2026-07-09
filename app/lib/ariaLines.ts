// ============================================================
// lib/ariaLines.ts — Localised Aria launch messages
// Reusable across: create-shop-ad, future brand onboarding,
//                  any antbot launch sequence
// ============================================================

export const ARIA_LINES: Record<string, string> = {
  en: '🦋 Aria here — your campaign is live. All 10 antbots are running your shop across the network.',
  hi: '🦋 अरिया यहाँ हूँ — आपका अभियान लाइव है। सभी 10 एंटबॉट्स आपकी दुकान को नेटवर्क पर चला रहे हैं।',
  pt: '🦋 Aria aqui — sua campanha está ao vivo. Todos os 10 antbots estão rodando sua loja na rede.',
  es: '🦋 Aria aquí — tu campaña está en vivo. Los 10 antbots están ejecutando tu tienda en la red.',
  fr: '🦋 Aria ici — votre campagne est en direct. Les 10 antbots font tourner votre boutique sur le réseau.',
  ar: '🦋 أريا هنا — حملتك مباشرة الآن. جميع الـ 10 روبوتات تعمل على نشر متجرك عبر الشبكة.',
  zh: '🦋 Aria 在此 — 您的广告活动已上线。10 个蚂蚁机器人正在网络上运行您的店铺。',
  id: '🦋 Aria di sini — kampanye Anda sudah live. Semua 10 antbot menjalankan toko Anda di seluruh jaringan.',
  vi: '🦋 Aria đây — chiến dịch của bạn đã phát sóng. Tất cả 10 antbot đang chạy cửa hàng của bạn trên mạng.',
  ko: '🦋 Aria입니다 — 캠페인이 시작되었습니다. 10개의 앤트봇이 네트워크 전체에서 귀하의 가게를 운영하고 있습니다.',
  ja: '🦋 Ariaです — キャンペーンが開始されました。10台のアントボットがネットワーク全体であなたのショップを運営しています。',
  de: '🦋 Aria hier — Ihre Kampagne ist live. Alle 10 Antbots betreiben Ihren Shop im Netzwerk.',
  ur: '🦋 Aria یہاں ہے — آپ کی مہم لائیو ہے۔ تمام 10 اینٹ بوٹس آپ کی دکان کو نیٹ ورک پر چلا رہے ہیں۔',
  tr: '🦋 Aria burada — kampanyanız yayında. 10 antbot mağazanızı ağ genelinde çalıştırıyor.',
};

/**
 * Returns the localised Aria launch message for a given BCP-47 language code.
 * Falls back to English if the language is not found.
 */
export function getAriaLine(language: string): string {
  return ARIA_LINES[language] ?? ARIA_LINES.en;
}
