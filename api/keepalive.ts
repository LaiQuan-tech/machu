// Supabase 保活：由 Vercel Cron 每天呼叫一次。
// 免費方案的 Supabase 專案閒置數日會自動暫停，屆時所有請求變 521，
// 報名表會「靜默停擺」（頁面正常但資料全部抓不到）。每天打一次真實的資料庫查詢即可保持活躍。
//
// 用既有的 SECURITY DEFINER RPC（anon 可呼叫、且會真的查資料庫），
// 不用單純的健康檢查端點——那不一定算資料庫活動。

export default async function handler(_req: unknown, res: any): Promise<void> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    res.status(500).json({ ok: false, error: 'missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY' });
    return;
  }

  const startedAt = Date.now();
  try {
    const r = await fetch(`${url}/rest/v1/rpc/get_booking_session_counts`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const ms = Date.now() - startedAt;
    // 521 = 專案已被暫停（此時仍回報，方便從 Vercel 的 cron 紀錄看出異常）
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, supabaseStatus: r.status, ms });
  } catch (e) {
    res.status(502).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
