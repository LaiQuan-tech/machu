import { trackLineClick, DEFAULT_SOCIAL } from './supabase';

/**
 * LINE 官方帳號的網址與導流統計，集中在這裡。
 *
 * 為什麼要獨立一個模組：這個網址與統計同時被 App.tsx、法會報名表、志工報名表用到，
 * 而報名表是獨立元件、拿不到 App 的 state。之前 App.tsx 自己留一份快取，
 * 結果報名表裡的三個連結各自寫死 `https://lin.ee/…`——**既不計入統計，
 * 後台改網址時也不會跟著換**。放在模組層級，三邊共用同一份。
 *
 * 網址由後台「社群帳號設定」載入後灌進來；還沒載到（或載失敗）時用預設值，
 * 所以任何時候點下去都連得到，不會出現空連結。
 */
let lineUrl = DEFAULT_SOCIAL.lineUrl;

/** 後台設定載入後呼叫，更新共用的網址 */
export const setLineUrl = (url: string): void => {
  lineUrl = url.trim() || DEFAULT_SOCIAL.lineUrl;
};

/** 給 <a href> 用 */
export const getLineUrl = (): string => lineUrl;

/**
 * 記一次點擊。source 是入口代號，後台靠它分辨哪個位置有效。
 * 刻意不 await：統計失敗不能擋住使用者開 LINE。
 * 用在 <a target="_blank"> 的 onClick 上是安全的——新分頁不會卸載本頁，
 * 送出的請求會照常完成。
 */
export const trackLine = (source: string): void => {
  trackLineClick(source).catch(() => {});
};

/** 給按鈕用：記錄後直接開新分頁 */
export const openLine = (source: string): void => {
  trackLine(source);
  window.open(lineUrl, '_blank', 'noopener,noreferrer');
};
