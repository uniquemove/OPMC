import { query } from '../config/db.js';

export const logRunningSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { distance_km, duration_seconds, pace_avg, gps_route_json } = req.body;

    if (!distance_km || duration_seconds === undefined) {
      return res.status(400).json({ success: false, message: 'Dữ liệu phiên chạy không hợp lệ' });
    }

    // 1. Get or create daily workout
    let workoutRes = await query(
      `SELECT * FROM daily_workouts WHERE user_id = $1 AND workout_date = CURRENT_DATE`,
      [userId]
    );

    let workoutId;
    if (workoutRes.rows.length === 0) {
      const userRes = await query(`SELECT level FROM users WHERE id = $1`, [userId]);
      const level = userRes.rows[0]?.level || 1;
      const newWorkout = await query(
        `INSERT INTO daily_workouts (user_id, level) VALUES ($1, $2) RETURNING id`,
        [userId, level]
      );
      workoutId = newWorkout.rows[0].id;
    } else {
      workoutId = workoutRes.rows[0].id;
    }

    // 2. Insert into running_sessions
    const runRes = await query(
      `INSERT INTO running_sessions (user_id, workout_id, distance_km, duration_seconds, pace_avg, gps_route_json)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, workoutId, distance_km, duration_seconds, pace_avg || '0:00', JSON.stringify(gps_route_json || [])]
    );

    // 3. Update running_completed_km in daily_workouts
    await query(
      `UPDATE daily_workouts 
       SET running_completed_km = running_completed_km + $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [distance_km, workoutId]
    );

    const updatedWorkout = await query(`SELECT * FROM daily_workouts WHERE id = $1`, [workoutId]);

    return res.status(201).json({
      success: true,
      message: `Đã lưu phiên chạy ${distance_km} km thành công!`,
      session: runRes.rows[0],
      currentWorkout: updatedWorkout.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lưu phiên chạy bộ: ' + error.message });
  }
};

export const getRunningSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT * FROM running_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );
    return res.json({ success: true, sessions: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách phiên chạy: ' + error.message });
  }
};
