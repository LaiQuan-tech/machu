// 產生「天上聖母經」的分享卡片圖（public/og-scripture.jpg）。
//
// 用法（sharp 不是本專案的相依套件，裝在暫存資料夾跑就好，別寫進 package.json）：
//   mkdir -p /tmp/cut && cd /tmp/cut && npm init -y && npm i sharp
//   node scripts/build-og-scripture.js /tmp/cut/node_modules ["封面路徑"]
// 第一個參數是 sharp 所在的 node_modules。本專案是 ESM（package.json 的
// type: module），NODE_PATH 對 import 沒作用，所以用 createRequire——
// 與 scripts/build-icons.js 同一個做法。
//
// ── 為什麼不直接用封面 ──
// 廟方的封面是 A4 直式（1414x2000，長寬比 0.707）。og:image 要的是 1200x630
// 橫式（1.91:1），直接餵直式圖給 LINE／Facebook 會被裁掉，標題整個不見。
// 所以把整張封面等比縮到卡片高度的 94%、置中，其餘鋪底色。
//
// ── 底色為什麼用取樣的而不是自己挑一個 ──
// 取封面四角的平均色（實測 rgb(222,198,169)），那就是封面自己的外框色。
// 用它才不會在畫面上多出第三種顏色，封面與底之間的接縫也是連續的。
import { statSync } from 'node:fs';
import path, { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const modulesPath = process.argv[2];
if (!modulesPath) {
  console.error('用法：node scripts/build-og-scripture.js <sharp 所在的 node_modules 路徑> [封面路徑]');
  process.exit(1);
}
const require = createRequire(resolve(modulesPath, 'x'));
const sharp = require('sharp');

const SRC = process.argv[3] || path.join(process.env.HOME, 'Downloads', '天上聖母經的註解與故事.jpg');
const OUT = resolve(ROOT, 'public', 'og-scripture.jpg');
const W = 1200, H = 630, FILL = 0.94;

const m = await sharp(SRC).metadata();
const boxes = [[0, 0], [m.width - 40, 0], [0, m.height - 40], [m.width - 40, m.height - 40]];
const stats = await Promise.all(boxes.map(([left, top]) =>
  sharp(SRC).extract({ left, top, width: 40, height: 40 }).stats()));
const bg = [0, 1, 2].map(i => Math.round(stats.reduce((s, c) => s + c.channels[i].mean, 0) / stats.length));

const cover = await sharp(SRC).resize({ height: Math.round(H * FILL) }).toBuffer();
const cm = await sharp(cover).metadata();
if (cm.width > W) throw new Error(`封面縮完仍比卡片寬（${cm.width} > ${W}），請調小 FILL`);

await sharp({ create: { width: W, height: H, channels: 3, background: { r: bg[0], g: bg[1], b: bg[2] } } })
  .composite([{ input: cover, left: Math.round((W - cm.width) / 2), top: Math.round((H - cm.height) / 2) }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(OUT);

console.log(`og-scripture.jpg  ${W}x${H}  ${(statSync(OUT).size / 1024) | 0}KB  底色 rgb(${bg.join(',')})  封面 ${cm.width}x${cm.height}`);
