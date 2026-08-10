// 法會報名表單（依範本分頁產生）——與 UI 無關的純資料轉換，獨立成模組以便測試
import type { FahuiRegistrationRecord } from '../types';
import { FAHUI_SERVICE_META, fahuiEntryAmount } from './fahuiServices';

// ─── 法會報名表單（依範本分頁產生）──────────────────────────────────────────
export type SheetCell = string | number | Date;

/** 生日與生肖：優先用該筆自己填的；若陽上姓名就是聯絡人本人，改用聯絡人的資料 */
export function fahuiBirth(r: FahuiRegistrationRecord, e: Record<string, string>): { bd: string; zod: string } {
  const isContact = (e.donor || '').trim() === (r.name || '').trim();
  return {
    bd: e.birthdate || (isContact ? r.contactBirthDate || '' : ''),
    zod: e.zodiac || (isContact ? r.contactZodiac || '' : ''),
  };
}

/** 對帳欄位（同一筆報名的每一列共用） */
export function fahuiRecon(r: FahuiRegistrationRecord) {
  let date: SheetCell = '';
  if (r.paymentDate) {
    const [y, m, d] = r.paymentDate.split('-').map(Number);
    if (y && m && d) date = new Date(y, m - 1, d);   // 本地時區組日期，避免時差跳日
  }
  return {
    method: r.paymentMethod || '',
    date,
    last5: r.accountLast5 || '',
    fin: r.financeCheck ? 'V' : '',
    thx: r.thanksLetter || '',   // 感謝狀編號，未填就空白（原本是打勾的 'V'）
    acc: r.accountingCheck ? 'V' : '',
    note: r.adminNote || '',
  };
}

type ReconFields = ReturnType<typeof fahuiRecon>;
type BirthFields = { bd: string; zod: string };

/** 功德主（懺主）不需付款，金額以 0 計 */
export const fahuiIsPaid = (r: FahuiRegistrationRecord): boolean =>
  r.status === 'paid' || r.paymentMethod === '功德主';

export interface FahuiSheetSpec {
  key: string;
  sheet: string;
  headers: string[];
  row: (seq: string, r: FahuiRegistrationRecord, e: Record<string, string>, amount: number, rc: ReconFields, b: BirthFields) => SheetCell[];
}

