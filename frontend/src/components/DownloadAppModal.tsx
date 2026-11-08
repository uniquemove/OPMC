import React from 'react';
import { Download, X, CheckCircle, Terminal, Cpu } from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#141824] border border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <img
            src="/logo.png"
            alt="OPMC Logo"
            className="w-16 h-16 rounded-full mx-auto object-contain shadow-xl shadow-red-500/30 border-2 border-red-500/40"
          />
          <h3 className="text-2xl font-black text-white">
            Cài Đặt App OPMC (Android APK)
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto">
            Trải nghiệm tối ưu với Camera AI thời gian thực và đo GPS chạy bộ chuẩn xác mọi lúc mọi nơi!
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-2.5 bg-gray-900/60 p-4 rounded-xl border border-gray-800/80 text-xs sm:text-sm">
          <div className="flex items-center space-x-2.5 text-gray-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Định vị GPS nền mượt mà khi ra ngoài chạy bộ 10 km</span>
          </div>
          <div className="flex items-center space-x-2.5 text-gray-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Nhận diện camera AI mượt mà và loa đếm Reps tự động</span>
          </div>
          <div className="flex items-center space-x-2.5 text-gray-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Tích hợp native Android Studio (Dự án đã sẵn sàng)</span>
          </div>
        </div>

        {/* Android Studio Quick Guide */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs space-y-2">
          <div className="font-bold text-amber-400 flex items-center space-x-1.5">
            <Cpu className="w-4 h-4" />
            <span>Mở Dự Án Trong Android Studio:</span>
          </div>
          <p className="text-gray-300">
            Mã nguồn Android đã được khởi tạo tại thư mục:
          </p>
          <div className="bg-black/60 p-2 rounded-lg font-mono text-[11px] text-amber-300 select-all flex items-center justify-between">
            <span>frontend/android</span>
            <Terminal className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <p className="text-gray-400 text-[11px]">
            👉 Trong Android Studio: Chọn <b>Open</b> → Trỏ đến thư mục <code className="text-amber-400">frontend/android</code> → Bấm <b>Build &gt; Build APK</b> để xuất file cài cho điện thoại!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <a
            href="https://github.com/uniquemove/OPMC/releases/latest/download/OPMC-OnePunchMan.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:opacity-95 text-white font-black text-sm shadow-lg shadow-red-600/25 transition-all flex items-center justify-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Tải Trực Tiếp File APK (Android)</span>
          </a>

          <a
            href="https://github.com/uniquemove/OPMC/actions"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl bg-gray-800/90 hover:bg-gray-700 text-gray-300 font-semibold text-xs border border-gray-700 transition-all flex items-center justify-center space-x-2"
          >
            <span>Xem Tiến Trình Build Online Trên GitHub Actions</span>
          </a>

          <button
            onClick={onClose}
            className="w-full py-2 text-gray-400 hover:text-white text-xs text-center transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
