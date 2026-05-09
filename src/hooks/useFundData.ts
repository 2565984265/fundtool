import { useState, useEffect, useCallback } from 'react';
import { FundData, FundHolding, Transaction, FundInfo } from '../types';
import { loadData, saveData } from '../utils/storage';
import { recalcHolding, generateId } from '../utils/calculate';
import { fetchFundInfo } from '../data/fundApi';

export function useFundData() {
  const [data, setData] = useState<FundData>(loadData);
  const [fundInfos, setFundInfos] = useState<Record<string, FundInfo>>({});

  useEffect(() => {
    saveData(data);
  }, [data]);

  const refreshFundInfos = useCallback(async () => {
    const infos: Record<string, FundInfo> = {};
    for (const fund of data.funds) {
      const info = await fetchFundInfo(fund.code);
      if (info) {
        infos[fund.code] = info;
      }
    }
    setFundInfos(infos);
  }, [data.funds]);

  useEffect(() => {
    refreshFundInfos();
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

  return {
    data,
    fundInfos,
    refreshFundInfos,
    addFund,
    removeFund,
    addTransaction,
    removeTransaction,
    updateFund,
  };
}
