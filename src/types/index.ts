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
  lastNetValue?: number;
  lastNetValueDate?: string;
  accountId?: string;
  accountName?: string;
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

export interface Account {
  id: string;
  name: string;
  createdAt: string;
}

export interface AccountsMeta {
  accounts: Account[];
  currentAccountId: string;
}

export interface AllAccountsExport {
  version: number;
  accountsMeta: AccountsMeta;
  accountsData: Record<string, FundData>;
}
