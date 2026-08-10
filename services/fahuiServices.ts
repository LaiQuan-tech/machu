// 法會服務項目設定（後台共用）——與報名表 SERVICE_CONFIGS 對應，價格需一致

export interface FahuiServiceMeta {
  key: string;
  title: string;
  unit: string;
  price: number;
  /** 有此欄位者，金額 = 單價 × 該欄位數量（物資捐贈） */
  unitsField?: string;
  fields: { key: string; label: string }[];
}

export const FAHUI_SERVICE_META: FahuiServiceMeta[] = [
  { key: 'zanpu',    title: '中元贊普',     unit: '戶',   price: 1200, fields: [{ key: 'donor', label: '陽上姓名' }, { key: 'gender', label: '性別' }, { key: 'address', label: '地址' }] },
  { key: 'ancestor', title: '超渡歷代祖先', unit: '牌位', price: 800,  fields: [{ key: 'donor', label: '陽上姓名' }, { key: 'gender', label: '性別' }, { key: 'object', label: '超薦對象' }, { key: 'position', label: '牌位地址' }] },
  { key: 'person',   title: '超渡先人',     unit: '牌位', price: 800,  fields: [{ key: 'donor', label: '陽上姓名' }, { key: 'gender', label: '性別' }, { key: 'object', label: '超薦對象' }, { key: 'position', label: '牌位地址' }] },
  { key: 'dizhu',    title: '超薦地基主',   unit: '戶',   price: 600,  fields: [{ key: 'donor', label: '陽上姓名' }, { key: 'gender', label: '性別' }, { key: 'address', label: '地址' }] },
  { key: 'debt',     title: '解冤親債主',   unit: '牌位', price: 600,  fields: [{ key: 'donor', label: '陽上姓名' }, { key: 'gender', label: '性別' }, { key: 'birthdate', label: '出生日期' }, { key: 'zodiac', label: '生肖' }, { key: 'address', label: '地址' }] },
  { key: 'baby',     title: '超渡嬰靈',     unit: '牌位', price: 600,  fields: [{ key: 'donor', label: '陽上姓名' }, { key: 'gender', label: '性別' }, { key: 'birthdate', label: '出生日期' }, { key: 'zodiac', label: '生肖' }, { key: 'address', label: '地址' }] },
  { key: 'animal',   title: '超渡動物靈',   unit: '牌位', price: 600,  fields: [{ key: 'donor', label: '陽上姓名' }, { key: 'gender', label: '性別' }, { key: 'petType', label: '寵物類別' }, { key: 'petName', label: '寵物名' }, { key: 'position', label: '牌位地址' }] },
  { key: 'donation', title: '物資捐贈做功德', unit: '單位', price: 500, unitsField: 'units', fields: [{ key: 'donor', label: '捐贈人' }, { key: 'gender', label: '性別' }, { key: 'units', label: '捐贈單位數量' }, { key: 'address', label: '地址' }] },
];

/** 一筆報名的金額（物資捐贈 = 單價 × 單位數） */
export const fahuiEntryAmount = (meta: { price: number; unitsField?: string }, entry: Record<string, string>): number =>
  meta.unitsField ? meta.price * (Number(entry[meta.unitsField]) || 1) : meta.price;
