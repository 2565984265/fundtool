import AddFund from './components/AddFund';
import GlobalStats from './components/GlobalStats';
import FundDetail from './components/FundDetail';
import DataManager from './components/DataManager';
import { useFundData } from './hooks/useFundData';
import { RefreshCw } from 'lucide-react';

function App() {
  const { data, fundInfos, refreshFundInfos, addFund, removeFund, addTransaction, removeTransaction } = useFundData();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">F</div>
            <h1 className="text-xl font-bold text-gray-900">FundTool</h1>
          </div>
          <button
            onClick={refreshFundInfos}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" /> 刷新数据
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <AddFund onAdd={addFund} />

        {data.funds.length > 0 && (
          <>
            <GlobalStats funds={data.funds} fundInfos={fundInfos} />

            <div className="mb-6">
              <h2 className="text-lg font-bold mb-4">📈 所有基金持仓收益概览</h2>
              {data.funds.map((fund) => (
                <FundDetail
                  key={fund.code}
                  fund={fund}
                  info={fundInfos[fund.code]}
                  onRemove={removeFund}
                  onAddTx={addTransaction}
                  onRemoveTx={removeTransaction}
                />
              ))}
            </div>
          </>
        )}

        <DataManager data={data} onRestore={(d) => { localStorage.setItem('fundtool_data', JSON.stringify(d)); window.location.reload(); }} />

        <div className="text-center text-xs text-gray-400 py-6">
          所有数据存储在您的浏览器本地，不会上传到任何服务器。
        </div>
      </main>
    </div>
  );
}

export default App;
