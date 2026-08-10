-- ═══════════════════════════════════════════════════════════════════
-- 主官網 RLS 全面收緊（上線前必修 #1）
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案（可重複執行）
--
-- 原則：
--   anon（訪客）    ：公開內容可讀；報名/捐款表單只能「寫入」，不能讀取
--   authenticated  ：會員可讀「自己電話」的紀錄、管理自己的個人資料與通訊錄
--   admin          ：admin_profiles 名單內的帳號可完整讀寫（後台）
--   統計數字（場次名額、供品認領數、修復累計）走 SECURITY DEFINER RPC，
--   讓訪客只拿得到「數字」而非整筆個資。
-- ═══════════════════════════════════════════════════════════════════

-- ── 輔助函式 ─────────────────────────────────────────────────────────

-- 是否為後台管理員（SECURITY DEFINER：繞過 admin_profiles 自身的 RLS）
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()); $$;

-- 目前登入會員在 member_profiles 登記的電話（用於「只能看自己的紀錄」）
CREATE OR REPLACE FUNCTION public.my_phone() RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT phone FROM public.member_profiles WHERE user_id = auth.uid() LIMIT 1; $$;

-- ── 統計 RPC（anon 可呼叫，只回傳數字） ──────────────────────────────

-- 各問事場次已報名人數（排除已取消）
CREATE OR REPLACE FUNCTION public.get_booking_session_counts()
RETURNS TABLE(session_id text, cnt bigint)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT b.session_id::text, count(*)::bigint
  FROM public.bookings b
  WHERE b.session_id IS NOT NULL AND b.status <> '已取消'
  GROUP BY b.session_id;
$$;

-- 各修復專案累計捐款
CREATE OR REPLACE FUNCTION public.get_repair_totals()
RETURNS TABLE(repair_project_id text, total bigint)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT d.repair_project_id::text, coalesce(sum(d.amount), 0)::bigint
  FROM public.donations d
  WHERE d.repair_project_id IS NOT NULL
  GROUP BY d.repair_project_id;
$$;

-- 祈福活動報名統計：各方案人數 + 各供品認領數（排除已取消）
CREATE OR REPLACE FUNCTION public.get_blessing_event_stats(p_event_id uuid)
RETURNS json
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT json_build_object(
    'package_counts', coalesce((
      SELECT json_object_agg(t.pkg, t.n) FROM (
        SELECT package_name AS pkg, count(*) AS n
        FROM public.blessing_registrations
        WHERE event_id = p_event_id AND package_name IS NOT NULL AND status <> '已取消'
        GROUP BY package_name
      ) t), '{}'::json),
    'offering_counts', coalesce((
      SELECT json_object_agg(t2.oid, t2.n) FROM (
        SELECT o->>'id' AS oid, count(*) AS n
        FROM public.blessing_registrations r
        CROSS JOIN LATERAL jsonb_array_elements(coalesce(r.claimed_offerings, '[]'::jsonb)) AS o
        WHERE r.event_id = p_event_id AND r.status <> '已取消'
        GROUP BY o->>'id'
      ) t2), '{}'::json)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_session_counts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_repair_totals() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_blessing_event_stats(uuid) TO anon, authenticated;

-- ── 公開內容表：任何人可讀，管理員可寫 ────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bulletins', 'site_images', 'hero_slides', 'deities', 'deity_halls',
    'scripture_verses', 'lamp_service_configs', 'blessing_events',
    'repair_projects', 'booking_sessions'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "public_read_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "public_read_%s" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "admin_all_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "admin_all_%s" ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);
  END LOOP;
END $$;

-- ── 報名／捐款表：訪客與會員可寫入；會員讀自己的、管理員全權 ─────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bookings', 'donations', 'lamp_registrations', 'blessing_registrations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "anyone_insert_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "anyone_insert_%s" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "member_read_own_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "member_read_own_%s" ON public.%I FOR SELECT TO authenticated USING (public.is_admin() OR (phone IS NOT NULL AND phone = public.my_phone()))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "admin_write_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "admin_write_%s" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "admin_delete_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "admin_delete_%s" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t, t);
  END LOOP;
