import React from 'react';

/**
 * 祥雲底圖裝飾層
 *
 * 廟方提供的金色祥雲圖樣（八款），去背後散佈在頁面底層。
 * 用真實圖樣而不是自己畫的向量——手繪的雲怎麼調都不像正統的如意雲頭。
 *
 * 這一層是 position:fixed：內容整片往上捲、它幾乎不動，速度差就是視差最強的形式。
 * 每朵再給不同的 depth，捲動時各自以不同速率微幅位移，做出遠近層次。
 *
 * 深色底的區域（頁尾）不要用：金線在深色上會變成髒污的一片，看起來像壓壞的印刷。
 */

interface CloudSpot {
  /** 第幾款雲（1–8） */
  n: number;
  /** 位置與大小，用視窗百分比，換螢幕尺寸才會等比縮放 */
  left: string;
  top: string;
  width: string;
  opacity: number;
  /** 位移速率：數字越大跑得越快（越靠近觀看者） */
  depth: number;
  flip?: boolean;
}

/**
 * 佈局刻意不規律：等距排列會立刻被看成「圖樣」而不是「雲」。
 * 左右邊緣放大朵、中段放小朵，中央留白讓文字好讀。
 */
const SPOTS: CloudSpot[] = [
  { n: 1, left: '-6%',  top: '4%',   width: '30%', opacity: 0.20, depth: 0.10 },
  { n: 4, left: '68%',  top: '10%',  width: '26%', opacity: 0.16, depth: 0.16, flip: true },
  { n: 6, left: '-4%',  top: '38%',  width: '24%', opacity: 0.14, depth: 0.22 },
  { n: 2, left: '74%',  top: '46%',  width: '28%', opacity: 0.18, depth: 0.08 },
  { n: 7, left: '8%',   top: '70%',  width: '22%', opacity: 0.13, depth: 0.18, flip: true },
  { n: 5, left: '62%',  top: '78%',  width: '30%', opacity: 0.16, depth: 0.12 },
  { n: 3, left: '36%',  top: '22%',  width: '18%', opacity: 0.10, depth: 0.26 },
  { n: 8, left: '30%',  top: '88%',  width: '20%', opacity: 0.12, depth: 0.20, flip: true },
];

const CloudBackdrop: React.FC = () => (
  <div className="page-backdrop" aria-hidden="true">
    {SPOTS.map((c, i) => (
      <img
        key={i}
        src={`/cloud-${c.n}.png`}
        alt=""
        // 固定滿版圖層，八朵雲永遠在可視範圍內，lazy 只會讓它們慢一拍才出現
        loading="eager"
        className="cloud-piece"
        style={{
          left: c.left,
          top: c.top,
          width: c.width,
          opacity: c.opacity,
          transform: c.flip ? 'scaleX(-1)' : undefined,
          ['--cloud-depth' as string]: c.depth,
          ['--cloud-flip' as string]: c.flip ? -1 : 1,
        }}
      />
    ))}
  </div>
);

export default CloudBackdrop;