/** 各分頁的欄位順序完全依照範本（各頁備註／確認欄的位置不同，逐頁對齊） */
export const FAHUI_SHEET_SPECS: FahuiSheetSpec[] = [
  {
    key: 'zanpu', sheet: '中元贊普名單',
    headers: ['編號', '性別', '陽上報恩人', '農曆生日', '生肖', '地址', '金額', '付款方式', '付費日期', '帳號後五碼', '是否領回贊普供品', '財務確認', '感謝狀', '會計確認', '備註'],
    row: (seq, r, e, amount, rc, b) => [seq, e.gender || '', e.donor || '', b.bd, b.zod, e.address || '', amount, rc.method, rc.date, rc.last5, r.zanpuOffering || '', rc.fin, rc.thx, rc.acc, rc.note],
  },
  {
    key: 'ancestor', sheet: '超渡歷代祖先名單',
    headers: ['編號', '性別', '陽上報恩人', '農曆生日', '生肖', '超薦對象姓氏', '超薦對象的牌位位置', '金額', '付款方式', '付費日期', '帳號後五碼', '備註', '財務確認', '感謝狀', '會計確認'],
    row: (seq, _r, e, amount, rc, b) => [seq, e.gender || '', e.donor || '', b.bd, b.zod, e.object || '', e.position || '', amount, rc.method, rc.date, rc.last5, rc.note, rc.fin, rc.thx, rc.acc],
  },
  {
    key: 'person', sheet: '超渡先人名單',
    headers: ['編號', '性別', '陽上報恩人', '農曆生日', '生肖', '超薦對象', '超薦對象的牌位位置', '金額', '付款方式', '付費日期', '帳號後五碼', '財務確認', '感謝狀', '會計確認', '備註'],
    row: (seq, _r, e, amount, rc, b) => [seq, e.gender || '', e.donor || '', b.bd, b.zod, e.object || '', e.position || '', amount, rc.method, rc.date, rc.last5, rc.fin, rc.thx, rc.acc, rc.note],
  },
  {
    key: 'dizhu', sheet: '超薦地基主名單',
    headers: ['編號', '性別', '陽上報恩人', '農曆生日', '生肖', '地址', '金額', '付款方式', '付費日期', '帳號後五碼', '備註', '財務確認', '感謝狀', '會計確認'],
    row: (seq, _r, e, amount, rc, b) => [seq, e.gender || '', e.donor || '', b.bd, b.zod, e.address || '', amount, rc.method, rc.date, rc.last5, rc.note, rc.fin, rc.thx, rc.acc],
  },
  {
    key: 'debt', sheet: '解冤親債主名單',
    headers: ['編號', '性別', '陽上報恩人', '農曆生日', '生肖', '地址', '金額', '付款方式', '付費日期', '帳號後五碼', '財務確認', '感謝狀', '會計確認', '備註'],
    row: (seq, _r, e, amount, rc, b) => [seq, e.gender || '', e.donor || '', b.bd, b.zod, e.address || '', amount, rc.method, rc.date, rc.last5, rc.fin, rc.thx, rc.acc, rc.note],
  },
  {
    key: 'baby', sheet: '超渡嬰靈名單',
    // 範本此頁有兩組「性別／陽上報恩人」（報恩人與懺悔人），目前表單只收一位，第二組留空
    headers: ['編號', '性別', '陽上報恩人', '性別', '陽上報恩人', '農曆生日', '生肖', '地址', '金額', '付款方式', '付費日期', '帳號後五碼', '財務確認', '感謝狀', '會計確認', '備註'],
    row: (seq, _r, e, amount, rc, b) => [seq, e.gender || '', e.donor || '', '', '', b.bd, b.zod, e.address || '', amount, rc.method, rc.date, rc.last5, rc.fin, rc.thx, rc.acc, rc.note],
  },
  {
    key: 'animal', sheet: '超渡動物靈名單',
    headers: ['編號', '性別', '陽上報恩人', '性別', '陽上報恩人', '農曆生日', '生肖', '超薦對象', '超薦對象的牌位位置', '金額', '付款方式', '付費日期', '帳號後五碼', '財務確認', '感謝狀', '會計確認', '備註'],
    row: (seq, _r, e, amount, rc, b) => [seq, e.gender || '', e.donor || '', '', '', b.bd, b.zod,
      [e.petType, e.petName].filter(Boolean).join('／'), e.position || '', amount, rc.method, rc.date, rc.last5, rc.fin, rc.thx, rc.acc, rc.note],
  },
  {
    key: 'donation', sheet: '物資捐資名單',
    headers: ['編號', '性別', '陽上報恩人', '農曆生日', '生肖', '地址', '捐贈單位數', '金額', '付款方式', '付費日期', '帳號後五碼', '備註', '財務確認', '感謝狀', '會計確認'],
    row: (seq, _r, e, amount, rc, b) => [seq, e.gender || '', e.donor || '', b.bd, b.zod, e.address || '', Number(e.units) || 1, amount, rc.method, rc.date, rc.last5, rc.note, rc.fin, rc.thx, rc.acc],
  },
];

/** 收入計算表的項目順序（依範本） */
export const FAHUI_SUMMARY_ORDER: { key: string; label: string }[] = [
  { key: 'zanpu', label: '中元普渡' },
  { key: 'debt', label: '冤親債主' },
  { key: 'baby', label: '超渡嬰靈' },
  { key: 'ancestor', label: '歷代祖先' },
  { key: 'person', label: '超渡先人' },
  { key: 'animal', label: '超渡動物靈' },
  { key: 'dizhu', label: '超薦地基主' },
  { key: 'donation', label: '物資捐贈' },
  { key: 'meal', label: '平安餐茶飲贊助' },
];

export interface SheetOut { name: string; aoa: SheetCell[][]; merges?: { s: { r: number; c: number }; e: { r: number; c: number } }[] }

