import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getGaps,
  mentorOverride,
  generatePrompt,
  runTask,
  saveTaskScore,
  suggestReflection
} from '../controllers/clarity.controller';

const router = Router();

router.get('/clarity/gaps', getGaps);
router.post('/clarity/mentor-override', mentorOverride);
router.post('/clarity/generate-prompt', generatePrompt);
router.post('/clarity/run-task', runTask);
router.post('/clarity/save-task-score', requireAuth, saveTaskScore);
router.post('/clarity/suggest-reflection', suggestReflection);

export default router;
