import { query } from '../config/db.js';

export const logExerciseResult = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exercise_type, reps_total, reps_valid, reps_invalid, form_score, duration_seconds, feedback_notes } = req.body;

    if (!exercise_type || reps_valid === undefined) {
      return res.status(400).json({ success: false, message: 'Dữ liệu bài tập không hợp lệ' });
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

    // 2. Insert into exercise_logs
    const logRes = await query(
      `INSERT INTO exercise_logs (user_id, workout_id, exercise_type, reps_total, reps_valid, reps_invalid, form_score, duration_seconds, feedback_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, workoutId, exercise_type, reps_total || reps_valid, reps_valid, reps_invalid || 0, form_score || 100, duration_seconds || 0, feedback_notes || '']
    );

    // 3. Increment daily progress
    let updateField = '';
    if (exercise_type === 'pushup') updateField = 'pushup_completed';
    else if (exercise_type === 'situp') updateField = 'situp_completed';
    else if (exercise_type === 'squat') updateField = 'squat_completed';

    if (updateField) {
      await query(
        `UPDATE daily_workouts 
         SET ${updateField} = ${updateField} + $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [reps_valid, workoutId]
      );
    }

    // Check completion status
    const updatedWorkout = await query(`SELECT * FROM daily_workouts WHERE id = $1`, [workoutId]);

    return res.status(201).json({
      success: true,
      message: `Đã ghi nhận ${reps_valid} reps ${exercise_type} thành công!`,
      log: logRes.rows[0],
      currentWorkout: updatedWorkout.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi ghi nhận bài tập: ' + error.message });
  }
};

export const getWorkoutHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const historyRes = await query(
      `SELECT * FROM daily_workouts WHERE user_id = $1 ORDER BY workout_date DESC LIMIT 30`,
      [userId]
    );

    const logsRes = await query(
      `SELECT * FROM exercise_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    return res.json({
      success: true,
      history: historyRes.rows,
      logs: logsRes.rows,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử bài tập: ' + error.message });
  }
};
