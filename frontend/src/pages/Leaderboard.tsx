import { useState, useEffect } from 'react';
import { Trophy, Flame, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { statsService } from '../services/api';

interface LeaderboardItem {
  id: number;
  username: string;
  hero_rank: string;
  level: number;
  current_streak: number;
  total_reps: number;
  total_km: number;
}

export const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<LeaderboardItem[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await statsService.getLeaderboard();
        if (res.data.success && res.data.leaderboard.length > 0) {
          setLeaders(res.data.leaderboard);
        } else {
          throw new Error('Empty');
        }
      } catch {
        // Fallback Hall of Fame with One Punch Man characters + demo users
        setLeaders([
          { id: 1, username: 'Saitama (Áo Choàng Hói)', hero_rank: 'Hero Class S', level: 10, current_streak: 100, total_reps: 30000, total_km: 1000 },
          { id: 2, username: 'Genos (Cyborg Quỷ)', hero_rank: 'Hero Class S', level: 9, current_streak: 42, total_reps: 24500, total_km: 820 },
          { id: 3, username: 'Silver Fang (Bang)', hero_rank: 'Hero Class S', level: 9, current_streak: 38, total_reps: 22100, total_km: 740 },
          { id: 4, username: 'Mumen Rider (Người Lái Xe Công Lý)', hero_rank: 'Hero Class C', level: 6, current_streak: 65, total_reps: 18400, total_km: 610 },
          { id: 5, username: 'Bạn (Hero Tân Binh)', hero_rank: 'Hero Class C', level: 2, current_streak: 5, total_reps: 340, total_km: 12.5 },
        ]);
      }
    };

    fetchLeaderboard();
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
        <div className="text-xs font-semibold px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
          Hiệp Hội Anh Hùng • Bảng Phong Thần
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-gray-900 to-amber-950/40 rounded-2xl border border-gray-800 p-6 md:p-8 flex items-center space-x-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Trophy className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            BẢNG XẾP HẠNG ANH HÙNG
          </h1>
          <p className="text-xs md:text-sm text-gray-400 mt-0.5">
            Vinh danh những anh hùng kiên trì rèn luyện chuỗi ngày dài nhất và tổng số rep cao nhất!
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141824] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900/80 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-800">
              <tr>
                <th className="py-4 px-6 text-center w-16">Hạng</th>
                <th className="py-4 px-6">Anh Hùng</th>
                <th className="py-4 px-6 text-center">Cấp Bậc</th>
                <th className="py-4 px-6 text-center">Cấp Độ</th>
                <th className="py-4 px-6 text-center">Chuỗi Ngày</th>
                <th className="py-4 px-6 text-right">Tổng Reps</th>
                <th className="py-4 px-6 text-right">Tổng Chạy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {leaders.map((item, index) => {
                const rankNum = index + 1;
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-800/40 transition-colors ${
                      item.username.includes('Bạn') ? 'bg-red-500/10' : ''
                    }`}
                  >
                    <td className="py-4 px-6 text-center font-bold">
                      {rankNum === 1 ? (
                        <span className="text-xl">🥇</span>
                      ) : rankNum === 2 ? (
                        <span className="text-xl">🥈</span>
                      ) : rankNum === 3 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="text-gray-500">#{rankNum}</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-white flex items-center space-x-2">
                        <span>{item.username}</span>
                        {item.username.includes('Bạn') && (
                          <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        item.hero_rank.includes('S')
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {item.hero_rank}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-semibold text-gray-400">
                      Lv.{item.level}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center space-x-1 text-amber-400 font-bold">
                        <Flame className="w-4 h-4 fill-amber-400" />
                        <span>{item.current_streak}d</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-black text-white font-mono">
                      {item.total_reps.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-amber-400 font-mono">
                      {item.total_km} km
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
