import { useState, useEffect, useCallback, useRef } from 'react';
import { FundData, FundHolding, Transaction, FundInfo } from '../types';
import { loadData, saveData } from '../utils/storage';
import { recalcHolding, generateId } from '../utils/calculate';
import { fetchFundInfo } from '../data/fundApi';

export function useFundData() {
  const [data, setData] = useState<FundData>(loadData);
  const [fundInfos, setFundInfos] = useState<Record<string, FundInfo>>({});
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const collectValuation = useCallback((fund: FundHolding, info: FundInfo): FundHolding => {
    if (!info.estimateValue || info.estimateValue <= 0) return fund;
    const today = new Date().toISOString().split('T')[0];
    const history = [...fund.valuationHistory];
    const idx = history.findIndex((h) => h.date === today);
    if (idx >= 0) {
      history[idx] = { date: today, value: info.estimateValue };
    } else {
      history.push({ date: today, value: info.estimateValue });
    }
    // keep last 90 days
    if (history.length > 90) history.splice(0, history.length - 90);
    return { ...fund, valuationHistory: history };
  }, []);

  const refreshFundInfos = useCallback(async () => {
    setLoading(true);
    const infos: Record<string, FundInfo> = {};
    for (const fund of data.funds) {
      const info = await fetchFundInfo(fund.code);
      if (info) {
        infos[fund.code] = info;
      }
    }
    setFundInfos(infos);
    setLastUpdated(new Date().toLocaleString());

    // auto collect valuation history
    setData((prev) => ({
      funds: prev.funds.map((f) => {
        const info = infos[f.code];
        if (!info) return f;
        return collectValuation(f, info);
      }),
    }));

    setLoading(false);
  }, [data.funds, collectValuation]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      refreshFundInfos();
    }
  }, [refreshFundInfos]);

  const addFund = useCallback(async (code: string, startDate: string, avgCost: number, shares: number) => {
    const info = await fetchFundInfo(code);
    if (!info) return false;

    const tx: Transaction = {
      id: generateId(),
      date: startDate,
      type: 'initial',
      netValue: avgCost,
      shares,
      amount: avgCost * shares,
    };

    const holding: FundHolding = {
      code,
      name: info.name,
      shares,
      avgCost,
      totalCost: avgCost * shares,
      transactions: [tx],
      startDate,
      valuationHistory: [],
    };

    setData((prev) => ({
      funds: [...prev.funds, holding],
    }));
    return true;
  }, []);

  const removeFund = useCallback((code: string) => {
    setData((prev) => ({
      funds: prev.funds.filter((f) => f.code !== code),
    }));
  }, []);

  const addTransaction = useCallback((code: string, tx: Omit<Transaction, 'id'>) => {
    setData((prev) => {
      const funds = prev.funds.map((f) => {
        if (f.code !== code) return f;
        const updated = recalcHolding({
          ...f,
          transactions: [...f.transactions, { ...tx, id: generateId() }],
        });
        return updated;
      });
      return { funds };
    });
  }, []);

  const removeTransaction = useCallback((code: string, txId: string) => {
    setData((prev) => {
      const funds = prev.funds.map((f) => {
        if (f.code !== code) return f;
        const updated = recalcHolding({
          ...f,
          transactions: f.transactions.filter((t) => t.id !== txId),
        });
        return updated;
      });
      return { funds };
    });
  }, []);

  const updateFund = useCallback((code: string, updates: Partial<FundHolding>) => {
    setData((prev) => ({
      funds: prev.funds.map((f) => (f.code === code ? { ...f, ...updates } : f)),
    }));
  }, []);

  const updateHoldingSettings = useCallback((code: string, startDate: string, avgCost: number, shares: number) => {
    setData((prev) => {
      const funds = prev.funds.map((f) => {
        if (f.code !== code) return f;
        const tx = f.transactions.find((t) => t.type === 'initial');
        if (!tx) return f;
        const updatedTxs = f.transactions.map((t) =>
          t.id === tx.id
            ? { ...t, date: startDate, netValue: avgCost, shares, amount: avgCost * shares }
            : t
        );
        return recalcHolding({
          ...f,
          startDate,
          transactions: updatedTxs,
        });
      });
      return { funds };
    });
  }, []);

  return {
    data,
    fundInfos,
    lastUpdated,
    loading,
    refreshFundInfos,
    addFund,
    removeFund,
    addTransaction,
    removeTransaction,
    updateFund,
    updateHoldingSettings,
  };
}
