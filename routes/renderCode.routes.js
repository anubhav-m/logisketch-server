import { Router } from 'express';
import { renderCode } from '../controllers/renderCode.controllers.js';

export const renderCodeRouter = Router();

renderCodeRouter.post('/', renderCode);