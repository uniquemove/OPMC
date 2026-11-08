import { Router } from 'express';
import { logExerciseResult, getWorkoutHistory } from '../controllers/workoutController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/log', authenticateToken, logExerciseResult);
router.get('/history', authenticateToken, getWorkoutHistory);

export default router;
