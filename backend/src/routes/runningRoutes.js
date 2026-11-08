import { Router } from 'express';
import { logRunningSession, getRunningSessions } from '../controllers/runningController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/log', authenticateToken, logRunningSession);
router.get('/history', authenticateToken, getRunningSessions);

export default router;