/** 依範本產生完整活頁簿：每個項目一個分頁 ＋ 平安餐 ＋ 收入計算表 */
export function buildFahuiSheets(regs: FahuiRegistrationRecord[]): SheetOut[] {
  const sheets: SheetOut[] = [];
  const stat: Record<string, { paidN: number; unpaidN: number; paidAmt: number; unpaidAmt: number }> = {};
  const blank = () => ({ paidN: 0, unpaidN: 0, paidAmt: 0, unpaidAmt: 0 });

  FAHUI_SHEET_SPECS.forEach(spec => {
    const meta = FAHUI_SERVICE_META.find(m => m.key === spec.key);
    const aoa: SheetCell[][] = [spec.headers];
    const st = blank();
    let n = 0;
    regs.forEach(r => {
      const rc = fahuiRecon(r);
      const paid = fahuiIsPaid(r);
      (r.entries[spec.key] || []).forEach(e => {
        n += 1;
        const amount = r.paymentMethod === '功德主' ? 0 : (meta ? fahuiEntryAmount(meta, e) : 0);
        aoa.push(spec.row(String(n).padStart(3, '0'), r, e, amount, rc, fahuiBirth(r, e)));
        if (paid) { st.paidN += 1; st.paidAmt += amount; } else { st.unpaidN += 1; st.unpaidAmt += amount; }
      });
    });
    stat[spec.key] = st;
    sheets.push({ name: spec.sheet, aoa });
  });

  // 平安餐與茶飲贊助（以報名筆為單位，金額為自由填寫）
  const mealAoa: SheetCell[][] = [['編號', '性別', '陽上報恩人', '農曆生日', '生肖', '地址', '金額']];
  const mealSt = blank();
  let mn = 0;
  regs.forEach(r => {
    if (!r.mealSponsor) return;
    mn += 1;
    const amount = r.paymentMethod === '功德主' ? 0 : r.mealSponsor;
    mealAoa.push([String(mn).padStart(3, '0'), r.contactGender || '', r.name, r.contactBirthDate || '', r.contactZodiac || '', r.address || '', amount]);
    if (fahuiIsPaid(r)) { mealSt.paidN += 1; mealSt.paidAmt += amount; } else { mealSt.unpaidN += 1; mealSt.unpaidAmt += amount; }
  });
  stat.meal = mealSt;
  sheets.push({ name: '平安餐與茶飲贊助', aoa: mealAoa });

  // 收入計算表
  const r1: SheetCell[] = ['項目'];
  const r2: SheetCell[] = ['人數'];
  const r3: SheetCell[] = [''];
  const r4: SheetCell[] = ['總人數'];
  const r5: SheetCell[] = ['金額'];
  const r6: SheetCell[] = [''];
  const r7: SheetCell[] = ['總金額'];
  let totalPaidAmt = 0;
  let totalUnpaidAmt = 0;
  let totalPeopleTimes = 0;   // 參與總人次＝各項目列數總和
  FAHUI_SUMMARY_ORDER.forEach(item => {
    const s = stat[item.key] || blank();
    r1.push(item.label, '');
    r2.push('已繳款人數', '未繳款人數');
    r3.push(s.paidN, s.unpaidN);
    r4.push(s.paidN + s.unpaidN, '');
    r5.push('已繳款', '未繳款');
    r6.push(s.paidAmt, s.unpaidAmt);
    r7.push(s.paidAmt + s.unpaidAmt, '');
    totalPaidAmt += s.paidAmt;
    totalUnpaidAmt += s.unpaidAmt;
    totalPeopleTimes += s.paidN + s.unpaidN;
  });
  r1.push('參與總人次');
  r2.push('');
  r3.push(totalPeopleTimes);       // 參與總人次＝各項目列數總和（一人報兩個牌位＝兩人次）
  r4.push('');
  r5.push('總金額');
  r6.push(totalPaidAmt + totalUnpaidAmt);
  r7.push('');

  const merges: SheetOut['merges'] = [];
  FAHUI_SUMMARY_ORDER.forEach((_, i) => {
    [0, 3, 6].forEach(rowIdx => merges.push({ s: { r: rowIdx, c: 1 + i * 2 }, e: { r: rowIdx, c: 2 + i * 2 } }));
  });
  sheets.push({ name: '收入計算表', aoa: [r1, r2, r3, r4, r5, r6, r7], merges });

  return sheets;
}
