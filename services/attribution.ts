/**
 * 來源歸因（UTM）與換頁時的網址參數規則
 *
 * **為什麼要另外存一份 UTM**：站內換頁一律推「純路徑」（goToPage／openFahui／
 * openScripture 都是），query string 會整串從網址上消失。所以等到送出報名時
 * 再去讀 `location.search` 幾乎一定是空的——UTM 必須在進站那一刻就收下來。
 *
 * **為什麼用 sessionStorage 不用 localStorage**：UTM 描述的是「這一次來訪」。
 * 放進 localStorage 會讓三個月前那檔活動的來源黏在同一台裝置上，之後每一筆
 * 報名都算給那一檔，統計會失真。分頁關掉就該忘記，這正是 sessionStorage 的語意。
 *
 * **刻意不動網址列**：進站那一頁的網址保持原樣（含 UTM），因為 GA4／GTM 在
 * 初始化時會讀真實的 `document.location`。若一載入就把 UTM 清掉，改天廟方把
 * GA4 掛進 GTM 容器（而不是後台那個欄位），歸因就會整個失效。UTM 是在
 * 「第一次站內換頁」時才從網址上拿掉的（見 withKeptParams）。
 */

/** 標準的五個 UTM 參數。目前只用前三個，另外兩個一併收下以免日後改欄位 */
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/**
 * 換頁時要從網址上拿掉的參數。
 *
 * utm_* 只服務「進站那一次」，留在網址上會被信眾連同 UTM 一起轉分享出去，
 * 別人的來源就被記成第一個人的。fbclid／gclid 是平台自己黏上來的，同理。
 *
 * 功能性參數（share／preview／admin／volunteer）**不在此列，要保留**——
 * 它們原本會跟著被洗掉，那是既有的 bug：揪團連結進站後點一下導覽，
 * `?share=` 就沒了，重新整理便找不回那場共享報名。
 */
const DROP_ON_NAV: readonly string[] = [...UTM_KEYS, 'fbclid', 'gclid'];

const STORAGE_KEY = 'heshengtan_utm_v1';

/**
 * 讀出這次來訪的 UTM。網址上有就用網址上的（後來的活動蓋掉先前的，
 * 與 GA4 的 last-click 一致），沒有才回頭拿這個分頁先前存下的。
 */
const readEntryUtm = (): string => {
  if (typeof window === 'undefined') return '';
  const search = new URLSearchParams(window.location.search);
  const picked = new URLSearchParams();
  // 依 UTM_KEYS 的順序組，字串才穩定（之後要拿來比對或存進資料庫）
  for (const key of UTM_KEYS) {
    const value = search.get(key);
    if (value) picked.set(key, value);
  }
  const fromUrl = picked.toString();
  if (fromUrl) {
    // 無痕模式／關閉儲存空間時 setItem 會丟例外，不能讓它擋住頁面
    try { sessionStorage.setItem(STORAGE_KEY, fromUrl); } catch { /* 存不了就只用這一頁 */ }
    return fromUrl;
  }
  try { return sessionStorage.getItem(STORAGE_KEY) ?? ''; } catch { return ''; }
};

/** 進站當下的 UTM，形如 `utm_source=line&utm_medium=broadcast`；沒有就是空字串 */
const entryUtm = readEntryUtm();

/**
 * 給 GA4 的 `page_location` 用：進站那一次要帶 UTM，GA4 才有東西可以歸因。
 * 回傳含「?」的片段或空字串，直接串在路徑後面即可。
 */
export const getEntryUtmQuery = (): string => (entryUtm ? `?${entryUtm}` : '');

/** 這次來訪有沒有帶 UTM（之後把來源存進報名紀錄時會用到） */
export const hasEntryUtm = (): boolean => entryUtm !== '';

/**
 * 換頁推網址時用：把目前網址上「該保留的」參數接回新路徑後面。
 *
 * @param path      要推的路徑，例如 `/lamps`
 * @param alsoDrop  除了 DROP_ON_NAV 之外還要拿掉的參數。
 *                  closeVolunteer 必須拿掉 `volunteer`——`isVolunteerUrl()`
 *                  認得 `?volunteer`，留著等於沒關掉。
 */
export const withKeptParams = (path: string, alsoDrop: readonly string[] = []): string => {
  if (typeof window === 'undefined') return path;
  const params = new URLSearchParams(window.location.search);
  for (const key of DROP_ON_NAV) params.delete(key);
  for (const key of alsoDrop) params.delete(key);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};
