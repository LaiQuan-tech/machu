import React, { useEffect, useRef } from 'react';
import { AnalyticsSettings } from '../types';
import { getAnalyticsSettings } from '../services/supabase';

/**
 * 追蹤碼掛載（GA4／Meta 像素／GTM）
 *
 * 設定放在後台（site_settings 表），這裡只依「編號」用官方標準寫法組出腳本。
 * 刻意不讓後台貼整段 <script>：那等於後台一被盜就能對所有訪客植入任意腳本。
 *
 * 因為要讀資料庫，腳本會比寫死在 index.html 晚幾百毫秒才載入。
 * 對宮廟網站的流量分析而言可以接受，換得的是廟方自己就能換編號、不必找工程師。
 */

// 編號格式檢查：擋掉貼錯欄位或整段程式碼的情況
const RE_GA4 = /^G-[A-Z0-9]{6,}$/i;
const RE_GTM = /^GTM-[A-Z0-9]{5,}$/i;
const RE_PIXEL = /^\d{10,20}$/;

export const isValidGa4 = (v: string): boolean => RE_GA4.test(v.trim());
export const isValidGtm = (v: string): boolean => RE_GTM.test(v.trim());
export const isValidPixel = (v: string): boolean => RE_PIXEL.test(v.trim());

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string };
    _fbq?: unknown;
  }
}

const appendScript = (src: string, async = true): void => {
  const s = document.createElement('script');
  s.async = async;
  s.src = src;
  document.head.appendChild(s);
};

const loadGa4 = (id: string): void => {
  window.dataLayer = window.dataLayer || [];
  // 用 arguments 物件推進 dataLayer 是 gtag 的官方寫法，不可改成展開陣列
  function gtag(...args: unknown[]) { window.dataLayer!.push(args); }
  window.gtag = gtag;
  gtag('js', new Date());
  // SPA 自行送 page_view：預設的自動送出只會在首次載入觸發，換分頁不會再送
  gtag('config', id, { send_page_view: false });
  appendScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
};

const loadGtm = (id: string): void => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  appendScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`);
};

const loadMetaPixel = (id: string): void => {
  if (window.fbq) return;
  const n: any = function (...args: unknown[]) {
    n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
  };
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  window.fbq = n;
  window._fbq = n;
  appendScript('https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', id);
};

interface AnalyticsProps {
  /** 目前頁面路徑；變動時補送一次 page_view（SPA 換頁不會自動送） */
  path: string;
}

const Analytics: React.FC<AnalyticsProps> = ({ path }) => {
  const loadedRef = useRef(false);
  const settingsRef = useRef<AnalyticsSettings | null>(null);
  const firstViewRef = useRef(true);
  // 設定是非同步讀回來的，屆時要送的是「當下的頁面代稱」而不是掛載當時的。
  // 用 ref 而非 window.location.pathname——法會報名表與聖母經沒有自己的網址，
  // 直接讀網址會把它們全部記成 "/"，報表就分不出訪客到底看了哪一頁。
  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    let cancelled = false;
    getAnalyticsSettings().then((s) => {
      if (cancelled) return;
      settingsRef.current = s;
      if (isValidGtm(s.gtmId)) loadGtm(s.gtmId);
      if (isValidGa4(s.ga4Id)) loadGa4(s.ga4Id);
      if (isValidPixel(s.metaPixelId)) loadMetaPixel(s.metaPixelId);
      // 設定讀回來時通常已經錯過第一次 path effect，這裡補送首次瀏覽
      sendPageView(pathRef.current);
      firstViewRef.current = false;
    });
    return () => { cancelled = true; };
  }, []);

  const sendPageView = (p: string): void => {
    const s = settingsRef.current;
    if (!s) return;
    if (isValidGa4(s.ga4Id) && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: p,
        page_location: window.location.origin + p,
        page_title: document.title,
      });
    }
    if (isValidPixel(s.metaPixelId) && window.fbq) window.fbq('track', 'PageView');
    if (isValidGtm(s.gtmId) && window.dataLayer) {
      window.dataLayer.push({ event: 'spa_page_view', page_path: p });
    }
  };

  useEffect(() => {
    // 首次瀏覽交給上面的載入流程送，這裡只負責之後的換頁
    if (firstViewRef.current) return;
    sendPageView(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return null;
};

export default Analytics;
