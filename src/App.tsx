import { useState, useMemo, useEffect, useCallback } from 'react';
import AddFund from './components/AddFund';
import GlobalStats from './components/GlobalStats';
import FundDetail from './components/FundDetail';
import DataManager from './components/DataManager';
import GlobalTransactions from './components/GlobalTransactions';
import EmptyState from './components/EmptyState';
import ImageImport from './components/ImageImport';
import AccountManager from './components/AccountManager';
import { useFundData } from './hooks/useFundData';
import {
  loadAccountsMeta,
  saveAccountsMeta,
  migrateLegacyData,
  loadAccountData,
  saveAccountData,
} from './utils/storage';
import { fetchFundInfo } from './data/fundApi';
import { AccountsMeta, FundData, FundHolding, FundInfo } from './types';
import {
  RefreshCw,
  TrendingUp,
  Clock,
  ChevronDown,
  Users,
  Trash2,
  X,
  CheckSquare,
  Square,
  LayoutList,
} from 'lucide-react';

function App() {
  // ─── Accounts State ───
  const [accountsMeta, setAccountsMeta] = useState<AccountsMeta>(() => {
    let meta = loadAccountsMeta();
    if (!meta.accounts.length) {
      meta = migrateLegacyData();
    }
    return meta;
  });

  const currentAccountId = accountsMeta.currentAccountId;
  const isAllView = currentAccountId === 'all';

  // Normal account hook
  const normalAccountId = isAllView ? '' : currentAccountId;
  const {
    data: accountData,
    fundInfos: accountFundInfos,
    lastUpdated: accountLastUpdated,
    loading: accountLoading,
    refreshFundInfos: refreshAccountFunds,
    refreshSingleFund: refreshAccountSingle,
    addFund,
    importFund,
    removeFund,
    removeFunds,
    addTransaction,
    removeTransaction,
    updateHoldingSettings,
  } = useFundData(normalAccountId);

  // ─── All-accounts view state ───
  const [allViewData, setAllViewData] = useState<FundData>({ funds: [] });
  const [allViewFundInfos, setAllViewFundInfos] = useState<Record<string, FundInfo>>({});
  const [allViewLoading, setAllViewLoading] = useState(false);
  const [allViewLastUpdated, setAllViewLastUpdated] = useState('');

  // Load all accounts data when switching to 'all' view
  useEffect(() => {
    if (!isAllView) return;
    loadAllViewData();
  }, [isAllView, accountsMeta.accounts.length]);

  const loadAllViewData = useCallback(async () => {
    const allFunds: FundHolding[] = [];
    for (const acc of accountsMeta.accounts) {
      const data = loadAccountData(acc.id);
      for (const fund of data.funds) {
        allFunds.push({ ...fund, accountId: acc.id, accountName: acc.name });
      }
    }
    setAllViewData({ funds: allFunds });
  }, [accountsMeta.accounts]);

  const refreshAllView = useCallback(async () => {
    setAllViewLoading(true);
    const infos: Record<string, FundInfo> = {};
    const allFunds: FundHolding[] = [];

    for (const acc of accountsMeta.accounts) {
      const data = loadAccountData(acc.id);
      for (const fund of data.funds) {
        const info = await fetchFundInfo(fund.code);
        if (info) {
          infos[fund.code] = info;
        }
        allFunds.push({ ...fund, accountId: acc.id, accountName: acc.name });
      }
    }

    setAllViewFundInfos(infos);
    setAllViewData({ funds: allFunds });
    setAllViewLastUpdated(new Date().toLocaleString());
    setAllViewLoading(false);
  }, [accountsMeta.accounts]);

  // ─── Display data (unified for normal & all view) ───
  const displayData = isAllView ? allViewData : accountData;
  const displayFundInfos = isAllView ? allViewFundInfos : accountFundInfos;
  const displayLoading = isAllView ? allViewLoading : accountLoading;
  const displayLastUpdated = isAllView ? allViewLastUpdated : accountLastUpdated;

  const handleRefresh = () => {
    if (isAllView) {
      refreshAllView();
    } else {
      refreshAccountFunds();
    }
  };

  const handleRefreshSingle = async (code: string) => {
    if (isAllView) {
      const info = await fetchFundInfo(code);
      if (info) {
        setAllViewFundInfos((prev) => ({ ...prev, [code]: info }));
        setAllViewLastUpdated(new Date().toLocaleString());
      }
    } else {
      await refreshAccountSingle(code);
    }
  };

  // ─── Batch delete ───
  const [batchMode, setBatchMode] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  const toggleBatchMode = () => {
    if (batchMode) {
      setBatchMode(false);
      setSelectedCodes(new Set());
    } else {
      setBatchMode(true);
    }
  };

  const toggleSelect = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCodes(new Set(displayData.funds.map((f) => f.code)));
  };

  const deselectAll = () => {
    setSelectedCodes(new Set());
  };

  const handleBatchDelete = () => {
    if (selectedCodes.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedCodes.size} 只基金？所有相关数据将被清除。`)) return;
    removeFunds(Array.from(selectedCodes));
    setSelectedCodes(new Set());
    setBatchMode(false);
  };

  // ─── Account switch handler ───
  const handleSwitchAccount = (id: string) => {
    const updated = { ...accountsMeta, currentAccountId: id };
    saveAccountsMeta(updated);
    setAccountsMeta(updated);
    setBatchMode(false);
    setSelectedCodes(new Set());
  };

  // ─── Account manager callback ───
  const handleAccountsChange = (meta: AccountsMeta) => {
    setAccountsMeta(meta);
    // If current account was deleted, switch to the first available
    if (
      meta.currentAccountId &&
      !meta.accounts.find((a) => a.id === meta.currentAccountId)
    ) {
      const first = meta.accounts[0]?.id || '';
      const updated = { ...meta, currentAccountId: first };
      saveAccountsMeta(updated);
      setAccountsMeta(updated);
    }
  };

  // Build account options for dropdown
  const currentAccountName = useMemo(() => {
    if (isAllView) return '全部账户';
    return accountsMeta.accounts.find((a) => a.id === currentAccountId)?.name || '默认账户';
  }, [accountsMeta, currentAccountId, isAllView]);

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">FundTool</h1>
              <p className="text-xs text-gray-400">基金投资管理工具</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Account switcher */}
            <div className="relative">
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
              >
                <Users className="w-4 h-4" />
                <span className="max-w-[100px] truncate hidden sm:inline">{currentAccountName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showAccountDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowAccountDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    {accountsMeta.accounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          handleSwitchAccount(acc.id);
                          setShowAccountDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                          acc.id === currentAccountId ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'
                        }`}
                      >
                        {acc.id === currentAccountId && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {acc.id !== currentAccountId && <span className="w-4 flex-shrink-0" />}
                        <span className="truncate">{acc.name}</span>
                      </button>
                    ))}
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => {
                        handleSwitchAccount('all');
                        setShowAccountDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                        isAllView ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'
                      }`}
                    >
                      {isAllView && (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {!isAllView && <span className="w-4 flex-shrink-0" />}
                      <span className="truncate">📊 全部账户</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <AccountManager meta={accountsMeta} onChange={handleAccountsChange} />

            {displayLastUpdated && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                更新于 {displayLastUpdated}
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={displayLoading}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-1 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${displayLoading ? 'animate-spin' : ''}`} /> {displayLoading ? '刷新中...' : '刷新数据'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Add fund / Image import */}
        {!isAllView && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1">
              <AddFund onAdd={addFund} />
            </div>
            <div className="flex items-start pt-6">
              <ImageImport onImport={importFund} existingCodes={new Set(accountData.funds.map(f => f.code))} />
            </div>
          </div>
        )}

        {displayData.funds.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <GlobalStats funds={displayData.funds} fundInfos={displayFundInfos} />

            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  {isAllView ? '📊 全部账户持仓收益概览' : '📈 所有基金持仓收益概览'}
                </h2>
                {!isAllView && (
                  <div className="flex items-center gap-2">
                    {batchMode ? (
                      <>
                        <button
                          onClick={selectAll}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                        >
                          <CheckSquare className="w-3.5 h-3.5" /> 全选
                        </button>
                        <button
                          onClick={deselectAll}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                        >
                          <Square className="w-3.5 h-3.5" /> 取消
                        </button>
                        <button
                          onClick={toggleBatchMode}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                        >
                          <X className="w-3.5 h-3.5" /> 退出管理
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={toggleBatchMode}
                        className="text-xs bg-white border border-gray-200 hover:border-blue-400 text-gray-700 hover:text-blue-600 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                      >
                        <LayoutList className="w-3.5 h-3.5" /> 批量管理
                      </button>
                    )}
                  </div>
                )}
              </div>

              {displayData.funds.map((fund) => (
                <FundDetail
                  key={fund.accountId ? `${fund.accountId}-${fund.code}` : fund.code}
                  fund={fund}
                  info={displayFundInfos[fund.code]}
                  onRemove={removeFund}
                  onAddTx={addTransaction}
                  onRemoveTx={removeTransaction}
                  onUpdateSettings={updateHoldingSettings}
                  onRefresh={() => handleRefreshSingle(fund.code)}
                  batchMode={batchMode}
                  selected={selectedCodes.has(fund.code)}
                  onToggleSelect={toggleSelect}
                  readOnly={isAllView}
                />
              ))}
            </div>

            {!isAllView && <GlobalTransactions funds={displayData.funds} onRemoveTx={removeTransaction} />}
          </>
        )}

        {!isAllView && (
          <DataManager
            data={accountData}
            onRestore={(d) => {
              if (normalAccountId) {
                saveAccountData(normalAccountId, d);
                window.location.reload();
              }
            }}
          />
        )}

        <div className="text-center text-xs text-gray-400 py-6">
          所有数据存储在您的浏览器本地，不会上传到任何服务器。
        </div>
      </main>

      {/* Batch delete floating bar */}
      {batchMode && selectedCodes.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-3 flex items-center gap-4 z-30">
          <span className="text-sm text-gray-700">
            已选 <span className="font-bold text-blue-600">{selectedCodes.size}</span> 只基金
          </span>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={handleBatchDelete}
            className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition font-medium"
          >
            <Trash2 className="w-4 h-4" /> 删除选中
          </button>
          <button
            onClick={() => {
              setBatchMode(false);
              setSelectedCodes(new Set());
            }}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5 transition"
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
