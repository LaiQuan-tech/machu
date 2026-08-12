// 預渲染：為每一條路由產出獨立的靜態 HTML
//
// 由 `npm run build` 自動接著跑（見 package.json），不需要另外執行。
//
// ── 為什麼需要 ──
// 本站是純前端渲染的 SPA，原始 HTML 的可見文字是 0 個字。Google 會執行 JavaScript
// 所以看得到，但 GPTBot／ClaudeBot／PerplexityBot 這些 AI 檢索器**不執行 JS**。
// 而且所有路由本來共用同一份 index.html，等於 /about、/booking 全都頂著法會報名的標題。
//
// ── 這支做什麼 ──
// 拿剛建好的 dist/index.html 當模板，為每條路由複製一份並換掉：
//   title、description、og:title/description/url、canonical，
//   再補上該頁自己的 JSON-LD 與一段 <noscript> 內容。
// 資產路徑直接沿用模板，所以 hash 一定對得上（這是它必須跑在 build 之後的原因）。
//
// ── 這支不做什麼 ──
// 它不會把 React 真的跑一遍，所以**後台資料（公告、神尊、關於我們的內文）不會進到靜態 HTML**。
// 那些要靠無頭瀏覽器快照才拿得到。目前的取捨是：這些頁面的「用途說明」是穩定的，
// 手寫一次就長期有效，而且零相依、不會因為瀏覽器版本或 CI 環境壞掉。
// 若之後要連後台內容一起靜態化，再換成 puppeteer 版本（要注意 `/` 在
// 非官網網域會顯示報名表，快照時必須讓瀏覽器以 heshengtan.tw 的身分解析）。

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const ORIGIN = 'https://heshengtan.tw';

/**
 * 每條路由的靜態身分。
 * `/` 不在這裡：根路徑用原本的 index.html，那份的標題與分享預覽是法會收件版，
 * 由 index.html 直接維護（收件結束後換回官網版，見該檔開頭的註解）。
 */
const ROUTES = [
  {
    path: '/about',
    title: '關於和聖壇｜台北古亭媽祖廟的沿革與壇務',
    desc: '和聖壇創立於民國 73 年，主祀天上聖母，前身為聖鳳壇。位於台北市中正區晉江街，提供問事、點燈、法會等服務。',
    h1: '關於和聖壇',
    body: [
      '和聖壇創立於民國 73 年（1984），主祀天上聖母，前身為「聖鳳壇」，位於台北市中正區晉江街 72 巷 9 號。',
      '秉持天上聖母傳道的精神，信仰不止於燒香祈福，更落實於日常的為人處世。',
    ],
  },
  {
    path: '/booking',
    title: '預約問事｜台北古亭和聖壇',
    desc: '事業、感情、家運遇有瓶頸，誠心向神明請示。台北古亭和聖壇提供一對一專人解籤與問事服務，可線上預約場次，亦接受現場報名。',
    h1: '預約問事',
    body: [
      '事業、感情、家運遇有瓶頸時，可誠心向神明請示。本壇提供一對一專人解籤與問事服務。',
      '請盡可能透過官方網站或官方 LINE 帳號預約場次，方便廟方安排時間；也接受現場報名。',
    ],
  },
  {
    path: '/lamps',
    title: '祈福點燈｜太歲祈安燈・光明前程祈福燈・財利燈・本命神明燈',
    desc: '台北古亭和聖壇祈福點燈線上登記。農曆新年期間提供太歲祈安燈、光明前程祈福燈、財源廣進財利燈、本命神明祈願燈，祈求流年順遂、元辰光彩。',
    h1: '祈福點燈',
    body: [
      '農曆新年期間提供太歲祈安燈（每年 NT$300）、光明前程祈福燈（每年 NT$300）、財源廣進財利燈（每年 NT$500）、本命神明祈願燈（每年 NT$1,200），祈求流年順遂、元辰光彩。',
      '可於線上填寫姓名、生辰與地址完成登記。',
    ],
  },
  {
    path: '/blessing',
    title: '祈福法會報名｜台北古亭和聖壇',
    desc: '台北古亭和聖壇不定期舉辦祈福法會，為信眾消災解厄、增福添壽，提供個人與闔家平安祈福線上報名。',
    h1: '祈福法會',
    body: [
      '本壇不定期舉辦各式祈福法會，為信眾消災解厄、增福添壽。',
      '提供個人與闔家平安祈福登記，可於線上報名。',
    ],
  },
  {
    path: '/relocation',
    title: '遷址捐款｜護持和聖壇道場遷址',
    desc: '和聖壇道場遷址護持專案。分「每月同行｜月供養」與「單次供養」兩種方案，誠摯邀請信眾一同護持。',
    h1: '遷址捐款',
    body: [
      '近四十年來，和聖壇陪伴信眾走過人生的重要時刻。隨著道場使用面臨新的挑戰，我們希望為下一個世代留下能共同成長的家。',
      '捐款方案分為「每月同行｜月供養」與「單次供養」兩種。',
    ],
  },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 只換第一個符合的標籤，找不到就丟錯——寧可讓建置失敗，也不要靜靜產出沒換到的頁面 */
const swap = (html, pattern, replacement, label) => {
  if (!pattern.test(html)) throw new Error(`prerender: 在模板裡找不到 ${label}`);
  return html.replace(pattern, replacement);
};

const template = readFileSync(resolve(DIST, 'index.html'), 'utf8');

/**
 * 常見問題：注入首頁的 FAQPage 結構化資料與 <noscript> 純文字。
 *
 * 內容的正式來源是資料庫 `faq_items`（後台可編輯），這裡在建置時抓一份快照。
 * 抓不到（沒設環境變數、Supabase 暫停、表還沒建）就退回 content/faq.json，
 * 讓建置永遠不會因為外部服務而失敗。
 *
 * ── 三份內容的時效性，講清楚 ──
 *   首頁畫面      執行期讀資料庫 → 廟方一存檔就變
 *   FAQPage 標記  執行期由 App.tsx 覆蓋 → Google 會執行 JS，看到的與畫面一致
 *   noscript 文字 就是這裡產的快照 → 不執行 JS 的 AI 爬蟲會讀到「上次部署時」的內容
 * 最後一項有時間差是刻意的取捨：那只影響新鮮度，不影響標記與畫面是否一致。
 */
const FALLBACK_FAQ = JSON.parse(readFileSync(resolve(DIST, '..', 'content', 'faq.json'), 'utf8')).items;

const fetchFaq = async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log('prerender  FAQ 來源：content/faq.json（沒有 Supabase 環境變數）');
    return FALLBACK_FAQ;
  }
  try {
    const res = await fetch(
      `${url}/rest/v1/faq_items?select=question,answer&is_visible=eq.true&order=sort_order`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('沒有資料');
    console.log(`prerender  FAQ 來源：資料庫（${rows.length} 題）`);
    return rows.map((r) => ({ q: r.question, a: r.answer }));
  } catch (e) {
    console.log(`prerender  FAQ 來源：content/faq.json（讀資料庫失敗：${e.message}）`);
    return FALLBACK_FAQ;
  }
};

