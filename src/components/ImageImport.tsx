import { useState, useRef, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { Upload, X, ImagePlus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { parseOcrText, ParsedFund } from '../utils/ocrParser';

interface Props {
  onImport: (code: string, startDate: string, avgCost: number, shares: number) => Promise<boolean>;
}

interface PreviewItem {
  id: string;
  src: string;
  text: string;
  funds: ParsedFund[];
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
}

export default function ImageImport({ onImport }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null);

  const getWorker = useCallback(async () => {
    const existing = workerRef.current;
    if (existing) return existing;
    const worker = await createWorker('chi_sim+eng');
    workerRef.current = worker;
    return worker;
  }, []);

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

    // Add placeholder items with stable IDs and srcs
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

    // Process sequentially using the stable IDs
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

  const handleImportAll = async () => {
    const allFunds = items.flatMap((item) => item.funds);
    const toImport = allFunds.filter((f) => f.code && /^\d{6}$/.test(f.code) && f.shares > 0);
    const invalid = allFunds.filter((f) => !f.code || !/^\d{6}$/.test(f.code) || f.shares <= 0);
    if (toImport.length === 0) {
      alert('没有可导入的数据。请确保基金代码（6位数字）和持仓份额已正确填写。');
      return;
    }
    if (invalid.length > 0) {
      const ok = confirm(`有 ${invalid.length} 条数据缺少基金代码或持仓份额，将跳过导入。是否继续导入 ${toImport.length} 条有效数据？`);
      if (!ok) return;
    }

    setImporting(true);
    let success = 0;
    let failed = 0;
    const startDate = new Date().toISOString().split('T')[0];

    for (const fund of toImport) {
      const avgCost = fund.avgCost > 0 ? fund.avgCost : 1;
      const ok = await onImport(fund.code, startDate, avgCost, fund.shares);
      if (ok) success++;
      else failed++;
    }

    setImporting(false);
    setImportResult({ success, failed });

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
                                      <div className="grid grid-cols-6 gap-2 items-center">
                                        <div className="col-span-1">
                                          <label className="block text-[10px] text-gray-400 mb-0.5">基金代码 *</label>
                                          <input
                                            value={fund.code}
                                            onChange={(e) => updateFund(item.id, idx, { code: e.target.value })}
                                            className={`w-full border rounded px-2 py-1 text-xs ${!fund.code ? 'border-red-300 bg-red-50' : ''}`}
                                            placeholder="000001"
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <label className="block text-[10px] text-gray-400 mb-0.5">基金名称</label>
                                          <input
                                            value={fund.name}
                                            onChange={(e) => updateFund(item.id, idx, { name: e.target.value })}
                                            className="w-full border rounded px-2 py-1 text-xs"
                                            placeholder="名称"
                                          />
                                        </div>
                                        <div className="col-span-1">
                                          <label className="block text-[10px] text-gray-400 mb-0.5">持有金额</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={fund.amount || ''}
                                            readOnly
                                            className="w-full border rounded px-2 py-1 text-xs bg-gray-100 text-gray-500"
                                            placeholder="--"
                                          />
                                        </div>
                                        <div className="col-span-1">
                                          <label className="block text-[10px] text-gray-400 mb-0.5">持仓份数 *</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={fund.shares || ''}
                                            onChange={(e) => updateFund(item.id, idx, { shares: parseFloat(e.target.value) || 0 })}
                                            className={`w-full border rounded px-2 py-1 text-xs ${!fund.shares ? 'border-red-300 bg-red-50' : ''}`}
                                            placeholder="份数"
                                          />
                                        </div>
                                        <div className="col-span-1">
                                          <label className="block text-[10px] text-gray-400 mb-0.5">成本单价</label>
                                          <input
                                            type="number"
                                            step="0.0001"
                                            value={fund.avgCost || ''}
                                            onChange={(e) => updateFund(item.id, idx, { avgCost: parseFloat(e.target.value) || 0 })}
                                            className="w-full border rounded px-2 py-1 text-xs"
                                            placeholder="成本"
                                          />
                                        </div>
                                      </div>
                                      {!fund.code && (
                                        <p className="text-[10px] text-red-500 mt-1">⚠️ 截图中未识别到基金代码，请手动输入</p>
                                      )}
                                      {!fund.shares && (
                                        <p className="text-[10px] text-red-500 mt-1">⚠️ 截图中未识别到持仓份额，请手动输入</p>
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

              {/* Import result */}
              {importResult && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${importResult.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                  导入完成：成功 {importResult.success} 只，失败 {importResult.failed} 只
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowModal(false); setItems([]); setImportResult(null); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
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
    </>
  );
}
