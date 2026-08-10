import React, { useEffect, useState } from 'react';
import StoryPage, { StoryBlock, splitParagraphs, renderInline } from './StoryPage';
import { getAboutSections, getRelocationPlans, getSiteImagePublicUrl } from '../services/supabase';
import { AboutSection, RelocationPlan } from '../types';

/**
 * 遷址捐款（獨立頁）
 *
 * 圖文段落與捐款方案表格都來自後台，廟方自行維護：
 *   段落 → about_sections（page = 'relocation'）
 *   方案 → relocation_plans（金額當欄、回饋項目當列的矩陣）
 * 匯款方式先不放在這一頁（廟方要求），需要時再加回來。
 */

const toStoryBlock = (s: AboutSection): StoryBlock => ({
  heading: s.heading || undefined,
  paragraphs: splitParagraphs(s.body),
  image: s.imagePath ? getSiteImagePublicUrl(s.imagePath) : undefined,
  imageAlt: s.heading || '遷址',
  caption: s.caption || undefined,
});

/** 空字串的格子在表格裡留白，用「—」比空白更明確地表示「這一級沒有」 */
const cellText = (v: string): string => (v.trim() === '' ? '—' : v.trim());
const isYes = (v: string): boolean => /^[✓✔V v]$/.test(v.trim());

/**
 * 金額級距補上「元」。
 *
 * 後台存的是純數字字串（`600`、`1,000`），畫面上只有數字看不出單位。
 * 在渲染層補而不是改資料，後台之後新增級距也自動有單位，不會有人忘記打。
 *
 * 三種格式都要顧到：
 *   `600`          → `600 元`
 *   `100,000 以上` → `100,000 元以上`（單位插在數字後面，不是整串後面）
 *   `隨喜`         → 原樣（沒有數字就不是金額，加了會變成「隨喜元」）
 */
const withCurrency = (tier: string): string => {
  const m = tier.trim().match(/^([\d,]+)\s*(.*)$/);
  if (!m) return tier;
  return m[2] ? `${m[1]} 元${m[2]}` : `${m[1]} 元`;
};

/**
 * 一張方案表
 *
 * 桌機用真表格：金額橫向並列才看得出「多捐一級多什麼」。
 * 手機改成一張金額一張卡：六欄的矩陣在 375px 寬會擠成無法閱讀的字串，
 * 橫向捲動又會讓左邊的項目名稱捲出畫面，看了也不知道在對哪一列。
 */
const PlanTable: React.FC<{ plan: RelocationPlan }> = ({ plan }) => {
  if (plan.tiers.length === 0 || plan.rows.length === 0) return null;
  return (
    // sr/sr-up 由 StoryPage 的共用捲動處理接手；整頁都會動，表格原地不動會突兀
    <section className="mt-12 sr sr-up">
      {plan.title && (
        <h3 className="balance-text text-2xl sm:text-3xl font-bold text-temple-dark font-serif text-center">
          {plan.title}
        </h3>
      )}
      <div className="flex items-center justify-center gap-3 mt-3 mb-6">
        <span className="w-12 h-px bg-temple-gold/70" />
        <span className="w-2 h-2 rotate-45 bg-temple-gold inline-block" />
        <span className="w-12 h-px bg-temple-gold/70" />
      </div>

      {/* 上下說明都不設 max-w：要與表格同寬，而表格是 w-full 撐滿容器 */}
      {plan.intro && (
        <p className="mb-6 text-gray-600 leading-loose">{renderInline(plan.intro)}</p>
      )}

      {/* 手機：一個金額一張卡 */}
      <div className="space-y-4 md:hidden">
        {plan.tiers.map((tier, ti) => (
          <div key={ti} className="bg-white rounded-lg shadow-md border-l-4 border-temple-gold p-5">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-sm text-gray-500">{plan.amountHeader}</span>
              <span className="text-xl font-bold text-temple-red font-serif">{withCurrency(tier)}</span>
            </div>
            <ul className="space-y-1.5">
              {/*
                手機卡片只列「這一級有的」。桌機是矩陣表格，橫向能一眼比較各級差異，
                沒有的畫「—」才有意義；手機一級一張卡，沒有比較對象，
                列一堆灰色的「—」只是干擾（廟方回報前四級的「祖廟宮印黃布」就是這樣）。
              */}
              {plan.rows.map((row, ri) => {
                const v = row.cells[ti] ?? '';
                const has = isYes(v) || cellText(v) !== '—';
                if (!has) return null;
                return (
                  <li key={ri} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-4 shrink-0 text-center font-bold">✓</span>
                    <span>{row.label}</span>
                    {/* 格子不是打勾也不是空的（例如寫「2份」）就把內容一起顯示 */}
                    {!isYes(v) && <span className="text-gray-600">（{cellText(v)}）</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* 桌機：矩陣表格。欄位多時容器自己橫捲，不讓整頁被撐寬 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow-md overflow-hidden text-center">
          <thead>
            <tr className="bg-temple-gold/15 text-temple-red">
              <th scope="col" className="text-left font-serif font-bold px-5 py-4 whitespace-nowrap">
                {plan.amountHeader}
              </th>
              {plan.tiers.map((t, i) => (
                <th key={i} scope="col" className="font-serif font-bold px-5 py-4 whitespace-nowrap">{withCurrency(t)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 1 ? 'bg-temple-bg/50' : ''}>
                <th scope="row" className="text-left font-medium text-temple-dark px-5 py-3 whitespace-nowrap">
                  {row.label}
                </th>
                {plan.tiers.map((_, ti) => {
                  const v = row.cells[ti] ?? '';
                  return (
                    <td key={ti} className={`px-5 py-3 ${isYes(v) ? 'text-temple-red font-bold' : 'text-gray-400'}`}>
                      {isYes(v) ? '✓' : cellText(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plan.note && (
        <p className="mt-4 text-sm text-gray-500 leading-relaxed">{renderInline(plan.note)}</p>
      )}
    </section>
  );
};

const RelocationPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [blocks, setBlocks] = useState<StoryBlock[]>([]);
  const [plans, setPlans] = useState<RelocationPlan[]>([]);

  useEffect(() => {
    let alive = true;
    getAboutSections(false, 'relocation')
      .then(rows => { if (alive) setBlocks(rows.map(toStoryBlock)); })
      .catch(e => console.warn('讀取遷址段落失敗:', e));
    getRelocationPlans()
      .then(p => { if (alive) setPlans(p); })
      .catch(e => console.warn('讀取捐款方案失敗:', e));
    return () => { alive = false; };
  }, []);

  return (
    <StoryPage eyebrow="護持遷址" title="遷址捐款" blocks={blocks} onBack={onBack}>
      {plans.map(p => <PlanTable key={p.id} plan={p} />)}
    </StoryPage>
  );
};

export default RelocationPage;