END $$;

-- 公佈欄活動報名（前台目前未使用，但保持一致的安全設定）
ALTER TABLE public.bulletin_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_insert_bulletin_registrations" ON public.bulletin_registrations;
CREATE POLICY "anyone_insert_bulletin_registrations" ON public.bulletin_registrations
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_all_bulletin_registrations" ON public.bulletin_registrations;
CREATE POLICY "admin_all_bulletin_registrations" ON public.bulletin_registrations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 會員個人資料：本人管理自己的，管理員可讀寫 ───────────────────────────
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_all_member_profiles" ON public.member_profiles;
CREATE POLICY "own_all_member_profiles" ON public.member_profiles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "admin_all_member_profiles" ON public.member_profiles;
CREATE POLICY "admin_all_member_profiles" ON public.member_profiles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.member_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_all_member_contacts" ON public.member_contacts;
CREATE POLICY "own_all_member_contacts" ON public.member_contacts
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "admin_all_member_contacts" ON public.member_contacts;
CREATE POLICY "admin_all_member_contacts" ON public.member_contacts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── LINE 導流統計：任何人可寫入點擊，只有管理員可讀 ─────────────────────
ALTER TABLE public.line_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_insert_line_clicks" ON public.line_clicks;
CREATE POLICY "anyone_insert_line_clicks" ON public.line_clicks
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_read_line_clicks" ON public.line_clicks;
CREATE POLICY "admin_read_line_clicks" ON public.line_clicks
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── 揪團（capability 模式）：任何人可「建立」場次與新增名單；
--    「讀取／送出」須知道場次 UUID（分享連結即權限），走 SECURITY DEFINER RPC，
--    不開放整表查詢，避免個資外洩。 ─────────────────────────────────────
ALTER TABLE public.shared_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_shared_sessions" ON public.shared_sessions;
CREATE POLICY "admin_all_shared_sessions" ON public.shared_sessions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "anyone_insert_shared_sessions" ON public.shared_sessions;
CREATE POLICY "anyone_insert_shared_sessions" ON public.shared_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE public.shared_session_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_shared_session_entries" ON public.shared_session_entries;
CREATE POLICY "admin_all_shared_session_entries" ON public.shared_session_entries
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "anyone_insert_shared_session_entries" ON public.shared_session_entries;
CREATE POLICY "anyone_insert_shared_session_entries" ON public.shared_session_entries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 以 UUID 讀取單一場次（含名單）
CREATE OR REPLACE FUNCTION public.get_shared_session(p_id uuid)
RETURNS json
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT json_build_object(
    'session', row_to_json(s),
    'entries', coalesce((
      SELECT json_agg(row_to_json(e) ORDER BY e.created_at)
      FROM public.shared_session_entries e WHERE e.session_id = s.id
    ), '[]'::json)
  )
  FROM public.shared_sessions s WHERE s.id = p_id;
$$;

-- 以 UUID 將場次標記為已送出
CREATE OR REPLACE FUNCTION public.mark_shared_session_submitted(p_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.shared_sessions SET status = 'submitted' WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_session(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_shared_session_submitted(uuid) TO anon, authenticated;

-- ── 法會報名表：收緊原本「任何登入者可讀寫」為「僅管理員」 ─────────────────
-- 送出（INSERT）須同時開放 anon 與 authenticated：法會表是 showFahui 的落地頁，
-- 已登入管理員也可能直接在此送出報名；舊政策只給 anon 會讓登入者送出被 RLS 擋掉。
DROP POLICY IF EXISTS "anon_insert_fahui" ON public.fahui_registrations;
CREATE POLICY "anon_insert_fahui" ON public.fahui_registrations
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_select_fahui" ON public.fahui_registrations;
CREATE POLICY "auth_select_fahui" ON public.fahui_registrations
  FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "auth_update_fahui" ON public.fahui_registrations;
CREATE POLICY "auth_update_fahui" ON public.fahui_registrations
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "auth_delete_fahui" ON public.fahui_registrations;
CREATE POLICY "auth_delete_fahui" ON public.fahui_registrations
  FOR DELETE TO authenticated USING (public.is_admin());
