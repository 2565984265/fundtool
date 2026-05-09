import { BarChart3 } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <BarChart3 className="w-8 h-8 text-blue-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">还没有添加基金</h3>
      <p className="text-gray-500 text-sm mb-4">在上方输入基金代码，即可开始跟踪您的投资组合。</p>
      <div className="text-xs text-gray-400 space-y-1">
        <p>💡 提示：输入基金代码后点击添加，系统会自动获取基金信息</p>
        <p>💾 所有数据存储在您的浏览器本地，不会上传到任何服务器</p>
      </div>
    </div>
  );
}
