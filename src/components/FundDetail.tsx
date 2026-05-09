import { useState } from 'react';
import { FundHolding, FundInfo, Transaction } from '../types';
import { calculateFundStats } from '../utils/calculate';
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  fund: FundHolding;
  info?: FundInfo;
  onRemove: (code: string) => void;
  onAddTx: (code: string, tx: Omit<Transaction, 'id'>) => void;
  onRemoveTx: (code: string, txId: string) => void;
}

export default function FundDetail({ fund, info, onRemove, onAddTx, onRemoveTx }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState<'buy' | 'sell'>('buy');
  const [txNetValue, setTxNetValue] = useState('');
  const [txShares, setTxShares] = useState('');
  const [txNote, setTxNote] = useState('');

  const stats = info ? calculateFundStats(fund, info) : null;

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txNetValue || !txShares) return;
    const shares = parseFloat(txShares);
    const nv = parseFloat(txNetValue);
    onAddTx(fund.code, {
      date: txDate,
      type: txType,
      netValue: nv,
      shares,
      amount: txType === 'buy' ? nv * shares : nv * shares,
      note: txNote,
    });
    setTxNetValue('');
    setTxShares('');
    setTxNote('');
    setShowTxForm(false);
  };

  const chartData = fund.valuationHistory.map((v) => ({
    date: v.date.slice(5),
    value: v.value,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
      <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-gray-900">{fund.name} ({fund.code})</h3>
            {stats && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <span>持仓:{fund.shares.toFixed(2)}份</span>
                <span>持仓天数:{stats.holdingDays}天</span>
                <span>成本:{fund.avgCost.toFixed(4)}</span>
                <span>市值:¥{stats.marketValue.toFixed(2)}</span>
                <span className={stats.todayProfit >= 0 ? 'text-red-600' : 'text-green-600'}>
                  今日收益:{stats.todayProfit >= 0 ? '+' : ''}{stats.todayProfit.toFixed(2)} ({(stats.todayProfitRate * 100).toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {stats && (
              <div className={`text-right font-bold ${stats.totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                <div>持仓收益: {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)} ({(stats.totalProfitRate * 100).toFixed(2)}%)</div>
                <div className="text-sm font-normal text-gray-500">年化: {(stats.annualizedReturn * 100).toFixed(2)}%</div>
              </div>
            )}
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5">
          {info && (
            <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-bold text-sm mb-3">📈 基金实时估值</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">前期净值</span><span>{info.preNetValue} ({info.netValueDate})</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">最新估值</span><span className={info.estimateChange && info.estimateChange >= 0 ? 'text-red-600' : 'text-green-600'}>{info.estimateValue} ({info.estimateTime})</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">当日涨跌</span><span className={info.estimateChange && info.estimateChange >= 0 ? 'text-red-600' : 'text-green-600'}>{info.estimateChange}%</span></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-bold text-sm mb-3">📊 持仓详情</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">当前持有份数</span><span>{fund.shares.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">平均持仓成本</span><span>¥{fund.avgCost.toFixed(4)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">持仓总成本</span><span>¥{fund.totalCost.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">当前基金净值</span><span>{info.netValue}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">当前持仓市值</span><span>¥{stats?.marketValue.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          )}

          {chartData.length > 1 && (
            <div className="mb-4">
              <h4 className="font-bold text-sm mb-2">🎢 估值趋势</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-sm">💱 交易记录</h4>
              <button onClick={() => setShowTxForm(!showTxForm)} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> 添加记录
              </button>
            </div>

            {showTxForm && (
              <form onSubmit={handleAddTx} className="bg-gray-50 rounded-lg p-4 mb-3 flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">日期</label>
                  <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">类型</label>
                  <select value={txType} onChange={(e) => setTxType(e.target.value as 'buy' | 'sell')} className="border rounded px-2 py-1 text-sm">
                    <option value="buy">买入</option>
                    <option value="sell">卖出</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">净值</label>
                  <input type="number" step="0.0001" value={txNetValue} onChange={(e) => setTxNetValue(e.target.value)} className="border rounded px-2 py-1 text-sm w-24" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">份数</label>
                  <input type="number" step="0.01" value={txShares} onChange={(e) => setTxShares(e.target.value)} className="border rounded px-2 py-1 text-sm w-24" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">笔记</label>
                  <input value={txNote} onChange={(e) => setTxNote(e.target.value)} className="border rounded px-2 py-1 text-sm w-32" />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm">保存</button>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2">日期</th>
                    <th className="text-left px-3 py-2">类型</th>
                    <th className="text-left px-3 py-2">净值</th>
                    <th className="text-left px-3 py-2">份数</th>
                    <th className="text-left px-3 py-2">金额</th>
                    <th className="text-left px-3 py-2">笔记</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {fund.transactions.map((tx) => (
                    <tr key={tx.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{tx.date}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${tx.type === 'buy' || tx.type === 'initial' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {tx.type === 'initial' ? '初始' : tx.type === 'buy' ? '买入' : '卖出'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{tx.netValue.toFixed(4)}</td>
                      <td className="px-3 py-2">{tx.shares.toFixed(2)}</td>
                      <td className="px-3 py-2">{tx.amount.toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-500">{tx.note}</td>
                      <td className="px-3 py-2">
                        {tx.type !== 'initial' && (
                          <button onClick={() => onRemoveTx(fund.code, tx.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => { if (confirm('确定删除该基金？')) onRemove(fund.code); }} className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> 删除基金
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
