// Hero 三尊神尊去背 ＋ 產出網頁用檔案
//
// 用法（sharp 不是本專案的相依套件，裝在暫存資料夾跑就好，不要寫進 package.json）：
//   mkdir -p /tmp/cut && cd /tmp/cut && npm init -y && npm i sharp
//   NODE_PATH=/tmp/cut/node_modules node scripts/build-hero-assets.js
//
// 換新照片時：改下面 JOBS 的 src 與 pred，跑完直接覆蓋 public/hero-*.webp|png。
// pred 是「這個像素像不像背景」，參數怎麼調見 scripts/cutout-lib.js 的說明。
const sharp = require('sharp');
const { cutout } = require('./cutout-lib.js');
const D = process.env.HOME + '/Downloads/';
const OUT = '/Users/chiehfanchung/Documents/和聖壇網站/public/';

// 三尊的去背參數各自不同，因為背景完全是兩回事：
//   二媽 拍在黃牆前（牆和橘袍同色系，只能靠飽和度＋過曝亮斑切，寧可留一點牆）
//   聖母、濟公 拍在白／灰背板前（低飽和高亮就是背景，好切）
const JOBS = [
  // 黃牆：牆與橘袍是同一個色系（實測牆 h40 s0.99 v0.92、袍緣 h39 s0.98 v0.91，
  // 顏色上根本分不開），只能靠連通性擋。原則是寧可留一點牆——Hero 底就是金色，
  // 殘留的黃看不太出來，少一塊袍子卻很明顯。
  // 反光亮斑那一條要加 s<0.65 才切得掉：不加會連神尊肩後那塊黃布（s0.87 v0.98）一起吃掉。
  { src: 'DSC04874.png',         name: 'hero-erma',
    pred: (h,s,v) => (h>=20 && h<=55 && v>0.28 && s>0.68) || (v>0.965 && s<0.65),
    neck: 6, erode: 1 },
  // 白背板：實測背板 s 只有 0.03~0.04、v 0.89~0.97，門檻可以收得非常緊。
  // 之前用 s<0.18 && v>0.55，把神尊身上偏灰白的部位（銀線繡、珍珠、淺色布）一起判成背景。
  { src: 'DSC05088 (2) (1).jpg', name: 'hero-mazu',
    pred: (h,s,v) => s < 0.10 && v > 0.72,
    neck: 3, erode: 1 },
  // 灰背板：背板是偏藍的灰（h 203~230），神尊整尊是暖色（臉 h42）。
  // 用色相切比用亮度切安全得多——帽尖、扇面、法器都是淺色，用亮度會全部被吃掉。
  // 第二條是給中性灰（飽和度太低時色相不穩）的補漏，門檻抓很緊避免誤傷。
  { src: 'DSC09730.png',         name: 'hero-jigong',
    pred: (h,s,v) => (h>=175 && h<=265 && s<0.18 && v>0.50) || (s<0.04 && v>0.70),
    neck: 3, erode: 1 },
];

(async () => {
  for (const j of JOBS) {
    const tmp = j.name + '-tmp.png';
    // 不用 fgOpen（形態學開運算）：它會刪掉細長的突出物——
    // 濟公手上的法器、帽尖、冠帽流蘇都是那樣被咬掉的。
    await cutout(D + j.src, tmp, { pred: j.pred, neck: j.neck, erode: j.erode, height: 1400 });
    // WebP 是主要格式；PNG 只是給不支援 WebP 透明的舊 Safari 的後備，壓成調色盤省一半
    // 品質 74 是實測的甜蜜點：神尊在 Hero 最多顯示到 700px 高，再高的品質看不出來只是變胖
    await sharp(tmp).webp({ quality: 74, alphaQuality: 82, effort: 6 }).toFile(OUT + j.name + '.webp');
    await sharp(tmp).png({ palette: true, colours: 220, compressionLevel: 9 }).toFile(OUT + j.name + '.png');
    const m = await sharp(tmp).metadata();
    const fs = require('fs');
    console.log(`${j.name}  ${m.width}x${m.height}  webp ${(fs.statSync(OUT+j.name+'.webp').size/1024|0)}KB  png ${(fs.statSync(OUT+j.name+'.png').size/1024|0)}KB`);
  }
  // 金色底圖
  await sharp(D + '新增標題 (3).jpg').jpeg({ quality: 82, mozjpeg: true }).toFile(OUT + 'hero-gold.jpg');
  const fs = require('fs');
  const gm = await sharp(OUT + 'hero-gold.jpg').metadata();
  console.log(`hero-gold.jpg ${gm.width}x${gm.height} ${(fs.statSync(OUT+'hero-gold.jpg').size/1024|0)}KB`);
})();
