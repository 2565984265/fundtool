import { useState } from 'react';
import { FundHolding } from '../types';
import { Trash2 } from 'lucide-react';

interface Props {
  funds: FundHolding[];
  onRemoveTx: (code: string, txId: string) => void;
}

export default function GlobalTransactions({ funds, onRemoveTx }: Props) {
  const [expanded, setExpanded] = useState(false);

  const allTx = funds
    .flatMap((f) => f.transactions.map((tx) => ({ ...tx, fundName: f.name, fundCode: f.code })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allTx.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      <div className="p-5 cursor-pointer hover:bg-gray-50 transition" onClick={() => setExpanded(!expanded)}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">📋 交易记录 ({allTx.length} 笔)</h2>
          <span className="text-sm text-gray-400">{expanded ? '收起' : '展开'}</span>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5">
          <div className="overflow-x-auto rounded-lg border border-gray-100 mt-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-3 py-2">基金</th>
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
                {allTx.map((tx) => (
                  <tr key={`${tx.fundCode}-${tx.id}`} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{tx.fundName} <span className="text-gray-400 text-xs">({tx.fundCode})</span></td>
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
                        <button onClick={() => onRemoveTx(tx.fundCode, tx.id)} className="text-gray-400 hover:text-red-500 transition">
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
    </div>
  );
}
