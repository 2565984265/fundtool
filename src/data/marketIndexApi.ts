export interface MarketIndex {
  code: string;
  name: string;
  market: number; // 1=SH, 0=SZ
  current: number;
  changePercent: number;
  changeAmount: number;
}

const SECIDS = '1.000001,0.399001,0.399006,1.000688';
const API_URL = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f12,f13,f14,f2,f3,f4&secids=${SECIDS}`;

interface EastMoneyIndexRaw {
  f12: string;
  f13: number;
  f14: string;
  f2: number;
  f3: number;
  f4: number;
}

export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`Index API failed: ${res.status}`);
  const json = await res.json();
  const rawList: EastMoneyIndexRaw[] = json?.data?.diff || [];

  return rawList.map((item) => ({
    code: item.f12,
    name: item.f14,
    market: item.f13,
    current: item.f2,
    changePercent: item.f3,
    changeAmount: item.f4,
  }));
}
