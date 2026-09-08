import React, { useEffect, useRef, useState } from 'react';

/**
 * 絲綢反光
 *
 * 實拍的雲龍紋緞面（使用者提供的影片）逐格比對後，關鍵不是「哪裡比較亮」，
 * 而是**紋樣與底子會互換明暗**：某些角度雲紋比底子暗，轉一下雲紋反而比底子亮。
 * 那是織錦的經緯緞面在換面——紋樣與底子用相反的緞紋織成，誰正對光源誰就發亮。
 * 整片提亮／壓暗（先前的做法）原理上做不出這件事。
 *
 * 所以底圖疊第二層同一張圖、套上「只翻亮度不翻色相」的濾鏡，
 * 再用一條柔邊橫帶遮罩決定哪一片顯示翻面版，遮罩隨角度掃過畫面。
 * 濾鏡與遮罩寫在 index.html 的 .silk-flip／.silk-matte／.silk-spec。
 *
 * 「觀看角度」由兩種輸入餵進來，最後都收斂成同一組 -1..1 的座標：
 *   桌機——游標在畫面上的位置（滑鼠移動＝頭在動）
 *   手機——陀螺儀的左右／前後傾角（手在轉＝布在轉）
 * 兩者都沒有時，CSS 的緩慢游移當待機動作，一旦收到任何真實輸入就停掉。
 *
 * 位移只寫進 CSS 變數，緩動交給 CSS transition：
 * 瀏覽器直接在合成層插值，不必自己跑 requestAnimationFrame 迴圈。
 */

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * tone：底圖是哪一種材質。
 *   'silk'（預設）綢緞織錦——有「翻面帶」那一層亮度反轉，因為蠶絲換個角度真的會由亮翻暗。
 *   'gold'         金箔／金漆牆——金屬只有反射強弱，沒有翻面。亮度反轉疊在金黃上會變橄欖綠，
 *                  所以這個模式關掉翻面層，只留光帶與背光（樣式見 index.html 的 .silk-gold）。
 *   'flat'         完全不反光，只鋪底圖。水墨、流體畫這類本來就沒有金屬或緞面光澤的材質，
 *                  加上會動的光帶只會像鏡頭髒了。這個模式連事件監聽與動畫迴圈都不掛，
 *                  不是把效果調到看不見而已。
 */
interface SilkSheenProps { src: string; className?: string; tone?: 'silk' | 'gold' | 'flat' }

const SilkSheen: React.FC<SilkSheenProps> = ({ src, className = '', tone = 'silk' }) => {
  const ref = useRef<HTMLDivElement>(null);
  // 收到第一筆真實輸入後就關掉待機游移，避免自動動作與使用者的操作打架
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // flat 不反光：直接不掛 pointermove／陀螺儀與 rAF 迴圈
    if (tone === 'flat') return;

    let engaged = false;
    let frame = 0;
    let lastTime = performance.now();
    let visible = true;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    /**
     * 不直接把每一筆 pointermove 寫進 CSS transition。
     * 高頻輸入反覆重啟 transition 會讓光帶先停頓再追趕，看起來像黏住滑鼠。
     * 改用時間一致的阻尼，每一幀只靠近目標一小段；60Hz／120Hz 螢幕手感一致。
     */
    const animate = (now: number): void => {
      const dt = Math.min(40, now - lastTime);
      lastTime = now;
      const ease = 1 - Math.exp(-dt / 115);
      currentX += (targetX - currentX) * ease;
      currentY += (targetY - currentY) * ease;
      el.style.setProperty('--silk-x', currentX.toFixed(4));
      el.style.setProperty('--silk-y', currentY.toFixed(4));
      // 同一組阻尼座標也餵給 Hero 前景，讓神像與光澤共享同一個觀看角度。
      // 前景只取幾個像素的位移，不會跟著游標大幅漂移。
      el.parentElement?.style.setProperty('--hero-x', currentX.toFixed(4));
      el.parentElement?.style.setProperty('--hero-y', currentY.toFixed(4));
      el.parentElement?.style.setProperty('--hero-shift-x', `${(currentX * -8).toFixed(2)}px`);
      el.parentElement?.style.setProperty('--hero-shift-y', `${(currentY * -5).toFixed(2)}px`);
      frame = requestAnimationFrame(animate);
    };
    const startAnimation = (): void => {
      if (!engaged || frame || !visible || document.hidden) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(animate);
    };
    startAnimation();

    const setAngle = (x: number, y: number): void => {
      // 中央留一點安定區，避免手持裝置的微小抖動讓綢面不停顫動。
      const settle = (v: number): number => Math.abs(v) < 0.035 ? 0 : v;
      targetX = settle(clamp(x, -1, 1));
      targetY = settle(clamp(y, -1, 1));
    };
    const engage = (): void => {
      if (engaged) return;
      engaged = true;
      setLive(true);
      startAnimation();
    };

    // ── 唯一的輸入來源：游標位置（桌機）──
    // 手機的陀螺儀版本已於 2026-09-02 移除（廟方：「那個就是好玩，但沒意義」）。
    // 觸控裝置因此不會 engage，整個 rAF 迴圈不會啟動，Hero 背景維持靜態——
    // 這也順便省掉手機的持續運算與耗電。
    const onPointerMove = (e: PointerEvent): void => {
      // 觸控裝置的手指移動也會發 pointermove，但那是捲動，不該當成轉動視角
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      // Hero 捲出畫面後就別再算了，值再怎麼變也沒人看得到
      if (r.height <= 0 || r.bottom <= 0) return;
      engage();
      setAngle(
        (e.clientX / window.innerWidth) * 2 - 1,
        ((e.clientY - r.top) / r.height) * 2 - 1,
      );
    };
    // 游標離開視窗就回正，明暗分界緩緩滑回中央而不是卡在邊緣
    const onPointerOut = (e: PointerEvent): void => {
      if (e.relatedTarget === null) setAngle(0, 0);
    };

    // Hero 離開畫面或分頁切到背景後暫停逐幀運算；回來時再從當前位置續接。
    // 這能避免使用者已經在閱讀下方內容，首頁仍長時間占用 CPU／電量。
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startAnimation();
      else if (frame) { cancelAnimationFrame(frame); frame = 0; }
    }, { threshold: 0.01 });
    observer.observe(el);

    const onVisibilityChange = (): void => {
      if (document.hidden) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      } else {
        startAnimation();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerout', onPointerOut, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [tone]);

  if (tone === 'flat') {
    return (
      <div ref={ref} className={`silk-stage ${className}`} aria-hidden="true">
        <img className="silk-base" src={src} alt="" />
      </div>
    );
  }

  return (
    <div ref={ref} className={`silk-stage ${tone === 'gold' ? 'silk-gold' : ''} ${live ? 'silk-live' : ''} ${className}`} aria-hidden="true">
      {/* 底圖與翻面層必須是同一個 src、同一組座標，差一點點邊界就會出現重影，
          所以兩張都由這個元件自己畫，不讓呼叫端分開放。 */}
      <img className="silk-base" src={src} alt="" />
      {/* 疊法：先讓背光那一面沉下去，再蓋上翻面帶，最後補鏡面高光核心 */}
      <div className="silk-matte" />
      <div className="silk-flip">
        <div className="silk-flip-inner">
          <img className="silk-flip-img" src={src} alt="" />
        </div>
      </div>
      <div className="silk-spec" />
    </div>
  );
};

export default SilkSheen;
