import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { submitVolunteerRegistration } from '../services/supabase';
import { getLineUrl, trackLine } from '../services/lineLink';
import BirthDatePicker from './BirthDatePicker';

// ── 草稿與預填 ────────────────────────────────────────────────────────────────
const VOL_DRAFT_KEY = 'volunteer_registration_draft_v1';
const FAHUI_DRAFT_KEY = 'fahui_registration_draft_v1';

const safeParse = (key: string): any => {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
};

interface Contact {
  name: string;
  phone: string;
  address: string;
  diet: string;      // 葷食／素食（必選）
  birthDate: string;
  zodiac: string;
  lineId: string;
}

const BLANK: Contact = { name: '', phone: '', address: '', diet: '', birthDate: '', zodiac: '', lineId: '' };

const DIET_OPTIONS = ['葷食', '素食'];

// 出勤時段矩陣（3 天 × 4 時段）
const VOL_DAYS = [
  { key: '9/11', label: '9/11（五）' },
  { key: '9/12', label: '9/12（六）' },
  { key: '9/13', label: '9/13（日）' },
];
const VOL_SLOTS = [
  { key: '全天', time: '08:00–24:00' },
  { key: '上午場', time: '08:00–12:30' },
  { key: '下午場', time: '13:00–21:00' },
  { key: '清消場', time: '21:00–24:00' },
];

const inputCls =
  'w-full rounded-lg border border-[#C49820]/40 bg-white/80 px-3 py-2.5 text-sm text-[#2E2A22] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C49820]/40 focus:border-[#C49820] transition-all';

// ── 元件 ──────────────────────────────────────────────────────────────────────

interface VolunteerRegistrationProps {
  onBack?: () => void;
  /** 從法會報名表帶過來的已填聯絡資料（點「我要報名志工」時傳入） */
  prefill?: Partial<Contact>;
}

