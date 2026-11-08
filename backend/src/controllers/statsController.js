import { query } from '../config/db.js';

export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Total lifetime stats
    const totalWorkoutStats = await query(
      `SELECT 
         COALESCE(SUM(pushup_completed), 0) as total_pushups,
         COALESCE(SUM(situp_completed), 0) as total_situps,
         COALESCE(SUM(squat_completed), 0) as total_squats,
         COALESCE(SUM(running_completed_km), 0) as total_running_km,
         COUNT(id) as total_active_days
       FROM daily_workouts WHERE user_id = $1`,
      [userId]
    );

    // 2. User profile details
    const userRes = await query(
      `SELECT id, username, hero_rank, level, current_streak, max_streak, created_at FROM users WHERE id = $1`,
      [userId]
    );

    // 3. Form accuracy average from AI logs
    const aiStats = await query(
      `SELECT 
         COALESCE(AVG(form_score), 100) as avg_form_score,
         COALESCE(SUM(reps_valid), 0) as total_ai_valid_reps,
         COALESCE(SUM(reps_invalid), 0) as total_ai_invalid_reps
       FROM exercise_logs WHERE user_id = $1`,
      [userId]
    );

    return res.json({
      success: true,
      stats: {
        user: userRes.rows[0],
        totals: totalWorkoutStats.rows[0],
        aiMetrics: aiStats.rows[0],
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy thống kê người dùng: ' + error.message });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
         u.id, u.username, u.hero_rank, u.level, u.current_streak,
         COALESCE(SUM(w.pushup_completed), 0) + COALESCE(SUM(w.situp_completed), 0) + COALESCE(SUM(w.squat_completed), 0) as total_reps,
         COALESCE(SUM(w.running_completed_km), 0) as total_km
       FROM users u
       LEFT JOIN daily_workouts w ON u.id = w.user_id
       GROUP BY u.id, u.username, u.hero_rank, u.level, u.current_streak
       ORDER BY total_reps DESC, total_km DESC
       LIMIT 20`
    );

    return res.json({
      success: true,
      leaderboard: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy bảng xếp hạng: ' + error.message });
  }
};
