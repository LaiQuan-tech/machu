import React from 'react';

/**
 * 金色立體祥雲背景（向量繪製）
 *
 * 不用點陣圖平鋪：小圖平鋪會出現接縫，鏡像拼接又會把雲的形狀切斷、
 * 變成看不出是雲的萬花筒圖樣。這裡把每一朵祥雲畫成完整路徑再手工排版，
 * 任何螢幕尺寸都清晰，整份檔案只有幾 KB。
 *
 * 造型依傳統「如意雲頭」：
 *   雲頭＝一圈向內收的螺旋（如意的卷），雲身＝三團由大到小的圓弧雲朵，
 *   雲尾＝往右拖曳並收細的長尾。
 * 圓弧一律用 SVG 的 A（圓弧）指令而非貝茲曲線硬湊——雲朵要是「正圓的團」，
 * 用曲線逼近容易變成扁扁的肉條，看不出是雲。
 */

/** 單朵祥雲輪廓：座標空間約 340×130，雲頭在左、雲尾往右 */
const CLOUD_BODY =
  'M 14 92 '
  + 'A 46 46 0 0 1 106 92 '     // 雲頭（最大的一團）
  + 'A 38 38 0 0 1 182 92 '     // 第二團
  + 'A 28 28 0 0 1 238 92 '     // 第三團
  + 'C 268 95, 300 103, 332 110 ' // 雲尾上緣，往右拖曳
  + 'C 300 118, 262 118, 236 113 ' // 雲尾下緣回收
  + 'L 62 113 '                  // 雲底
  + 'C 34 113, 14 106, 14 92 Z';

/** 雲頭內的如意卷：由外往內收的螺旋 */
const CLOUD_SPIRAL =
  'M 60 48 '
  + 'C 78 48, 90 62, 90 78 '
  + 'C 90 94, 76 104, 60 104 '
  + 'C 44 104, 32 92, 32 78 '
  + 'C 32 66, 42 56, 54 56 '
  + 'C 66 56, 74 66, 74 76 '
  + 'C 74 86, 66 92, 58 92 '
  + 'C 50 92, 45 86, 45 79';

/** 第二、三團內側的小卷，讓雲身不空 */
const CLOUD_INNER =
  'M 144 60 C 156 60, 163 70, 163 80 C 163 90, 154 96, 146 96 C 138 96, 132 90, 132 82 '
  + 'M 210 72 C 219 72, 224 79, 224 86 C 224 93, 218 97, 212 97';

const Cloud: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <g opacity={opacity}>
    {/* 暗部：整朵往右下偏移，做出厚度 */}
    <path d={CLOUD_BODY} transform="translate(4,6)" fill="#5E430E" opacity="0.5" />
    {/* 主體填色（上亮下暗） */}
    <path d={CLOUD_BODY} fill="url(#cloudFill)" />
    {/* 外輪廓：深金定形 ＋ 亮金高光 */}
    <path d={CLOUD_BODY} fill="none" stroke="#6E4E10" strokeWidth="3" strokeLinejoin="round" />
    <path d={CLOUD_BODY} fill="none" stroke="url(#goldLine)" strokeWidth="1.6" strokeLinejoin="round" />
    {/* 如意卷（雲頭的靈魂，線要夠粗才看得出來） */}
    <path d={CLOUD_SPIRAL} fill="none" stroke="#6E4E10" strokeWidth="3.4" strokeLinecap="round" />
    <path d={CLOUD_SPIRAL} fill="none" stroke="url(#goldLine)" strokeWidth="1.8" strokeLinecap="round" />
    {/* 雲身內卷 */}
    <path d={CLOUD_INNER} fill="none" stroke="#6E4E10" strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
    <path d={CLOUD_INNER} fill="none" stroke="url(#goldLine)" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
  </g>
);

/**
 * 排版：上方遠景小而淡、下方近景大而清楚，做出景深。
 * 位置與大小刻意不成規律，避免又變回「圖樣」的感覺。
 */
const LAYOUT: Array<{ x: number; y: number; s: number; o: number; flip?: boolean }> = [
  // 遠景（上方）：小、淡
  { x: -80, y: 20, s: 0.52, o: 0.30 },
  { x: 330, y: 62, s: 0.44, o: 0.26, flip: true },
  { x: 700, y: 0, s: 0.50, o: 0.28 },
  { x: 1060, y: 55, s: 0.46, o: 0.26, flip: true },
  { x: 1340, y: 10, s: 0.54, o: 0.30 },
  { x: 130, y: 150, s: 0.60, o: 0.34, flip: true },
  { x: 560, y: 175, s: 0.52, o: 0.30 },
  { x: 940, y: 145, s: 0.58, o: 0.32, flip: true },
  { x: 1300, y: 190, s: 0.50, o: 0.30 },
  // 中景
  { x: -140, y: 280, s: 0.86, o: 0.52 },
  { x: 320, y: 300, s: 0.78, o: 0.48, flip: true },
  { x: 760, y: 265, s: 0.90, o: 0.54 },
  { x: 1180, y: 310, s: 0.80, o: 0.50, flip: true },
  { x: 60, y: 420, s: 0.96, o: 0.58, flip: true },
  { x: 620, y: 440, s: 0.88, o: 0.55 },
  { x: 1120, y: 465, s: 1.00, o: 0.60, flip: true },
  // 近景（下方）：大、清楚
  { x: -180, y: 570, s: 1.22, o: 0.80 },
  { x: 350, y: 600, s: 1.15, o: 0.78, flip: true },
  { x: 880, y: 630, s: 1.28, o: 0.82 },
  { x: 1300, y: 590, s: 1.10, o: 0.78, flip: true },
  { x: 0, y: 760, s: 1.42, o: 0.90, flip: true },
  { x: 560, y: 800, s: 1.50, o: 0.92 },
  { x: 1150, y: 790, s: 1.35, o: 0.88, flip: true },
];

const HeroClouds: React.FC<{ className?: string; withGround?: boolean }> = ({ className = '', withGround = true }) => (
  <svg
    className={className}
    viewBox="0 0 1600 900"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      {/* 底色偏亮的赭金：頂部與底部另有 CSS 深色遮罩壓字，這裡不必先壓暗，
          否則兩層相加會讓中段的金也跟著沉下去 */}
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#A87C31" />
        <stop offset="45%" stopColor="#C79A48" />
        <stop offset="100%" stopColor="#9A712A" />
      </linearGradient>
      <linearGradient id="cloudFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#D3A64E" />
        <stop offset="100%" stopColor="#9A7229" />
      </linearGradient>
      <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#EBC876" />
        <stop offset="50%" stopColor="#FFE59A" />
        <stop offset="100%" stopColor="#D8A93F" />
      </linearGradient>
    </defs>

    {/* 當裝飾層用時不畫底色，才能透出頁面本身的米色 */}
    {withGround && <rect width="1600" height="900" fill="url(#ground)" />}

    {LAYOUT.map((c, i) => (
      <g
        key={i}
        transform={`translate(${c.x} ${c.y}) scale(${c.flip ? -c.s : c.s} ${c.s})${c.flip ? ' translate(-340 0)' : ''}`}
      >
        <Cloud opacity={c.o} />
      </g>
    ))}
  </svg>
);

export default HeroClouds;
