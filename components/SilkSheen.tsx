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

/** iOS 13+ 要求陀螺儀必須在使用者手勢裡申請權限，標準型別沒有涵蓋這個方法 */
interface OrientationPermission {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
}

type OrientationApi = typeof DeviceOrientationEvent & OrientationPermission;

const orientationApi = (): OrientationApi | undefined =>
  typeof window === 'undefined' ? undefined : (window.DeviceOrientationEvent as OrientationApi | undefined);

/** 有 requestPermission ＝ iOS 13+：支援陀螺儀，但要先問過使用者 */
export const tiltNeedsPermission = (): boolean => typeof orientationApi()?.requestPermission === 'function';

/** 提示鈕拿到權限後用這個事件通知光澤層開始聽陀螺儀，省去為兩個相鄰元件架 Context */
const TILT_GRANTED = 'silk:tilt-granted';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * 手機自然握持約前傾 45 度，以此為中位。
 * 左右（gamma）與前後（beta）的滿幅刻意不同：轉手腕的幅度本來就比抬手小，
 * 兩者都用 ±45 度的話，左右方向會像沒反應。實際握著轉，左右約 ±28 度就到底了。
 */
const TILT_NEUTRAL_DEG = 45;
const TILT_GAMMA_RANGE_DEG = 28;
const TILT_BETA_RANGE_DEG = 38;

/**
 * tone：底圖是哪一種材質。
 *   'silk'（預設）綢緞織錦——有「翻面帶」那一層亮度反轉，因為蠶絲換個角度真的會由亮翻暗。
 *   'gold'         金箔／金漆牆——金屬只有反射強弱，沒有翻面。亮度反轉疊在金黃上會變橄欖綠，
 *                  所以這個模式關掉翻面層，只留光帶與背光（樣式見 index.html 的 .silk-gold）。
 */
interface SilkSheenProps { src: string; className?: string; tone?: 'silk' | 'gold' }

const SilkSheen: React.FC<SilkSheenProps> = ({ src, className = '', tone = 'silk' }) => {
  const ref = useRef<HTMLDivElement>(null);
  // 收到第一筆真實輸入後就關掉待機游移，避免自動動作與使用者的操作打架
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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

    // ── 桌機：游標位置 ──
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

    // ── 手機：陀螺儀 ──
    const onOrientation = (e: DeviceOrientationEvent): void => {
      if (e.gamma === null && e.beta === null) return;
      engage();
      setAngle(
        (e.gamma ?? 0) / TILT_GAMMA_RANGE_DEG,
        ((e.beta ?? TILT_NEUTRAL_DEG) - TILT_NEUTRAL_DEG) / TILT_BETA_RANGE_DEG,
      );
    };
    const listenToTilt = (): void => window.addEventListener('deviceorientation', onOrientation);

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

    // Android 與桌機瀏覽器直接掛就有值；iOS 要等使用者按下提示鈕拿到權限後才通知我們。
    if (orientationApi() && !tiltNeedsPermission()) listenToTilt();
    window.addEventListener(TILT_GRANTED, listenToTilt);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener(TILT_GRANTED, listenToTilt);
    };
  }, []);

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

/** 傾斜手機的小圖示：一支微微左右擺動的手機，示意「轉動裝置」。全站不用 emoji，所以自己畫 */
const TiltIcon: React.FC = () => (
  <svg className="silk-tip-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="7" y="2.5" width="10" height="19" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M10.6 18.6h2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M3.4 8.6a7.4 7.4 0 0 0 0 6.8M20.6 8.6a7.4 7.4 0 0 1 0 6.8"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
  </svg>
);

/**
 * 傾斜提示鈕（只在 iOS 出現）
 *
 * iOS 13+ 規定陀螺儀權限必須在使用者手勢裡申請，網頁載入時要不到。
 * 之前把申請掛在「點 Hero 空白處」，結果是多數人不會去點，等於沒開；
 * 改成一顆講明白的提示鈕，按下去就是明確的手勢，權限也拿得到。
 * 非 iOS 不會出現這顆鈕——那些瀏覽器本來就直接有陀螺儀，多一句提示只是雜訊。
 */
export const SilkTiltPrompt: React.FC<{ className?: string }> = ({ className = '' }) => {
  // 先渲染成不顯示，掛載後再判斷：伺服器端與首次渲染都摸不到 window
  const [show, setShow] = useState(false);

  useEffect(() => { setShow(tiltNeedsPermission()); }, []);

  if (!show) return null;

  const ask = (): void => {
    // 不論准或不准都把提示收起來：准了就看得到效果，不准也不該一直杵在那裡問
    setShow(false);
    orientationApi()?.requestPermission?.()
      .then((state) => { if (state === 'granted') window.dispatchEvent(new Event(TILT_GRANTED)); })
      .catch(() => { /* 環境不支援：維持待機游移即可，不打擾 */ });
  };

  return (
    <button
      type="button"
      onClick={ask}
      className={`silk-tip pointer-events-auto inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium tracking-wide whitespace-nowrap ${className}`}
    >
      <TiltIcon />
      傾斜手機，看綢緞反光
    </button>
  );
};

export default SilkSheen;
