import { FundHolding, FundInfo } from '../types';
import { calculateFundStats } from '../utils/calculate';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, CalendarDays, BarChart4 } from 'lucide-react';

interface Props {
  funds: FundHolding[];
  fundInfos: Record<string, FundInfo>;
}

export default function GlobalStats({ funds, fundInfos }: Props) {
  let totalCost = 0;
  let totalMarket = 0;
  let totalTodayProfit = 0;
  let totalHoldingDays = 0;
  let count = 0;

  for (const fund of funds) {
    const info = fundInfos[fund.code];
    if (!info) continue;
    const stats = calculateFundStats(fund, info);
    totalCost += stats.totalCost;
    totalMarket += stats.marketValue;
    totalTodayProfit += stats.todayProfit;
    totalHoldingDays += stats.holdingDays;
    count++;
  }

  const totalProfit = totalMarket - totalCost;
  const totalProfitRate = totalCost > 0 ? totalProfit / totalCost : 0;
  const avgHoldingDays = count > 0 ? Math.round(totalHoldingDays / count) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-bold mb-4 text-gray-800">📊 全局统计概览</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<PiggyBank className="w-5 h-5 text-blue-500" />}
          label="总成本"
          value={`¥${totalCost.toFixed(2)}`}
        />
        <StatCard
          icon={<Wallet className="w-5 h-5 text-purple-500" />}
          label="总市值"
          value={`¥${totalMarket.toFixed(2)}`}
        />
        <StatCard
          icon={totalProfit >= 0 ? <TrendingUp className="w-5 h-5 text-red-500" /> : <TrendingDown className="w-5 h-5 text-green-500" />}
          label="持仓收益"
          value={`${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}`}
          subValue={`(${(totalProfitRate * 100).toFixed(2)}%)`}
          color={totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}
        />
        <StatCard
          icon={totalTodayProfit >= 0 ? <TrendingUp className="w-5 h-5 text-red-500" /> : <TrendingDown className="w-5 h-5 text-green-500" />}
          label="今日收益"
          value={`${totalTodayProfit >= 0 ? '+' : ''}${totalTodayProfit.toFixed(2)}`}
          color={totalTodayProfit >= 0 ? 'text-red-600' : 'text-green-600'}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <StatCard
          icon={<CalendarDays className="w-5 h-5 text-orange-500" />}
          label="平均持仓天数"
          value={`${avgHoldingDays} 天`}
        />
        <StatCard
          icon={<BarChart4 className="w-5 h-5 text-teal-500" />}
          label="持有基金数"
          value={`${funds.length} 只`}
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, color = 'text-gray-900' }: { icon: React.ReactNode; label: string; value: string; subValue?: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1 text-sm text-gray-500">{icon}{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {subValue && <div className={`text-sm ${color} opacity-80`}>{subValue}</div>}
    </div>
  );
}
