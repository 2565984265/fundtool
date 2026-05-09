import AddFund from './components/AddFund';
import GlobalStats from './components/GlobalStats';
import FundDetail from './components/FundDetail';
import DataManager from './components/DataManager';
import GlobalTransactions from './components/GlobalTransactions';
import EmptyState from './components/EmptyState';
import { useFundData } from './hooks/useFundData';
import { RefreshCw, TrendingUp, Clock } from 'lucide-react';

function App() {
  const {
    data,
    fundInfos,
    lastUpdated,
    loading,
    refreshFundInfos,
    refreshSingleFund,
    addFund,
    removeFund,
    addTransaction,
    removeTransaction,
    updateHoldingSettings,
  } = useFundData();

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
            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                更新于 {lastUpdated}
              </div>
            )}
            <button
              onClick={refreshFundInfos}
              disabled={loading}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-1 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? '刷新中...' : '刷新数据'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <AddFund onAdd={addFund} />

        {data.funds.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <GlobalStats funds={data.funds} fundInfos={fundInfos} />

            <div className="mb-6">
              <h2 className="text-lg font-bold mb-4 text-gray-800">📈 所有基金持仓收益概览</h2>
              {data.funds.map((fund) => (
                <FundDetail
                  key={fund.code}
                  fund={fund}
                  info={fundInfos[fund.code]}
                  onRemove={removeFund}
                  onAddTx={addTransaction}
                  onRemoveTx={removeTransaction}
                  onUpdateSettings={updateHoldingSettings}
                  onRefresh={() => refreshSingleFund(fund.code)}
                />
              ))}
            </div>

            <GlobalTransactions funds={data.funds} onRemoveTx={removeTransaction} />
          </>
        )}

        <DataManager
          data={data}
          onRestore={(d) => {
            localStorage.setItem('fundtool_data', JSON.stringify(d));
            window.location.reload();
          }}
        />

        <div className="text-center text-xs text-gray-400 py-6">
          所有数据存储在您的浏览器本地，不会上传到任何服务器。
        </div>
      </main>
    </div>
  );
}

export default App;
