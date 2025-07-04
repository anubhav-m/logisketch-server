import { Router } from 'express';
import { createApiKey, getApiKey, deleteApiKey } from '../controllers/apiKey.controllers.js';
import { authorize } from '../middlewares/auth.middlewares.js'

export const apiKeyRouter = Router();

apiKeyRouter.post('/', authorize, createApiKey);

apiKeyRouter.get('/', authorize, getApiKey);

apiKeyRouter.delete('/', authorize, deleteApiKey);