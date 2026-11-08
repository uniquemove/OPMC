import { useState, useEffect } from 'react';
import { Calendar, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { workoutService, runningService } from '../services/api';

export const History: React.FC = () => {
  const navigate = useNavigate();
  const [dailyHistory, setDailyHistory] = useState<any[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([]);
  const [runningLogs, setRunningLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'daily' | 'ai_logs' | 'running'>('daily');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [wRes, rRes] = await Promise.all([
          workoutService.getHistory(),
          runningService.getSessions(),
        ]);
        if (wRes.data.success) {
          setDailyHistory(wRes.data.history || []);
          setExerciseLogs(wRes.data.logs || []);
        }
        if (rRes.data.success) {
          setRunningLogs(rRes.data.sessions || []);
        }
      } catch {
        // Fallback demo data
        setDailyHistory([
          { id: 1, workout_date: '2026-10-04', level: 1, pushup_completed: 10, situp_completed: 10, squat_completed: 10, running_completed_km: 1.0, is_completed: true },
          { id: 2, workout_date: '2026-10-03', level: 1, pushup_completed: 10, situp_completed: 8, squat_completed: 10, running_completed_km: 1.0, is_completed: false },
          { id: 3, workout_date: '2026-10-02', level: 1, pushup_completed: 8, situp_completed: 10, squat_completed: 10, running_completed_km: 0.8, is_completed: false },
        ]);

        setExerciseLogs([
          { id: 1, exercise_type: 'pushup', reps_valid: 10, reps_invalid: 1, form_score: 90.9, duration_seconds: 45, created_at: '2026-10-04 09:15:00' },
          { id: 2, exercise_type: 'squat', reps_valid: 10, reps_invalid: 0, form_score: 100.0, duration_seconds: 50, created_at: '2026-10-04 09:20:00' },
          { id: 3, exercise_type: 'situp', reps_valid: 10, reps_invalid: 2, form_score: 83.3, duration_seconds: 60, created_at: '2026-10-04 09:28:00' },
        ]);

        setRunningLogs([
          { id: 1, distance_km: 1.05, duration_seconds: 360, pace_avg: '5:42 min/km', created_at: '2026-10-04 07:00:00' },
        ]);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Về Thử Thách</span>
        </button>

        {/* Tab switch */}
        <div className="flex bg-gray-900 p-1.5 rounded-xl border border-gray-800">
          {[
            { id: 'daily', label: 'Tiến Độ Theo Ngày' },
            { id: 'ai_logs', label: 'Nhật Ký Camera AI' },
            { id: 'running', label: 'Phiên Chạy Bộ GPS' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'daily' && (
        <div className="bg-[#141824] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-red-500" />
              <span>Tiến Độ Luyện Tập Theo Ngày</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-900/60 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="py-4 px-6">Ngày</th>
                  <th className="py-4 px-6 text-center">Cấp Độ</th>
                  <th className="py-4 px-6 text-center">Push-up</th>
                  <th className="py-4 px-6 text-center">Sit-up</th>
                  <th className="py-4 px-6 text-center">Squat</th>
                  <th className="py-4 px-6 text-center">Chạy Bộ</th>
                  <th className="py-4 px-6 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {dailyHistory.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-800/30">
                    <td className="py-4 px-6 font-semibold text-white">
                      {row.workout_date}
                    </td>
                    <td className="py-4 px-6 text-center text-gray-400">
                      Lv.{row.level}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-amber-400 font-mono">
                      {row.pushup_completed}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-amber-400 font-mono">
                      {row.situp_completed}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-amber-400 font-mono">
                      {row.squat_completed}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-amber-400 font-mono">
                      {row.running_completed_km} km
                    </td>
                    <td className="py-4 px-6 text-center">
                      {row.is_completed ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đạt chuẩn</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-800 text-gray-400">
                          <span>Chưa đủ</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ai_logs' && (
        <div className="bg-[#141824] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
          <div className="p-5 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Lịch Sử Phân Tích Camera AI</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-900/60 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="py-4 px-6">Thời Gian</th>
                  <th className="py-4 px-6">Động Tác</th>
                  <th className="py-4 px-6 text-center">Reps Chuẩn</th>
                  <th className="py-4 px-6 text-center">Reps Lỗi Form</th>
                  <th className="py-4 px-6 text-center">Điểm Kỹ Thuật</th>
                  <th className="py-4 px-6 text-center">Thời Lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {exerciseLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/30">
                    <td className="py-4 px-6 text-gray-400 text-xs">
                      {log.created_at}
                    </td>
                    <td className="py-4 px-6 font-bold text-white uppercase">
                      {log.exercise_type}
                    </td>
                    <td className="py-4 px-6 text-center font-black text-emerald-400 font-mono">
                      +{log.reps_valid}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-red-400 font-mono">
                      {log.reps_invalid}
                    </td>
                    <td className="py-4 px-6 text-center font-black text-amber-400">
                      {log.form_score}%
                    </td>
                    <td className="py-4 px-6 text-center text-gray-400">
                      {log.duration_seconds}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'running' && (
        <div className="bg-[#141824] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
          <div className="p-5 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Lịch Sử Các Phiên Chạy GPS</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-900/60 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="py-4 px-6">Thời Gian</th>
                  <th className="py-4 px-6 text-right">Quãng Đường</th>
                  <th className="py-4 px-6 text-right">Thời Gian</th>
                  <th className="py-4 px-6 text-right">Pace Trung Bình</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {runningLogs.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-800/30">
                    <td className="py-4 px-6 text-gray-400 text-xs">
                      {run.created_at}
                    </td>
                    <td className="py-4 px-6 text-right font-black text-amber-400 font-mono">
                      {run.distance_km} km
                    </td>
                    <td className="py-4 px-6 text-right text-gray-300 font-mono">
                      {Math.floor(run.duration_seconds / 60)}m {run.duration_seconds % 60}s
                    </td>
                    <td className="py-4 px-6 text-right text-emerald-400 font-bold font-mono">
                      {run.pace_avg}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
