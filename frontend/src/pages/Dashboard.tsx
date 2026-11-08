import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Flame, CheckCircle2, Zap, Target, Smartphone, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { challengeService } from '../services/api';
import { isNativeApp } from '../utils/platform';
import { DownloadAppModal } from '../components/DownloadAppModal';
import type { TodayChallengeData } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<TodayChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const res = await challengeService.getToday();
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch {
        // Fallback demo data for immediate UI rendering
        setData({
          userLevel: user?.level || 1,
          heroRank: user?.hero_rank || 'Hero C',
          streak: user?.current_streak || 3,
          target: {
            level: 1,
            pushup_target: 10,
            situp_target: 10,
            squat_target: 10,
            running_target_km: 1.0,
            title: 'Novice Recruit',
            description: 'Khởi đầu rèn luyện thể lực hàng ngày.',
          },
          progress: {
            id: 1,
            user_id: 1,
            workout_date: new Date().toISOString().split('T')[0],
            level: 1,
            pushup_completed: 6,
            situp_completed: 4,
            squat_completed: 8,
            running_completed_km: 0.6,
            is_completed: false,
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchChallenge();
  }, [user]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const { target, progress } = data;

  const pushupPct = Math.min(100, Math.round((progress.pushup_completed / target.pushup_target) * 100));
  const situpPct = Math.min(100, Math.round((progress.situp_completed / target.situp_target) * 100));
  const squatPct = Math.min(100, Math.round((progress.squat_completed / target.squat_target) * 100));
  const runPct = Math.min(100, Math.round((Number(progress.running_completed_km) / Number(target.running_target_km)) * 100));

  const totalOverallPct = Math.round((pushupPct + situpPct + squatPct + runPct) / 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-gray-900/90 to-red-950/50 border border-gray-800 p-6 md:p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-3 whitespace-nowrap">
              <Zap className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Thử Thách Hôm Nay • Level {target.level}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              ONE PUNCH MAN CHALLENGE
            </h1>
            <p className="text-gray-400 mt-1.5 max-w-xl text-xs sm:text-sm md:text-base leading-relaxed">
              Rèn luyện sức mạnh tuyệt đối: 100 Push-up, 100 Sit-up, 100 Squat và Chạy 10 km!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:flex sm:items-center sm:space-x-4 flex-shrink-0">
            {/* Rank Card */}
            <div className="bg-gray-800/80 backdrop-blur border border-gray-700/60 rounded-2xl p-3.5 sm:p-4 text-center min-w-[120px]">
              <div className="text-[11px] sm:text-xs text-gray-400 uppercase font-semibold whitespace-nowrap">Cấp Bậc Anh Hùng</div>
              <div className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent mt-0.5 whitespace-nowrap">
                {data.heroRank}
              </div>
              <div className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 whitespace-nowrap">Tier {target.level}/10</div>
            </div>

            {/* Overall Daily Progress */}
            <div className="bg-gray-800/80 backdrop-blur border border-gray-700/60 rounded-2xl p-3.5 sm:p-4 text-center min-w-[120px]">
              <div className="text-[11px] sm:text-xs text-gray-400 uppercase font-semibold whitespace-nowrap">Tiến Độ Ngày</div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5 whitespace-nowrap">
                {totalOverallPct}%
              </div>
              <div className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 whitespace-nowrap">
                {totalOverallPct === 100 ? '✅ Hoàn thành' : 'Đang tập luyện'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile App Download Banner: Only visible when accessed on Web browser */}
      {!isNativeApp() && (
        <div className="bg-gradient-to-r from-amber-500/10 via-red-500/10 to-transparent border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
                <span>Tập Luyện Di Động Tiện Lợi Hơn Với App Android</span>
                <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-black uppercase">APK</span>
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Cài đặt ứng dụng lên điện thoại để sử dụng GPS chạy bộ và Camera AI mọi lúc mọi nơi mà không lo gián đoạn trình duyệt.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDownloadModal(true)}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:opacity-90 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Tải App Android</span>
          </button>
        </div>
      )}

      {/* Main Challenge Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Push-up Card */}
        <div className="bg-[#141824] rounded-2xl border border-gray-800 hover:border-gray-700 p-6 flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">💪</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                AI Tracking
              </span>
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
              Chống Đẩy (Push-up)
            </h3>
            <p className="text-xs text-gray-400 mt-1">Đo góc khuỷu tay & độ thẳng lưng</p>

            <div className="mt-6 flex items-baseline justify-between">
              <span className="text-3xl font-black text-white">
                {progress.pushup_completed}
              </span>
              <span className="text-sm font-semibold text-gray-400">
                / {target.pushup_target} reps
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-red-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${pushupPct}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800/80">
            <Link
              to="/workout?exercise=pushup"
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-red-600/20"
            >
              <Camera className="w-4 h-4" />
              <span>Bật Camera AI</span>
            </Link>
          </div>
        </div>

        {/* 2. Sit-up Card */}
        <div className="bg-[#141824] rounded-2xl border border-gray-800 hover:border-gray-700 p-6 flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">🔥</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                AI Tracking
              </span>
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
              Gập Bụng (Sit-up)
            </h3>
            <p className="text-xs text-gray-400 mt-1">Kiểm tra góc nâng thân & siết cơ</p>

            <div className="mt-6 flex items-baseline justify-between">
              <span className="text-3xl font-black text-white">
                {progress.situp_completed}
              </span>
              <span className="text-sm font-semibold text-gray-400">
                / {target.situp_target} reps
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-red-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${situpPct}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800/80">
            <Link
              to="/workout?exercise=situp"
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-red-600/20"
            >
              <Camera className="w-4 h-4" />
              <span>Bật Camera AI</span>
            </Link>
          </div>
        </div>

        {/* 3. Squat Card */}
        <div className="bg-[#141824] rounded-2xl border border-gray-800 hover:border-gray-700 p-6 flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">🏋️</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                AI Tracking
              </span>
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
              Squat (Gánh Đùi)
            </h3>
            <p className="text-xs text-gray-400 mt-1">Đo độ sâu đầu gối & góc hông</p>

            <div className="mt-6 flex items-baseline justify-between">
              <span className="text-3xl font-black text-white">
                {progress.squat_completed}
              </span>
              <span className="text-sm font-semibold text-gray-400">
                / {target.squat_target} reps
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-red-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${squatPct}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800/80">
            <Link
              to="/workout?exercise=squat"
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-red-600/20 whitespace-nowrap"
            >
              <Camera className="w-4 h-4" />
              <span>Bật Camera AI</span>
            </Link>
          </div>
        </div>

        {/* 4. Running Card */}
        <div className="bg-[#141824] rounded-2xl border border-gray-800 hover:border-gray-700 p-6 flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">🏃‍♂️</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                GPS + Leaflet
              </span>
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
              Chạy Bộ (Running)
            </h3>
            <p className="text-xs text-gray-400 mt-1">Định vị GPS & vẽ lộ trình bản đồ</p>

            <div className="mt-6 flex items-baseline justify-between">
              <span className="text-3xl font-black text-white">
                {Number(progress.running_completed_km).toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-gray-400">
                / {Number(target.running_target_km).toFixed(1)} km
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${runPct}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800/80">
            <Link
              to="/running"
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap"
            >
              <Flame className="w-4 h-4" />
              <span>Bật GPS Chạy Bộ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Level Progression Roadmap */}
      <div className="bg-[#121624] border border-gray-800 rounded-2xl p-5 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center space-x-3">
            <Target className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Lộ Trình Thăng Hạng Anh Hùng</h2>
              <p className="text-xs text-gray-400">Từ Tân Binh (Lv.1) tiến tới Saitama One Punch Man (Lv.10)</p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 whitespace-nowrap self-start sm:self-auto">
            Hiện tại: Cấp {target.level}/10
          </span>
        </div>

        <div className="grid grid-cols-5 lg:grid-cols-10 gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => {
            const isDone = lvl < target.level;
            const isCurrent = lvl === target.level;
            return (
              <div
                key={lvl}
                className={`p-2 sm:p-3 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? 'bg-red-500/15 border-red-500/50 shadow-lg shadow-red-500/10 ring-1 ring-red-500/50'
                    : isDone
                    ? 'bg-gray-800/40 border-gray-700/60 opacity-80'
                    : 'bg-gray-900/30 border-gray-800/40 opacity-40'
                }`}
              >
                <div className="text-[10px] sm:text-[11px] font-bold text-gray-400">LV.{lvl}</div>
                <div className="text-xs sm:text-sm font-black text-white mt-1">
                  {lvl * 10}
                </div>
                <div className="text-[9px] sm:text-[10px] text-gray-400 truncate">reps/{lvl}km</div>
                <div className="mt-1.5 flex justify-center">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DownloadAppModal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} />
    </div>
  );
};
