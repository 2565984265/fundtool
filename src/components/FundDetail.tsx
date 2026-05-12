import { useState } from 'react';
import { FundHolding, FundInfo, Transaction } from '../types';
import { calculateFundStats } from '../utils/calculate';
import { ChevronDown, ChevronUp, Trash2, Plus, Settings2, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Props {
  fund: FundHolding;
  info?: FundInfo;
  onRemove: (code: string) => void;
  onAddTx: (code: string, tx: Omit<Transaction, 'id'>) => void;
  onRemoveTx: (code: string, txId: string) => void;
  onUpdateSettings: (code: string, startDate: string, avgCost: number, shares: number) => void;
  onRefresh: () => void;
  batchMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (code: string) => void;
  readOnly?: boolean;
}

export default function FundDetail({
  fund,
  info,
  onRemove,
  onAddTx,
  onRemoveTx,
  onUpdateSettings,
  onRefresh,
  batchMode = false,
  selected = false,
  onToggleSelect,
  readOnly = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState<'buy' | 'sell'>('buy');
  const [txNetValue, setTxNetValue] = useState('');
  const [txShares, setTxShares] = useState('');
  const [txNote, setTxNote] = useState('');

  const [setStartDate, setSetStartDate] = useState(fund.startDate);
  const [setAvgCost, setSetAvgCost] = useState(fund.avgCost.toFixed(4));
  const [setShares, setSetShares] = useState(fund.shares.toFixed(2));

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
      amount: nv * shares,
      note: txNote,
    });
    setTxNetValue('');
    setTxShares('');
    setTxNote('');
    setShowTxForm(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(fund.code, setStartDate, parseFloat(setAvgCost), parseFloat(setShares));
    setShowSettings(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const chartData = fund.valuationHistory.map((v) => ({
    date: v.date.slice(5),
    value: Number(v.value.toFixed(4)),
  }));

  // profit trend based on valuation history
  const profitChartData = chartData.map((d) => ({
    ...d,
    profit: Number(((d.value - fund.avgCost) * fund.shares).toFixed(2)),
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
      <div
        className="p-5 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => {
          if (batchMode) {
            onToggleSelect?.(fund.code);
          } else {
            setExpanded(!expanded);
          }
        }}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {batchMode && (
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition ${
                    selected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 bg-white'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect?.(fund.code);
                  }}
                >
                  {selected && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                {fund.name.charAt(0)}
              </span>
              <h3 className="font-bold text-gray-900">
                {fund.name} <span className="text-gray-400 font-normal">({fund.code})</span>
              </h3>
              {fund.accountName && (
                <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                  {fund.accountName}
                </span>
              )}
              {info ? (
                <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">已更新</span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">未获取</span>
              )}
            </div>
            {stats && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <span>持仓 {fund.shares.toFixed(2)} 份</span>
                <span>持仓 {stats.holdingDays} 天</span>
                <span>成本 ¥{fund.avgCost.toFixed(4)}</span>
                <span>市值 ¥{stats.marketValue.toFixed(2)}</span>
                <span className={stats.todayProfit >= 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                  今日预估 {stats.todayProfit >= 0 ? '+' : ''}{stats.todayProfit.toFixed(2)} ({(stats.todayProfitRate * 100).toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <div className={`text-right font-bold ${stats.totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                <div className="text-lg">
                  {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
                </div>
                <div className="text-xs font-normal text-gray-500">
                  {(stats.totalProfitRate * 100).toFixed(2)}% · 年化 {(stats.annualizedReturn * 100).toFixed(2)}%
                </div>
              </div>
            )}
            {!batchMode && (
              expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {expanded && !batchMode && (
        <div className="border-t border-gray-100 px-5 pb-5">
          {info && (
            <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-bold text-sm mb-3 text-gray-800">📈 基金实时估值</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">前期净值</span><span>{info.preNetValue.toFixed(4)} ({info.netValueDate})</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">最新估值</span><span className={info.estimateChange && info.estimateChange >= 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{info.estimateValue ? info.estimateValue.toFixed(4) : <span className="text-gray-400">--</span>} ({info.estimateTime || '--'})</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">当日涨跌</span><span className={info.estimateChange && info.estimateChange >= 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{info.estimateChange !== undefined ? info.estimateChange + '%' : <span className="text-gray-400">--</span>}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">单位净值</span><span className="font-medium">{info.netValue.toFixed(4)}</span></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-bold text-sm mb-3 text-gray-800">📊 持仓详情</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">当前持有份数</span><span className="font-medium">{fund.shares.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">平均持仓成本</span><span className="font-medium">¥{fund.avgCost.toFixed(4)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">持仓总成本</span><span className="font-medium">¥{stats?.totalCost.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">当前持仓市值</span><span className="font-medium">¥{stats?.marketValue.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">累计收益</span><span className={`font-medium ${(stats?.totalProfit ?? 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>{stats && stats.totalProfit >= 0 ? '+' : ''}{stats?.totalProfit.toFixed(2)} ({(stats?.totalProfitRate ?? 0) * 100 >= 0 ? '+' : ''}{((stats?.totalProfitRate ?? 0) * 100).toFixed(2)}%)</span></div>
                </div>
              </div>
            </div>
          )}

          {/* 持仓设置 */}
          {!readOnly && (
            <div className="mb-4">
              <button onClick={() => setShowSettings(!showSettings)} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mb-2">
                <Settings2 className="w-4 h-4" /> 持仓设置
              </button>
              {showSettings && (
                <form onSubmit={handleSaveSettings} className="bg-gray-50 rounded-lg p-4 flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">起始日期</label>
                    <input type="date" value={setStartDate} onChange={(e) => setSetStartDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">平均建仓成本（元）</label>
                    <input type="number" step="0.0001" value={setAvgCost} onChange={(e) => setSetAvgCost(e.target.value)} className="border rounded px-2 py-1 text-sm w-28" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">持仓份数</label>
                    <input type="number" step="0.01" value={setShares} onChange={(e) => setSetShares(e.target.value)} className="border rounded px-2 py-1 text-sm w-28" />
                  </div>
                  <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm">保存</button>
                </form>
              )}
            </div>
          )}

          {/* 估值趋势图 */}
          {chartData.length > 1 && (
            <div className="mb-4 bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-sm mb-3 text-gray-800">🎢 估值日趋势</h4>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={60} />
                    <Tooltip formatter={(v: number) => v.toFixed(4)} />
                    <ReferenceLine y={fund.avgCost} stroke="#9ca3af" strokeDasharray="3 3" label={{ value: '成本', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }} />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-400 mt-2">📌 注：趋势数据收集自每日页面请求时的实时估值，每日刷新才能确保收集到每日数据点。</p>
            </div>
          )}

          {/* 收益走势图 */}
          {profitChartData.length > 1 && (
            <div className="mb-4 bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-sm mb-3 text-gray-800">📈 收益走势图</h4>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitChartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={60} />
                    <Tooltip formatter={(v: number) => `¥${v.toFixed(2)}`} />
                    <ReferenceLine y={0} stroke="#9ca3af" />
                    <Line type="monotone" dataKey="profit" stroke={profitChartData[profitChartData.length - 1].profit >= 0 ? '#dc2626' : '#16a34a'} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 交易记录 */}
          {!readOnly && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-sm text-gray-800">💱 交易记录</h4>
                <button onClick={() => setShowTxForm(!showTxForm)} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> 添加记录
                </button>
              </div>
              <p className="text-xs text-orange-500 mb-2">**重要提示：** 请务必按照当前基金实际买入卖出的时间顺序添加记录（先发生的交易先添加），否则可能会导致收益计算错误！</p>

              {showTxForm && (
                <form onSubmit={handleAddTx} className="bg-gray-50 rounded-lg p-4 mb-3 flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">交易日期 *</label>
                    <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="border rounded px-2 py-1 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">交易类型</label>
                    <select value={txType} onChange={(e) => setTxType(e.target.value as 'buy' | 'sell')} className="border rounded px-2 py-1 text-sm">
                      <option value="buy">买入</option>
                      <option value="sell">卖出</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">净值</label>
                    <input type="number" step="0.0001" value={txNetValue} onChange={(e) => setTxNetValue(e.target.value)} className="border rounded px-2 py-1 text-sm w-24" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">份数</label>
                    <input type="number" step="0.01" value={txShares} onChange={(e) => setTxShares(e.target.value)} className="border rounded px-2 py-1 text-sm w-24" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">投资笔记</label>
                    <input value={txNote} onChange={(e) => setTxNote(e.target.value)} className="border rounded px-2 py-1 text-sm w-32" />
                  </div>
                  <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm">保存</button>
                </form>
              )}

              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-left px-3 py-2">日期</th>
                      <th className="text-left px-3 py-2">类型</th>
                      <th className="text-left px-3 py-2">净值</th>
                      <th className="text-left px-3 py-2">份数</th>
                      <th className="text-left px-3 py-2">金额</th>
                      <th className="text-left px-3 py-2">投资笔记</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fund.transactions.map((tx) => (
                      <tr key={tx.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2">{tx.date}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.type === 'buy' || tx.type === 'initial' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {tx.type === 'initial' ? '初始持仓' : tx.type === 'buy' ? '买入' : '卖出'}
                          </span>
                        </td>
                        <td className="px-3 py-2">{tx.netValue.toFixed(4)}</td>
                        <td className="px-3 py-2">{tx.shares.toFixed(2)}</td>
                        <td className={`px-3 py-2 ${tx.type === 'sell' ? 'text-green-600' : ''}`}>{tx.type === 'sell' ? '-' : ''}{tx.amount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-gray-500">{tx.note}</td>
                        <td className="px-3 py-2">
                          {tx.type !== 'initial' && (
                            <button onClick={() => onRemoveTx(fund.code, tx.id)} className="text-gray-400 hover:text-red-500 transition">
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
          )}

          <div className="flex justify-end gap-3 pt-2">
            {!readOnly && (
              <>
                <button onClick={handleRefresh} disabled={refreshing} className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1 transition disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? '刷新中...' : '刷新此基金'}
                </button>
                <button onClick={() => { if (confirm('确定删除该基金？所有相关数据将被清除。')) onRemove(fund.code); }} className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1 transition">
                  <Trash2 className="w-4 h-4" /> 删除基金
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
