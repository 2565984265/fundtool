import { useState } from 'react';
import { Plus, Search } from 'lucide-react';

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
      alert('基金代码无效或获取失败，请检查代码（如 000001）');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
        <Plus className="w-5 h-5" />
        快速添加基金
      </h2>
      <p className="text-sm text-gray-500 mb-4">输入基金代码后点击添加，系统会自动获取基金信息并创建新的基金标签。</p>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-gray-600 mb-1">基金代码</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="如: 000001"
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
          <label className="block text-sm font-medium text-gray-600 mb-1">平均成本（元）</label>
          <input
            type="number"
            step="0.0001"
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            placeholder="1.0000"
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
            placeholder="1.00"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 h-[38px]"
        >
          {loading ? '获取中...' : '添加'}
        </button>
      </div>
    </form>
  );
}
