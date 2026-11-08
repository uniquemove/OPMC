import { query } from '../config/db.js';

export const getChallengeLevels = async (req, res) => {
  try {
    const result = await query(`SELECT * FROM challenge_levels ORDER BY level ASC`);
    return res.json({ success: true, levels: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách cấp độ thử thách: ' + error.message });
  }
};

export const getTodayChallenge = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get user current level
    const userRes = await query(`SELECT level, hero_rank, current_streak FROM users WHERE id = $1`, [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = userRes.rows[0];

    // 2. Get target for this level
    const levelRes = await query(`SELECT * FROM challenge_levels WHERE level = $1`, [user.level || 1]);
    const target = levelRes.rows[0] || {
      level: 1,
      pushup_target: 10,
      situp_target: 10,
      squat_target: 10,
      running_target_km: 1.0,
      title: 'Novice Recruit'
    };

    // 3. Get or create today's workout record
    let workoutRes = await query(
      `SELECT * FROM daily_workouts WHERE user_id = $1 AND workout_date = CURRENT_DATE`,
      [userId]
    );

    let todayWorkout;
    if (workoutRes.rows.length === 0) {
      const insertRes = await query(
        `INSERT INTO daily_workouts (user_id, level, pushup_completed, situp_completed, squat_completed, running_completed_km)
         VALUES ($1, $2, 0, 0, 0, 0)
         RETURNING *`,
        [userId, target.level]
      );
      todayWorkout = insertRes.rows[0];
    } else {
      todayWorkout = workoutRes.rows[0];
    }

    return res.json({
      success: true,
      data: {
        userLevel: user.level,
        heroRank: user.hero_rank,
        streak: user.current_streak,
        target,
        progress: todayWorkout,
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy tiến độ thử thách hôm nay: ' + error.message });
  }
};
