import { useState } from 'react';
import { Download, Upload, Save, RotateCcw, FileJson } from 'lucide-react';
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <button onClick={() => setShowSection(!showSection)} className="flex items-center gap-2 font-bold text-lg">
        <Save className="w-5 h-5" />
        💾 数据管理
      </button>

      {showSection && (
        <div className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Save className="w-4 h-4" /> 创建备份</h4>
              <div className="flex gap-2">
                <input
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  placeholder="备份名称（可选）"
                  className="flex-1 border rounded px-3 py-2 text-sm"
                />
                <button onClick={handleBackup} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">备份</button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><FileJson className="w-4 h-4" /> 导入/导出</h4>
              <div className="flex gap-2 mb-2">
                <button onClick={handleExport} className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-1"><Download className="w-4 h-4" /> 导出JSON</button>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="粘贴JSON数据..."
                  className="flex-1 border rounded px-3 py-2 text-sm h-20 resize-none"
                />
                <button onClick={handleImport} className="bg-orange-600 text-white px-4 py-2 rounded text-sm flex items-center gap-1"><Upload className="w-4 h-4" /> 导入</button>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><RotateCcw className="w-4 h-4" /> 备份列表</h4>
            {backups.length === 0 ? (
              <p className="text-sm text-gray-400">暂无备份</p>
            ) : (
              <div className="space-y-2">
                {backups.map((b) => (
                  <div key={b.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-3">
                    <div>
                      <div className="font-medium text-sm">{b.name}</div>
                      <div className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleString()} · {b.data.funds.length} 只基金</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRestore(b.data)} className="text-blue-600 hover:text-blue-700 text-sm">恢复</button>
                      <button onClick={() => handleDeleteBackup(b.id)} className="text-red-500 hover:text-red-600 text-sm">删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
