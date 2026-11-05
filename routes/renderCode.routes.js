import { Router } from 'express';
import { renderCode } from '../controllers/renderCode.controllers.js';
import { validateRender } from '../middlewares/validate.middlewares.js';

export const renderCodeRouter = Router();

renderCodeRouter.post('/', validateRender, renderCode);