const faq = await fetchFaq();


for (const r of ROUTES) {
  let html = template;
  const url = ORIGIN + r.path;

  html = swap(html, /<title>[^<]*<\/title>/, `<title>${esc(r.title)}</title>`, '<title>');
  html = swap(html, /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${esc(r.desc)}" />`, 'meta description');
  html = swap(html, /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${url}" />`, 'canonical');
  html = swap(html, /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${esc(r.title)}" />`, 'og:title');
  html = swap(html, /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${esc(r.desc)}" />`, 'og:description');
  html = swap(html, /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${url}" />`, 'og:url');

  // 這一頁自己的 JSON-LD：麵包屑讓檢索器知道站內層級，WebPage 綁回宮廟本體
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url + '#page',
        url,
        name: r.title,
        description: r.desc,
        inLanguage: 'zh-TW',
        isPartOf: { '@id': ORIGIN + '/#website' },
        about: { '@id': ORIGIN + '/#temple' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '台北古亭和聖壇', item: ORIGIN + '/' },
          { '@type': 'ListItem', position: 2, name: r.h1, item: url },
        ],
      },
    ],
  };
  html = html.replace('</head>',
    `  <script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n    </script>\n  </head>`);

  // 不執行 JS 的檢索器讀得到的實際文字
  const noscript = `
    <noscript>
      <div style="max-width:44rem;margin:0 auto;padding:2.5rem 1.25rem;font-family:'Noto Serif TC',serif;color:#3D2800;line-height:1.9">
        <h1 style="font-size:1.75rem;margin:0 0 1rem">${esc(r.h1)}</h1>
${r.body.map((p) => `        <p>${esc(p)}</p>`).join('\n')}
        <p style="margin-top:1.5rem">台北古亭和聖壇｜100 臺北市中正區晉江街 72 巷 9 號｜電話 <a href="tel:0953945349" style="color:#7C5C1E">0953-945-349</a>｜每日 06:00 – 23:00</p>
        <p><a href="/" style="color:#7C5C1E">回首頁</a></p>
        <p style="color:#7C5C1E">本頁的線上登記功能需要啟用 JavaScript。</p>
      </div>
    </noscript>`;
  html = html.replace('<div id="root"></div>', '<div id="root"></div>\n' + noscript);

  const out = resolve(DIST, r.path.slice(1) + '.html');
  writeFileSync(out, html, 'utf8');
  console.log(`prerender  ${r.path.padEnd(12)} → dist${r.path}.html`);
}

// ── 首頁：注入 FAQ（結構化資料 + noscript 純文字）─────────────────────────
{
  let home = template;

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': ORIGIN + '/#faq',
    inLanguage: 'zh-TW',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  home = home.replace('</head>',
    `  <script type="application/ld+json">\n${JSON.stringify(faqLd, null, 2)}\n    </script>\n  </head>`);

  const marker = '<p style="margin-top:1.75rem;color:#7C5C1E">本網站需要啟用 JavaScript';
  if (!home.includes(marker)) throw new Error('prerender: 在 index.html 的 noscript 裡找不到結尾段落');
  const faqText = `<h2 style="font-size:1.15rem;margin:1.75rem 0 .5rem">常見問題</h2>
${faq.map((f) => `        <p><strong>${esc(f.q)}</strong><br />${esc(f.a)}</p>`).join('\n')}
        `;
  home = home.replace(marker, faqText + marker);

  writeFileSync(resolve(DIST, 'index.html'), home, 'utf8');
  console.log(`prerender  /            → dist/index.html（FAQ ${faq.length} 題）`);
}

console.log(`prerender  完成 ${ROUTES.length} 頁`);
