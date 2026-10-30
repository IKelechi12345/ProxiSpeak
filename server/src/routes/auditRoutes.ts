import { Router } from 'express';
import { getSpatialAudit, runSpatialBenchmark, getSystemHealth } from '../controllers/auditController';

const router = Router();

router.get('/spatial', getSpatialAudit);
router.post('/benchmark', runSpatialBenchmark);
router.get('/health', getSystemHealth);

export default router;
