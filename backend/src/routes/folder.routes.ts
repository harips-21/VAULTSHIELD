import { Router } from 'express';
import { FolderController } from '../controllers/folder.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', FolderController.getFolders);
router.get('/tree', FolderController.getFolderTree);
router.post('/', FolderController.createFolder);
router.patch('/:folderId', FolderController.renameFolder);
router.patch('/:folderId/move', FolderController.moveFolder);
router.delete('/:folderId', FolderController.softDeleteFolder);
router.post('/:folderId/restore', FolderController.restoreFolder);

export default router;
