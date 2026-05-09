export interface FundInfo {
  code: string;
  name: string;
  netValue: number;
  preNetValue: number;
  netValueDate: string;
  estimateValue?: number;
  estimateTime?: string;
  estimateChange?: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'buy' | 'sell' | 'initial';
  netValue: number;
  shares: number;
  amount: number;
  note?: string;
}

export interface FundHolding {
  code: string;
  name: string;
  shares: number;
  avgCost: number;
  totalCost: number;
  transactions: Transaction[];
  startDate: string;
  valuationHistory: ValuationPoint[];
}

export interface ValuationPoint {
  date: string;
  value: number;
}

export interface FundData {
  funds: FundHolding[];
}

export interface Backup {
  id: string;
  name: string;
  createdAt: string;
  data: FundData;
}
