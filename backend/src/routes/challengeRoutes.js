import { Router } from 'express';
import { getChallengeLevels, getTodayChallenge } from '../controllers/challengeController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/levels', getChallengeLevels);
router.get('/today', authenticateToken, getTodayChallenge);

export default router;
