import { Router } from 'express';
import {
  listOffices,
  createOffice,
  getOfficeById,
  updateOffice,
  deleteOffice,
  seedDefaultOffices,
  createOfficeSchema,
  updateOfficeSchema,
} from '../controllers/officeController';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateMiddleware';

const router = Router();

router.get('/', listOffices);
router.post('/seed-default', authenticateJWT, seedDefaultOffices);
router.post('/', authenticateJWT, validateBody(createOfficeSchema), createOffice);
router.get('/:id', getOfficeById);
router.put('/:id', authenticateJWT, validateBody(updateOfficeSchema), updateOffice);
router.delete('/:id', authenticateJWT, deleteOffice);

export default router;
