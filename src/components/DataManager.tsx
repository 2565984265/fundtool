import { useState } from 'react';
import { Download, Upload, Save, RotateCcw, FileJson, ChevronDown, ChevronUp } from 'lucide-react';
import { loadBackups, saveBackups, exportData, importData } from '../utils/storage';
import { FundData } from '../types';
import { generateId } from '../utils/calculate';

interface Props {
  data: FundData;
  onRestore: (data: FundData) => void;
}

export default function DataManager({ data, onRestore }: Props) {
  const [backups, setBackups] = useState(loadBackups);
  const [showSection, setShowSection] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [importText, setImportText] = useState('');

  const handleBackup = () => {
    const name = backupName.trim() || new Date().toLocaleString();
    const newBackup = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(data)),
    };
    const updated = [newBackup, ...backups];
    saveBackups(updated);
    setBackups(updated);
    setBackupName('');
  };

  const handleRestore = (backupData: FundData) => {
    if (confirm('确定要恢复此备份？当前数据将被覆盖。')) {
      onRestore(backupData);
    }
  };

  const handleDeleteBackup = (id: string) => {
    const updated = backups.filter((b) => b.id !== id);
    saveBackups(updated);
    setBackups(updated);
  };

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fundtool-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    if (importData(importText)) {
      alert('导入成功！页面将刷新。');
      window.location.reload();
    } else {
      alert('导入失败，请检查JSON格式');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      <div className="p-5 cursor-pointer hover:bg-gray-50 transition" onClick={() => setShowSection(!showSection)}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
            <Save className="w-5 h-5" />
            💾 数据管理
          </h2>
          {showSection ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {showSection && (
        <div className="border-t border-gray-100 px-5 pb-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-gray-800"><Save className="w-4 h-4" /> 创建备份</h4>
              <div className="flex gap-2">
                <input
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  placeholder="备份名称（可选）"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleBackup} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">备份</button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-gray-800"><FileJson className="w-4 h-4" /> 导入/导出</h4>
              <div className="flex gap-2 mb-3">
                <button onClick={handleExport} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-1 transition font-medium"><Download className="w-4 h-4" /> 导出JSON</button>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="粘贴JSON数据..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleImport} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 transition font-medium"><Upload className="w-4 h-4" /> 导入</button>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-gray-800"><RotateCcw className="w-4 h-4" /> 备份列表</h4>
            {backups.length === 0 ? (
              <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-4">暂无备份，建议定期创建备份以防止数据丢失。</p>
            ) : (
              <div className="space-y-2">
                {backups.map((b) => (
                  <div key={b.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-3">
                    <div>
                      <div className="font-medium text-sm">{b.name}</div>
                      <div className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleString()} · {b.data.funds.length} 只基金</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRestore(b.data)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">恢复</button>
                      <button onClick={() => handleDeleteBackup(b.id)} className="text-red-500 hover:text-red-600 text-sm font-medium">删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <h4 className="font-bold mb-1">备份功能说明</h4>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>备份是您所有基金数据的快照，包含所有基金的净值信息和交易记录</li>
              <li>备份仅存储在您的浏览器中，清除浏览器缓存会同时删除备份</li>
              <li>如果需要切换设备或者用别的浏览器打开，请使用数据导出和导入功能</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