export default function VolunteerRegistration({ onBack, prefill }: VolunteerRegistrationProps) {
  // 預填 precedence：法會連結帶來的最新資料 > 志工自己的草稿 > 法會草稿 > 空白
  // 聯絡欄位可從法會帶入；出勤時段是志工專屬，只從志工草稿還原。
  const { initial, initAvail, initNote, source } = useMemo(() => {
    const hasVal = (o: any) => o && (o.name || o.phone || o.address);
    const vol = safeParse(VOL_DRAFT_KEY);
    const volContact = vol?.contact ?? vol;   // 相容舊草稿（舊版直接存 contact）
    const av = (vol?.availability && typeof vol.availability === 'object') ? vol.availability : {};
    const note = typeof vol?.availabilityNote === 'string' ? vol.availabilityNote : '';
    if (hasVal(prefill)) return { initial: { ...BLANK, ...prefill }, initAvail: av, initNote: note, source: 'fahui' as const };
    if (hasVal(volContact)) return { initial: { ...BLANK, ...volContact }, initAvail: av, initNote: note, source: 'vol' as const };
    const fahui = safeParse(FAHUI_DRAFT_KEY)?.contact;
    if (hasVal(fahui)) return { initial: { ...BLANK, ...fahui }, initAvail: {}, initNote: '', source: 'fahui' as const };
    return { initial: BLANK, initAvail: {}, initNote: '', source: 'none' as const };
  }, []);

  const [contact, setContact] = useState<Contact>(initial);
  const [availability, setAvailability] = useState<Record<string, string[]>>(initAvail);
  const [availabilityNote, setAvailabilityNote] = useState<string>(initNote);
  const [showPrefillHint, setShowPrefillHint] = useState(source !== 'none');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // 自動暫存
  useEffect(() => {
    const hasContent = contact.name || contact.phone || contact.address || contact.lineId || contact.birthDate
      || Object.keys(availability).length || availabilityNote;
    try {
      if (hasContent) localStorage.setItem(VOL_DRAFT_KEY, JSON.stringify({ contact, availability, availabilityNote }));
    } catch { /* ignore */ }
  }, [contact, availability, availabilityNote]);

  const clearDraft = () => { try { localStorage.removeItem(VOL_DRAFT_KEY); } catch { /* ignore */ } };

  const toggleSlot = (day: string, slot: string) => {
    setAvailability(prev => {
      const cur = prev[day] || [];
      let next: string[];
      if (cur.includes(slot)) {
        next = cur.filter(s => s !== slot);            // 取消勾選
      } else if (slot === '全天') {
        next = ['全天'];                                // 選「全天」→ 清掉單一時段
      } else {
        next = [...cur.filter(s => s !== '全天'), slot]; // 選單一時段 → 清掉「全天」
      }
      const out = { ...prev };
      if (next.length) out[day] = next; else delete out[day];
      return out;
    });
  };

  const resetForm = () => {
    clearDraft();
    setContact(BLANK);
    setAvailability({});
    setAvailabilityNote('');
    setShowPrefillHint(false);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setError('');
    if (!contact.name.trim() || !contact.phone.trim() || !contact.address.trim()) {
      setError('請填寫姓名、電話及通訊地址');
      return;
    }
    if (!contact.diet) {
      setError('請選擇用餐習慣（葷食或素食）');
      return;
    }
    const hasAvailability = Object.keys(availability).some(day => (availability[day] ?? []).length > 0);
    if (!hasAvailability && !availabilityNote.trim()) {
      setError('請至少選擇一個可出勤時段，或填寫其他時段說明');
      return;
    }
    const phoneDigits = contact.phone.replace(/\D/g, '');
    if (!/^0\d{8,9}$/.test(phoneDigits)) {
      setError('請填寫正確的電話號碼（例：0912345678 或 02-12345678）');
      return;
    }
    setSubmitting(true);
    try {
      await submitVolunteerRegistration({
        name: contact.name.trim(),
        phone: contact.phone.trim(),
        address: contact.address.trim(),
        diet: contact.diet,
        birthDate: contact.birthDate || undefined,
        zodiac: contact.zodiac || undefined,
        lineId: contact.lineId || undefined,
        availability: Object.keys(availability).length ? availability : undefined,
        availabilityNote: availabilityNote.trim() || undefined,
      });
      clearDraft();
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('送出時發生錯誤，請稍後再試，或透過 LINE 與我們聯繫');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] pb-12">
        <div className="max-w-2xl mx-auto px-4 pt-10 space-y-4">
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 border-2 border-green-200">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="font-bold text-2xl text-[#2E2A22] font-serif">志工報名成功！</h2>
            <p className="text-gray-500 text-sm mt-1">感謝 {contact.name} 發心護持</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#C49820]/20 text-sm text-gray-600 leading-relaxed text-center">
            您的報名已送出，廟方人員將於近日與您聯繫服務細節。<br />
            志工功德無量，願您福慧增長、諸事順遂。
          </div>
          <a
            href={getLineUrl()}
            onClick={() => trackLine('volunteer-success')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-[#06C755] text-white font-bold text-base shadow-md hover:bg-[#05b04c] active:scale-[0.98] transition-all"
          >
            加入和聖壇 LINE 官方帳號
          </a>
          {onBack && (
            <button
              onClick={onBack}
              className="w-full py-3 rounded-2xl border border-[#C49820]/40 text-[#2E2A22] text-sm font-medium hover:bg-[#C49820]/5 transition-colors"
            >
              返回法會報名
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] pb-28">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-[#F0E9CE]/98 backdrop-blur-md border-b border-[#C49820]/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-[#C49820]/10 text-[#2E2A22] transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <img src="/logo.png" alt="和聖壇" className="w-9 h-9 object-contain shrink-0" />
          <div className="min-w-0">
            <h1 className="font-bold text-[#2E2A22] text-base leading-tight font-serif">和聖壇志工報名</h1>
            <p className="text-xs text-[#C49820] truncate">太上慈悲普渡禮懺法會</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 pt-4">
        {/* 主視覺 Banner */}
        <div className="rounded-2xl overflow-hidden shadow-lg">
          <img src="/fahui-banner.png" alt="太上慈悲普渡禮懺法會" className="w-full h-auto block" />
        </div>

        {/* 招募說明 */}
        <div className="bg-gradient-to-br from-amber-800 to-amber-950 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-amber-300 text-xs tracking-widest mb-1">發心護持・廣結善緣</p>
          <h2 className="font-bold text-2xl font-serif mb-3">法會志工招募</h2>
          <div className="space-y-1.5 text-sm text-amber-100">
            <p>服務期間：國曆 9/11～9/13（禮懺法會活動）</p>
            <p>誠邀善男信女發心參與，共成殊勝功德。</p>
          </div>
        </div>

        {/* 預填提示 */}
        {showPrefillHint && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-green-800">已帶入您先前填寫的聯絡資料，可直接送出或修改</span>
            <button
              type="button"
              onClick={resetForm}
              className="shrink-0 text-green-700 underline hover:text-green-900 transition-colors"
            >
              清除重填
            </button>
          </div>
        )}

        {/* 志工資料 */}
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 bg-[#C49820] text-white rounded-full flex items-center justify-center text-xs shrink-0">✓</span>
          <h3 className="font-bold text-[#2E2A22] text-sm">志工資料</h3>
        </div>
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#C49820]/20">
          <div className="space-y-3">
            <div>
              <label htmlFor="volunteer-name" className="block text-xs text-gray-500 mb-1">姓名 *</label>
              <input
                id="volunteer-name"
                name="name"
                autoComplete="name"
                className={inputCls}
                value={contact.name}
                onChange={e => setContact(c => ({ ...c, name: e.target.value }))}
                placeholder="您的姓名"
              />
            </div>
            <div>
              <label htmlFor="volunteer-phone" className="block text-xs text-gray-500 mb-1">聯絡電話 *</label>
              <input
                id="volunteer-phone"
                name="tel"
                autoComplete="tel"
                className={inputCls}
                type="tel"
                value={contact.phone}
                onChange={e => setContact(c => ({ ...c, phone: e.target.value }))}
                placeholder="聯絡電話"
              />
            </div>
            <div>
              <label htmlFor="volunteer-address" className="block text-xs text-gray-500 mb-1">通訊地址 * <span className="text-gray-400">（用於稟告疏文，將志工功德稟告上蒼）</span></label>
              <input
                id="volunteer-address"
                name="street-address"
                autoComplete="street-address"
                className={inputCls}
                value={contact.address}
                onChange={e => setContact(c => ({ ...c, address: e.target.value }))}
                placeholder="通訊地址"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">用餐習慣 * <span className="text-gray-400">（法會當日備餐用）</span></label>
              <div className="flex gap-2">
                {DIET_OPTIONS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setContact(c => ({ ...c, diet: d }))}
                    aria-pressed={contact.diet === d}
                    className={`flex-1 py-2.5 rounded-lg border text-sm transition-all ${
                      contact.diet === d
                        ? 'bg-temple-gold text-white border-temple-gold font-medium'
                        : 'bg-white text-temple-dark border-temple-gold/40 hover:bg-temple-gold/10'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">生日及生肖 <span className="text-gray-400">（選填，填國曆自動換算農曆）</span></label>
              <BirthDatePicker
                hideLabel
                birthDate={contact.birthDate}
                onChange={(bd, zod) => setContact(c => ({ ...c, birthDate: bd, zodiac: zod ?? '' }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">LINE 名稱 / ID <span className="text-gray-400">（選填）</span></label>
              <input
                className={inputCls}
                value={contact.lineId}
                onChange={e => setContact(c => ({ ...c, lineId: e.target.value }))}
                placeholder="便於後續聯繫" aria-label="便於後續聯繫"
              />
            </div>
          </div>
        </section>

        {/* 出勤與時間調查 */}
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 bg-[#C49820] text-white rounded-full flex items-center justify-center text-xs shrink-0">✓</span>
          <h3 className="font-bold text-[#2E2A22] text-sm">出勤與時間調查</h3>
        </div>
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#C49820]/20">
          <p className="text-xs text-gray-500 mb-3">可護持法會之日期與時段（可複選）。如為其他時段，請於下方說明。</p>

          {/* 時段標頭 */}
          <div className="hidden sm:grid grid-cols-[3.2rem_repeat(4,1fr)] gap-1 mb-1">
            <span />
            {VOL_SLOTS.map(s => (
              <div key={s.key} className="text-center leading-tight">
                <p className="text-[11px] font-medium text-[#2E2A22]">{s.key}</p>
                <p className="text-[9px] text-gray-400">{s.time}</p>
              </div>
            ))}
          </div>

          {/* 每日一列 */}
          {VOL_DAYS.map(day => (
            <div key={day.key} className="py-3 sm:py-1.5 border-t border-[#C49820]/10 sm:grid sm:grid-cols-[3.2rem_repeat(4,1fr)] sm:gap-1 sm:items-center">
              <p className="text-sm sm:text-xs font-semibold sm:font-medium text-[#2E2A22] mb-2 sm:mb-0">{day.label}</p>
              <div className="grid grid-cols-2 gap-2 sm:contents">
              {VOL_SLOTS.map(slot => {
                const checked = (availability[day.key] || []).includes(slot.key);
                return (
                  <button
                    key={slot.key}
                    type="button"
                    onClick={() => toggleSlot(day.key, slot.key)}
                    aria-label={`${day.label} ${slot.key}`}
                    aria-pressed={checked}
                    className={`min-h-11 px-2 rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      checked
                        ? 'bg-[#C49820] border-[#C49820] text-white'
                        : 'bg-white border-[#C49820]/30 text-[#2E2A22] hover:border-[#C49820]/60'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${checked ? 'opacity-100' : 'opacity-25'}`} />
                    <span className="text-xs sm:hidden">{slot.key}<span className="block text-[10px] opacity-70">{slot.time}</span></span>
                  </button>
                );
              })}
              </div>
            </div>
          ))}

          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">其他時段說明 <span className="text-gray-400">（選填）</span></label>
            <input
              className={inputCls}
              value={availabilityNote}
              onChange={e => setAvailabilityNote(e.target.value)}
              placeholder="例：9/11 下班後 18:30 才能到" aria-label="例：9/11 下班後 18:30 才能到"
            />
          </div>
        </section>

        {/* Error */}
        {error && (
          <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-2xl bg-amber-800 hover:bg-amber-900 active:scale-[0.98] text-white font-bold text-base shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? '送出中…' : '確認報名志工'}
        </button>

        {onBack && (
          <button
            onClick={onBack}
            className="w-full py-3 rounded-2xl border border-[#C49820]/40 text-[#2E2A22] text-sm font-medium hover:bg-[#C49820]/5 transition-colors"
          >
            返回法會報名
          </button>
        )}

        {/* 頁尾 */}
        <footer className="mt-2 pt-6 border-t border-[#C49820]/20 text-center space-y-1.5 pb-4">
          <p className="font-serif font-bold text-[#7C5C1E]">和聖壇</p>
          <p className="text-xs text-gray-500">台北市中正區晉江街72巷9號</p>
          <p className="text-sm text-[#2E2A22]">
            聯絡電話：
            <a href="tel:0953945349" className="font-semibold text-[#7C5C1E] hover:underline">0953-945-349</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
