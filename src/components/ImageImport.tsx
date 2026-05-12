import { useState, useRef, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { Upload, X, ImagePlus, Loader2, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { parseOcrText, ParsedFund } from '../utils/ocrParser';
import { searchFundByName, searchFundCandidates } from '../data/fundSearchApi';
import { fetchFundInfo } from '../data/fundApi';
import type { FundListItem } from '../data/fundSearchApi';

interface Props {
  onImport: (code: string, startDate: string, avgCost: number, shares: number) => Promise<boolean>;
  existingCodes?: Set<string>;
}

interface PreviewItem {
  id: string;
  src: string;
  text: string;
  funds: ParsedFund[];
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
}

interface SearchModalState {
  itemId: string;
  fundIdx: number;
  candidates: FundListItem[];
  query: string;
}

export default function ImageImport({ onImport, existingCodes = new Set() }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; overwrite?: number; newAdd?: number } | null>(null);
  const [searchModal, setSearchModal] = useState<SearchModalState | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null);

  const getWorker = useCallback(async () => {
    const existing = workerRef.current;
    if (existing) return existing;
    const worker = await createWorker('chi_sim+eng', 1, {
      workerPath: '/worker.min.js',
      corePath: '/',
      langPath: '/tessdata',
      logger: (m) => {
        if (m.status === 'recognizing text') {
          // OCR progress, can be used for UI if needed
        }
      },
      errorHandler: (err) => {
        console.error('Tesseract error:', err);
      },
    });
    workerRef.current = worker;
    return worker;
  }, []);

  const autoMatchCodes = async (itemId: string, funds: ParsedFund[]) => {
    const needsMatch = funds.filter((f) => !f.code && f.name);
    if (needsMatch.length === 0) return;

    for (const fund of needsMatch) {
      const match = await searchFundByName(fund.name);
      if (match) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  funds: item.funds.map((f) =>
                    f.name === fund.name && f.code === '' ? { ...f, code: match.code, confidence: Math.min(f.confidence + 0.3, 1) } : f
                  ),
                }
              : item
          )
        );
      }
    }
  };

  const processImage = async (id: string, file: File) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'processing' as const } : item))
    );

    try {
      const worker = await getWorker();
      const ret = await worker.recognize(file as unknown as string);
      const text = ret.data.text;
      const funds = parseOcrText(text);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, text, funds, status: 'done' as const, progress: 100 } : item
        )
      );
      // Auto match codes for funds without code
      await autoMatchCodes(id, funds);
    } catch {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'error' as const } : item))
      );
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setImportResult(null);

    const placeholders: PreviewItem[] = imageFiles.map((file) => {
      const id = Math.random().toString(36).substring(2, 8);
      return {
        id,
        src: URL.createObjectURL(file),
        text: '',
        funds: [],
        status: 'pending' as const,
        progress: 0,
      };
    });
    setItems((prev) => [...prev, ...placeholders]);

    for (let i = 0; i < imageFiles.length; i++) {
      await processImage(placeholders[i].id, imageFiles[i]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const updateFund = (itemId: string, fundIdx: number, updates: Partial<ParsedFund>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              funds: item.funds.map((f, idx) => (idx === fundIdx ? { ...f, ...updates } : f)),
            }
          : item
      )
    );
  };

  const handleManualSearch = async (itemId: string, fundIdx: number, name: string) => {
    if (!name) return;
    setSearchLoading(true);
    const candidates = await searchFundCandidates(name, 8);
    setSearchLoading(false);
    if (candidates.length > 0) {
      setSearchModal({ itemId, fundIdx, candidates, query: name });
    } else {
      alert(`未找到与「${name}」相似的基金，请尝试修改名称后重新搜索，或手动输入代码。`);
    }
  };

  const handleSelectCandidate = (code: string) => {
    if (!searchModal) return;
    updateFund(searchModal.itemId, searchModal.fundIdx, { code });
    setSearchModal(null);
  };

  const handleImportAll = async () => {
    const allFunds = items.flatMap((item) => item.funds);
    // Deduplicate by code: keep the last occurrence
    const codeMap = new Map<string, ParsedFund>();
    for (const fund of allFunds) {
      if (fund.code && /^\d{6}$/.test(fund.code)) {
        codeMap.set(fund.code, fund);
      }
    }
    const toImport = Array.from(codeMap.values());
    if (toImport.length === 0) {
      alert('没有可导入的数据。请确保基金代码已正确填写。');
      return;
    }

    // Count overwrite vs new
    let overwriteCount = 0;
    let newCount = 0;
    for (const fund of toImport) {
      if (existingCodes.has(fund.code)) overwriteCount++;
      else newCount++;
    }

    const confirmMsg = overwriteCount > 0
      ? `即将导入 ${toImport.length} 只基金，其中 ${newCount} 只为新增，${overwriteCount} 只会覆盖当前持仓。确定继续？`
      : `即将导入 ${toImport.length} 只基金，均为新增。确定继续？`;
    if (!confirm(confirmMsg)) return;

    setImporting(true);
    let success = 0;
    let failed = 0;
    const startDate = importDate;

    for (const fund of toImport) {
      let shares = fund.shares;
      let avgCost = fund.avgCost;

      // If no shares/cost but has amount, fetch current net value and derive shares
      if ((shares <= 0 || avgCost <= 0) && fund.amount > 0) {
        const info = await fetchFundInfo(fund.code);
        if (info && info.netValue > 0) {
          shares = parseFloat((fund.amount / info.netValue).toFixed(2));
          avgCost = info.netValue;
        }
      }

      // Fallback defaults
      if (shares <= 0) shares = 1;
      if (avgCost <= 0) avgCost = 1;

      const ok = await onImport(fund.code, startDate, avgCost, shares);
      if (ok) success++;
      else failed++;
    }

    setImporting(false);
    setImportResult({ success, failed, overwrite: overwriteCount, newAdd: newCount });

    if (success > 0 && failed === 0) {
      setTimeout(() => {
        setShowModal(false);
        setItems([]);
        setImportResult(null);
      }, 1500);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-white border border-gray-200 hover:border-blue-400 text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
      >
        <ImagePlus className="w-4 h-4" /> 截图导入
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">📷 截图导入持仓</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {/* Upload area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition"
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 font-medium">点击或拖拽截图到此处</p>
                <p className="text-xs text-gray-400 mt-1">支持支付宝、天天基金、券商APP等持仓截图</p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </div>

              {/* Results */}
              {items.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-bold text-sm text-gray-700">识别结果 ({items.length} 张)</h3>
                  {items.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex">
                        <div className="w-32 h-32 bg-gray-100 flex-shrink-0">
                          <img src={item.src} alt="preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 p-3 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {item.status === 'pending' && <span className="text-xs text-gray-400">等待处理...</span>}
                              {item.status === 'processing' && (
                                <span className="text-xs text-blue-600 flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" /> 识别中...
                                </span>
                              )}
                              {item.status === 'done' && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> 识别完成
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span className="text-xs text-red-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> 识别失败
                                </span>
                              )}
                            </div>
                            <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {item.status === 'done' && (
                            <div>
                              {item.funds.length === 0 ? (
                                <p className="text-xs text-gray-400">未识别到基金数据，请检查截图清晰度。</p>
                              ) : (
                                <div className="space-y-2">
                                  {item.funds.map((fund, idx) => (
                                    <div key={idx} className="bg-gray-50 rounded p-2 text-sm">
                                      <div className="grid grid-cols-12 gap-2 items-end">
                                        <div className="col-span-2">
                                          <label className="block text-[10px] text-gray-400 mb-0.5">基金代码 *</label>
                                          <div className="flex gap-1">
                                            <input
                                              value={fund.code}
                                              onChange={(e) => updateFund(item.id, idx, { code: e.target.value })}
                                              className={`flex-1 border rounded px-2 py-1 text-xs ${!fund.code ? 'border-orange-300' : 'border-gray-300'}`}
                                              placeholder="000001"
                                            />
                                            <button
                                              onClick={() => handleManualSearch(item.id, idx, fund.name)}
                                              disabled={searchLoading}
                                              className="text-gray-400 hover:text-blue-600 px-1 disabled:opacity-50"
                                              title="通过名称搜索代码"
                                            >
                                              <Search className={`w-3.5 h-3.5 ${searchLoading ? 'animate-pulse' : ''}`} />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="col-span-3">
                                          <label className="block text-[10px] text-gray-400 mb-0.5">基金名称</label>
                                          <input
                                            value={fund.name}
                                            onChange={(e) => updateFund(item.id, idx, { name: e.target.value })}
                                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                                            placeholder="名称"
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <label className="block text-[10px] text-gray-400 mb-0.5">持有金额</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={fund.amount || ''}
                                            readOnly
                                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-gray-100 text-gray-500"
                                            placeholder="--"
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <label className="block text-[10px] text-gray-400 mb-0.5">持仓份数</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={fund.shares || ''}
                                            onChange={(e) => updateFund(item.id, idx, { shares: parseFloat(e.target.value) || 0 })}
                                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                                            placeholder="自动计算"
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <label className="block text-[10px] text-gray-400 mb-0.5">成本单价</label>
                                          <input
                                            type="number"
                                            step="0.0001"
                                            value={fund.avgCost || ''}
                                            onChange={(e) => updateFund(item.id, idx, { avgCost: parseFloat(e.target.value) || 0 })}
                                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                                            placeholder="自动计算"
                                          />
                                        </div>
                                        <div className="col-span-1 text-[10px] text-gray-400 text-right">
                                          {Math.round(fund.confidence * 100)}%
                                        </div>
                                      </div>
                                      {!fund.code && (
                                        <p className="text-[10px] text-orange-500 mt-1">
                                          ⚠️ 未匹配到基金代码，可点击 🔍 手动搜索或手动输入
                                        </p>
                                      )}
                                      {fund.code && existingCodes.has(fund.code) && (
                                        <p className="text-[10px] text-blue-500 mt-1">
                                          🔄 将覆盖当前持仓
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Import date setting */}
              {items.length > 0 && (
                <div className="mt-4 flex items-center gap-3 bg-blue-50 rounded-lg px-4 py-3">
                  <label className="text-sm text-blue-800 font-medium">📅 持仓起始日期</label>
                  <input
                    type="date"
                    value={importDate}
                    onChange={(e) => setImportDate(e.target.value)}
                    className="border border-blue-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-blue-600">
                    收益计算和年化收益率将基于此日期
                  </span>
                </div>
              )}

              {/* Import result */}
              {importResult && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${importResult.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                  导入完成：成功 {importResult.success} 只，失败 {importResult.failed} 只
                  {(importResult.newAdd !== undefined && importResult.overwrite !== undefined) && (
                    <span className="ml-1">（新增 {importResult.newAdd} 只，覆盖 {importResult.overwrite} 只）</span>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowModal(false); setItems([]); setImportResult(null); setImportDate(new Date().toISOString().split('T')[0]); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                取消
              </button>
              <button
                onClick={handleImportAll}
                disabled={importing || items.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
              >
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                {importing ? '导入中...' : '确认导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate selection modal */}
      {searchModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setSearchModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">选择匹配的基金</h3>
                <p className="text-xs text-gray-400 mt-0.5">搜索词：「{searchModal.query}」</p>
              </div>
              <button onClick={() => setSearchModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {searchModal.candidates.map((c) => (
                <button
                  key={c.code}
                  onClick={() => handleSelectCandidate(c.code)}
                  className="w-full text-left bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-lg px-4 py-3 transition flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      {c.name} <span className="text-blue-600 font-bold">{c.code}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{c.type}</div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-blue-600 opacity-0 hover:opacity-100 transition" />
                </button>
              ))}
            </div>
            <div className="p-5 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                以上结果来自 East Money 公募基金全库。如果没有匹配的，请返回修改基金名称后重新搜索。
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
