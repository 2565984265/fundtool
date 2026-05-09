import { FundHolding, FundInfo } from '../types';

export interface FundStats {
  totalCost: number;
  marketValue: number;
  totalProfit: number;
  totalProfitRate: number;
  holdingDays: number;
  todayProfit: number;
  todayProfitRate: number;
  annualizedReturn: number;
}

export function calculateFundStats(holding: FundHolding, info: FundInfo): FundStats {
  const totalCost = holding.totalCost;
  const marketValue = holding.shares * info.netValue;
  const totalProfit = marketValue - totalCost;
  const totalProfitRate = totalCost > 0 ? totalProfit / totalCost : 0;

  const start = new Date(holding.startDate);
  const now = new Date();
  const holdingDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  const annualizedReturn = holdingDays > 0
    ? Math.pow(1 + totalProfitRate, 365 / holdingDays) - 1
    : 0;

  const preValue = info.preNetValue || info.netValue;
  const todayProfit = holding.shares * (info.netValue - preValue);
  const todayProfitRate = preValue > 0 ? (info.netValue - preValue) / preValue : 0;

  return {
    totalCost,
    marketValue,
    totalProfit,
    totalProfitRate,
    holdingDays,
    todayProfit,
    todayProfitRate,
    annualizedReturn,
  };
}

export function recalcHolding(holding: FundHolding): FundHolding {
  const sorted = [...holding.transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let shares = 0;
  let totalCost = 0;

  for (const tx of sorted) {
    if (tx.type === 'buy' || tx.type === 'initial') {
      shares += tx.shares;
      totalCost += tx.amount;
    } else if (tx.type === 'sell') {
      const sellRatio = tx.shares / shares;
      totalCost = totalCost * (1 - sellRatio);
      shares -= tx.shares;
    }
  }

  const avgCost = shares > 0 ? totalCost / shares : 0;

  return {
    ...holding,
    shares,
    avgCost,
    totalCost,
    transactions: sorted,
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
