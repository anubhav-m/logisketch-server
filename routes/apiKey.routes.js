import { Router } from 'express';
import { createApiKey } from '../controllers/apiKey.controllers.js';
import { authorize } from '../middlewares/auth.middlewares.js'

export const apiKeyRouter = Router();

apiKeyRouter.post('/', authorize, createApiKey);
