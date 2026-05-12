import { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, User, Users } from 'lucide-react';
import { Account, AccountsMeta } from '../types';
import { generateId } from '../utils/calculate';
import {
  saveAccountsMeta,
  saveAccountData,
  deleteAccountData,
} from '../utils/storage';

interface Props {
  meta: AccountsMeta;
  onChange: (meta: AccountsMeta) => void;
}

export default function AccountManager({ meta, onChange }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const open = () => setShowModal(true);
  const close = () => {
    setShowModal(false);
    setNewName('');
    setEditingId(null);
    setEditName('');
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const newAccount: Account = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
    };
    const updated: AccountsMeta = {
      accounts: [...meta.accounts, newAccount],
      currentAccountId: meta.currentAccountId,
    };
    saveAccountsMeta(updated);
    saveAccountData(newAccount.id, { funds: [] });
    onChange(updated);
    setNewName('');
  };

  const handleRename = (id: string) => {
    const name = editName.trim();
    if (!name) return;
    const updated: AccountsMeta = {
      ...meta,
      accounts: meta.accounts.map((a) => (a.id === id ? { ...a, name } : a)),
    };
    saveAccountsMeta(updated);
    onChange(updated);
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (id: string) => {
    if (meta.accounts.length <= 1) {
      alert('至少需要保留一个账户');
      return;
    }
    if (!confirm(`确定删除账户「${meta.accounts.find((a) => a.id === id)?.name}」？该账户下的所有基金数据将被永久删除。`)) {
      return;
    }
    const remaining = meta.accounts.filter((a) => a.id !== id);
    const updated: AccountsMeta = {
      accounts: remaining,
      currentAccountId: meta.currentAccountId === id ? remaining[0].id : meta.currentAccountId,
    };
    saveAccountsMeta(updated);
    deleteAccountData(id);
    onChange(updated);
  };

  const handleSwitch = (id: string) => {
    const updated = { ...meta, currentAccountId: id };
    saveAccountsMeta(updated);
    onChange(updated);
  };

  return (
    <>
      <button
        onClick={open}
        className="text-sm bg-white border border-gray-200 hover:border-blue-400 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
        title="管理账户"
      >
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">账户管理</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                账户管理
              </h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Add new account */}
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="新账户名称"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd();
                  }}
                />
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> 添加
                </button>
              </div>

              {/* Account list */}
              <div className="space-y-2">
                {meta.accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                      acc.id === meta.currentAccountId
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      {editingId === acc.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-40"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(acc.id);
                            if (e.key === 'Escape') {
                              setEditingId(null);
                              setEditName('');
                            }
                          }}
                        />
                      ) : (
                        <span className="font-medium text-sm truncate">
                          {acc.name}
                          {acc.id === meta.currentAccountId && (
                            <span className="ml-1.5 text-xs text-blue-600 font-normal">当前</span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {editingId === acc.id ? (
                        <button
                          onClick={() => handleRename(acc.id)}
                          className="text-green-600 hover:text-green-700 p-1.5 rounded hover:bg-green-50 transition"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <>
                          {acc.id !== meta.currentAccountId && (
                            <button
                              onClick={() => handleSwitch(acc.id)}
                              className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition font-medium"
                            >
                              切换
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingId(acc.id);
                              setEditName(acc.name);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-100 transition"
                            title="重命名"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(acc.id)}
                            className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {meta.accounts.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">暂无账户</p>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end">
              <button onClick={close} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
