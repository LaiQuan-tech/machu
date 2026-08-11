// 由 public/logo.png 產生各尺寸的網站圖示。
//
// 用法（廟方換 logo 時重跑）：
//   cd /tmp && npm i @napi-rs/canvas && cd -
//   node scripts/build-icons.js /tmp/node_modules
// 第一個參數是 @napi-rs/canvas 所在的 node_modules 路徑。
// 刻意不寫進 package.json：這支一年跑不到一次，不值得讓每個人都裝這個原生套件。
//
// ── 為什麼要加底色 ──
// 原始 logo 是紅色線稿＋透明背景。瀏覽器分頁在深色模式下是深灰底，
// 紅線會糊在深色裡幾乎看不見；iOS 加到主畫面也會變成深色底上的紅字。
// 統一鋪上網站的米色底（#F5F0E8），淺色深色模式下都讀得到。
//
// ── 為什麼 ICO 裡包 PNG ──
// ICO 只是個容器，現代瀏覽器都支援直接內嵌 PNG（不必轉成古老的 BMP 格式），
// 這樣同一個 .ico 就能塞 16/32/48 三種尺寸，讓系統自己挑。

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = resolve(ROOT, 'public');

const modulesPath = process.argv[2];
if (!modulesPath) {
  console.error('用法：node scripts/build-icons.js <@napi-rs/canvas 所在的 node_modules 路徑>');
  process.exit(1);
}
const require = createRequire(resolve(modulesPath, 'x'));
const { createCanvas, loadImage } = require('@napi-rs/canvas');

/** 網站底色。圖示鋪這個色，深色分頁上才不會糊掉 */
const BG = '#F5F0E8';
/** logo 四周留白比例。太滿會被系統的圓角遮到字 */
const PAD = 0.08;

const render = async (img, size, { bg = BG, round = false } = {}) => {
  const c = createCanvas(size, size);
  const x = c.getContext('2d');
  if (bg) {
    if (round) {
      // 分頁圖示畫成圓形：方形色塊在瀏覽器分頁上看起來像沒去背的貼紙
      x.beginPath();
      x.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      x.closePath();
      x.fillStyle = bg;
      x.fill();
      x.clip();
    } else {
      x.fillStyle = bg;
      x.fillRect(0, 0, size, size);
    }
  }
  // 等比縮放置中，並留白
  const inner = size * (1 - PAD * 2);
  const scale = Math.min(inner / img.width, inner / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  x.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return c.toBuffer('image/png');
};

/** 把多張 PNG 包成一個 .ico */
const buildIco = (pngs) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);          // reserved
  header.writeUInt16LE(1, 2);          // type: 1 = icon
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + pngs.length * 16;
  const dir = [];
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);   // 寬（256 要寫 0）
    e.writeUInt8(size >= 256 ? 0 : size, 1);   // 高
    e.writeUInt8(0, 2);                        // 調色盤數（0 = 不使用）
    e.writeUInt8(0, 3);                        // reserved
    e.writeUInt16LE(1, 4);                     // color planes
    e.writeUInt16LE(32, 6);                    // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    offset += data.length;
  }
  return Buffer.concat([header, ...dir, ...pngs.map(p => p.data)]);
};

const img = await loadImage(resolve(PUBLIC, 'logo.png'));

// 分頁圖示：圓形底
const icoParts = [];
for (const size of [16, 32, 48]) {
  icoParts.push({ size, data: await render(img, size, { round: true }) });
}
writeFileSync(resolve(PUBLIC, 'favicon.ico'), buildIco(icoParts));
console.log('icons  favicon.ico        16/32/48');

const png32 = await render(img, 32, { round: true });
writeFileSync(resolve(PUBLIC, 'favicon-32.png'), png32);
console.log('icons  favicon-32.png     32×32');

// iOS 加到主畫面：方形，系統自己套圓角，所以這裡不要先畫圓
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  writeFileSync(resolve(PUBLIC, name), await render(img, size));
  console.log(`icons  ${name.padEnd(18)} ${size}×${size}`);
}
