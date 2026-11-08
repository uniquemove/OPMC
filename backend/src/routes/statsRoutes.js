import { Router } from 'express';
import { getUserStats, getLeaderboard } from '../controllers/statsController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/me', authenticateToken, getUserStats);
router.get('/leaderboard', getLeaderboard);

export default router;
