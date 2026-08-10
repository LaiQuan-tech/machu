// 重新發布：後台「常見問題」按下按鈕後，觸發 Vercel 重新建置正式站。
//
// ── 為什麼需要 ──
// FAQ 的內容存在資料庫，首頁畫面與送給 Google 的 FAQPage 結構化資料都是執行期產生的，
// 廟方一存檔就會變。但給「不執行 JS 的爬蟲」看的 <noscript> 純文字是 `npm run build`
// 當下抓資料庫的快照，要重新部署才會更新。這支就是讓廟方自己按一下重跑建置。
//
// ── 為什麼要有這支後端，前端不能直接打 Deploy Hook ──
// Deploy Hook 的網址等於「誰拿到誰就能觸發正式站部署」。前端的環境變數
// （VITE_ 開頭）會被 Vite 直接內嵌進 JS 檔案，任何人打開開發者工具都看得到。
// 所以網址只放在伺服器端的 VERCEL_DEPLOY_HOOK_URL（**不加 VITE_ 前綴**），
// 前端只呼叫這個端點。
//
// ── 授權 ──
// 帶上登入者的 Supabase access token，用它去讀 admin_profiles。
// 該表的 RLS 是「只讀得到自己那一列」，所以非管理員一定拿到空陣列 → 403。
// 不自己解 JWT：驗簽章要密鑰，交給 Supabase 判斷比較不會寫錯。

interface ResLike {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
}

interface ReqLike {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

const header = (req: ReqLike, name: string): string => {
  const v = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
};

export default async function handler(req: ReqLike, res: ResLike): Promise<void> {
  if ((req.method || 'GET').toUpperCase() !== 'POST') {
    res.status(405).json({ ok: false, error: '只接受 POST' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;

  if (!supabaseUrl || !anonKey) {
    res.status(500).json({ ok: false, error: '伺服器未設定 Supabase 環境變數' });
    return;
  }
  if (!hook) {
    // 訊息刻意不含網址本身
    res.status(500).json({ ok: false, error: '伺服器未設定 VERCEL_DEPLOY_HOOK_URL' });
    return;
  }

  const auth = header(req, 'authorization');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    res.status(401).json({ ok: false, error: '未登入' });
    return;
  }

  // 是不是管理員：讓 Supabase 的 RLS 回答
  try {
    const check = await fetch(`${supabaseUrl}/rest/v1/admin_profiles?select=user_id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!check.ok) {
      res.status(401).json({ ok: false, error: '登入狀態已失效，請重新登入' });
      return;
    }
    const rows = await check.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(403).json({ ok: false, error: '只有管理員可以重新發布' });
      return;
    }
  } catch (e) {
    res.status(502).json({ ok: false, error: '無法確認管理員身分：' + (e instanceof Error ? e.message : String(e)) });
    return;
  }

  try {
    const r = await fetch(hook, { method: 'POST' });
    if (!r.ok) {
      res.status(502).json({ ok: false, error: `Vercel 回應 ${r.status}` });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
