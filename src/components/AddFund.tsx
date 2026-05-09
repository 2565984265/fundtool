import { useState } from 'react';
import { Plus } from 'lucide-react';

interface Props {
  onAdd: (code: string, startDate: string, avgCost: number, shares: number) => Promise<boolean>;
}

export default function AddFund({ onAdd }: Props) {
  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [avgCost, setAvgCost] = useState('');
  const [shares, setShares] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !avgCost || !shares) return;
    setLoading(true);
    const ok = await onAdd(code.trim(), startDate, parseFloat(avgCost), parseFloat(shares));
    setLoading(false);
    if (ok) {
      setCode('');
      setAvgCost('');
      setShares('');
    } else {
      alert('基金代码无效或获取失败，请检查代码');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5" />
        快速添加基金
      </h2>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[120px]">
          <label className="block text-sm font-medium text-gray-600 mb-1">基金代码</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="如: 000001"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">起始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">平均成本</label>
          <input
            type="number"
            step="0.0001"
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            placeholder="元"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">持仓份数</label>
          <input
            type="number"
            step="0.01"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="份"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {loading ? '获取中...' : '添加'}
        </button>
      </div>
    </form>
  );
}
