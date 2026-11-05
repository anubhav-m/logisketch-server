import { Router } from 'express';
import { generateImage } from '../controllers/generateImage.controllers.js';
import { validateGenerate } from '../middlewares/validate.middlewares.js';

export const generateImageRouter = Router();

generateImageRouter.post('/', validateGenerate, generateImage);
