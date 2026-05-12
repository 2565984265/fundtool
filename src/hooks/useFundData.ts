import { useState, useEffect, useCallback, useRef } from 'react';
import { FundData, FundHolding, Transaction, FundInfo } from '../types';
import { loadAccountData, saveAccountData } from '../utils/storage';
import { recalcHolding, generateId } from '../utils/calculate';
import { fetchFundInfo } from '../data/fundApi';

export function useFundData(accountId: string) {
  const [data, setData] = useState<FundData>({ funds: [] });
  const [fundInfos, setFundInfos] = useState<Record<string, FundInfo>>({});
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);
  const prevAccountRef = useRef(accountId);

  // Core refresh logic that takes funds as parameter (avoids stale closure)
  const collectValuation = useCallback((fund: FundHolding, info: FundInfo): FundHolding => {
    if (!info.estimateValue || info.estimateValue <= 0) return fund;
    // Use local date (zh-CN) to avoid UTC timezone issue
    const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
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

  const doRefresh = useCallback(async (funds: FundHolding[]) => {
    if (!accountId || funds.length === 0) return;
    setLoading(true);
    const infos: Record<string, FundInfo> = {};
    for (const fund of funds) {
      const info = await fetchFundInfo(fund.code);
      if (info) {
        infos[fund.code] = info;
      }
    }
    setFundInfos((prev) => ({ ...prev, ...infos }));
    setLastUpdated(new Date().toLocaleString());

    // auto collect valuation history and cache confirmed net value
    setData((prev) => ({
      funds: prev.funds.map((f) => {
        const info = infos[f.code];
        if (!info) return f;
        const updated = collectValuation(f, info);
        // Cache confirmed net value (dwjz) by date to ensure P&L stability
        const apiDate = info.netValueDate;
        const cachedDate = updated.lastNetValueDate || '';
        if (!updated.lastNetValue || apiDate > cachedDate) {
          return {
            ...updated,
            lastNetValue: info.netValue,
            lastNetValueDate: apiDate,
          };
        }
        return updated;
      }),
    }));

    setLoading(false);
  }, [accountId, collectValuation]);

  // Load data when accountId changes, then auto-refresh
  useEffect(() => {
    if (accountId) {
      const loaded = loadAccountData(accountId);
      setData(loaded);
      setFundInfos({});
      setLastUpdated('');
      if (loaded.funds.length > 0) {
        doRefresh(loaded.funds);
      }
    } else {
      setData({ funds: [] });
      setFundInfos({});
      setLastUpdated('');
    }
  }, [accountId, doRefresh]);

  // Auto-save (skip first render and account switches to avoid overwriting with stale data)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevAccountRef.current = accountId;
      return;
    }
    // Only save when account hasn't changed (data is already loaded for this account)
    if (accountId && prevAccountRef.current === accountId) {
      saveAccountData(accountId, data);
    }
    prevAccountRef.current = accountId;
  }, [accountId, data]);

  const refreshFundInfos = useCallback(async () => {
    await doRefresh(data.funds);
  }, [data.funds, doRefresh]);

  const refreshSingleFund = useCallback(async (code: string) => {
    if (!accountId) return;
    const info = await fetchFundInfo(code);
    if (!info) return;
    setFundInfos((prev) => ({ ...prev, [code]: info }));
    setLastUpdated(new Date().toLocaleString());
    setData((prev) => ({
      funds: prev.funds.map((f) => {
        if (f.code !== code) return f;
        const updated = collectValuation(f, info);
        // Update cached net value if API returned a newer date
        const apiDate = info.netValueDate;
        const cachedDate = updated.lastNetValueDate || '';
        if (!updated.lastNetValue || apiDate > cachedDate) {
          return { ...updated, lastNetValue: info.netValue, lastNetValueDate: apiDate };
        }
        return updated;
      }),
    }));
  }, [accountId, collectValuation]);

  const addFund = useCallback(async (code: string, startDate: string, avgCost: number, shares: number) => {
    if (!accountId) return false;
    // Check duplicate
    const exists = data.funds.some((f) => f.code === code);
    if (exists) return false;

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
      lastNetValue: info.netValue,
      lastNetValueDate: info.netValueDate,
    };

    const holdingWithVal = collectValuation(holding, info);
    setFundInfos((prev) => ({ ...prev, [code]: info }));
    setData((prev) => ({
      funds: [...prev.funds, holdingWithVal],
    }));
    return true;
  }, [accountId, data.funds, collectValuation]);

  const importFund = useCallback(async (code: string, startDate: string, avgCost: number, shares: number) => {
    if (!accountId) return false;
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
      lastNetValue: info.netValue,
      lastNetValueDate: info.netValueDate,
    };

    const holdingWithVal = collectValuation(holding, info);
    setFundInfos((prev) => ({ ...prev, [code]: info }));
    setData((prev) => {
      // Remove existing fund with same code, then add new one
      const filtered = prev.funds.filter((f) => f.code !== code);
      return { funds: [...filtered, holdingWithVal] };
    });
    return true;
  }, [accountId, collectValuation]);

  const removeFund = useCallback((code: string) => {
    if (!accountId) return;
    setData((prev) => ({
      funds: prev.funds.filter((f) => f.code !== code),
    }));
  }, [accountId]);

  const removeFunds = useCallback((codes: string[]) => {
    if (!accountId) return;
    const codeSet = new Set(codes);
    setData((prev) => ({
      funds: prev.funds.filter((f) => !codeSet.has(f.code)),
    }));
  }, [accountId]);

  const addTransaction = useCallback((code: string, tx: Omit<Transaction, 'id'>) => {
    if (!accountId) return;
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
  }, [accountId]);

  const removeTransaction = useCallback((code: string, txId: string) => {
    if (!accountId) return;
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
  }, [accountId]);

  const updateFund = useCallback((code: string, updates: Partial<FundHolding>) => {
    if (!accountId) return;
    setData((prev) => ({
      funds: prev.funds.map((f) => (f.code === code ? { ...f, ...updates } : f)),
    }));
  }, [accountId]);

  const updateHoldingSettings = useCallback((code: string, startDate: string, avgCost: number, shares: number) => {
    if (!accountId) return;
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
  }, [accountId]);

  return {
    data,
    fundInfos,
    lastUpdated,
    loading,
    refreshFundInfos,
    refreshSingleFund,
    addFund,
    importFund,
    removeFund,
    removeFunds,
    addTransaction,
    removeTransaction,
    updateFund,
    updateHoldingSettings,
  };
}
