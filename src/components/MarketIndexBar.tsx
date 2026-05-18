import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchMarketIndices, MarketIndex } from '../data/marketIndexApi';
import { TrendingUp, TrendingDown, Activity, Loader2 } from 'lucide-react';

const POLL_INTERVAL = 30000; // 30 seconds

function formatChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function formatPercent(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function IndexItem({ index }: { index: MarketIndex }) {
  const isUp = index.changePercent >= 0;
  const colorClass = isUp ? 'text-red-600' : 'text-green-600';
  const bgClass = isUp ? 'bg-red-50' : 'bg-green-50';
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${bgClass} whitespace-nowrap`}>
      <Icon className={`w-3 h-3 ${colorClass}`} />
      <span className="text-xs font-medium text-gray-700">{index.name}</span>
      <span className="text-xs text-gray-900 font-semibold">{index.current.toFixed(2)}</span>
      <span className={`text-xs font-medium ${colorClass}`}>
        {formatChange(index.changeAmount)}({formatPercent(index.changePercent)})
      </span>
    </div>
  );
}

export default function MarketIndexBar() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchMarketIndices();
      setIndices(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  if (error && indices.length === 0) {
    return (
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-1.5 flex items-center gap-2 text-xs text-gray-400">
          <Activity className="w-3 h-3" />
          <span>行情获取失败</span>
          <button onClick={load} className="text-blue-500 hover:text-blue-600 underline">重试</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-gray-50 border-b border-gray-200 cursor-pointer select-none"
      onClick={load}
      title="点击刷新行情"
    >
      <div className="max-w-5xl mx-auto px-4 py-1.5 flex items-center gap-3 overflow-x-auto">
        {indices.length === 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>加载行情中...</span>
          </div>
        ) : (
          <>
            {indices.map((idx) => (
              <IndexItem key={idx.code} index={idx} />
            ))}
            {loading && <Loader2 className="w-3 h-3 text-gray-300 animate-spin flex-shrink-0" />}
          </>
        )}
      </div>
    </div>
  );
}
