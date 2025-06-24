import { Router } from 'express';
import { generateImage } from '../controllers/generateImage.controllers.js';

export const generateImageRouter = Router();

generateImageRouter.post('/', generateImage);