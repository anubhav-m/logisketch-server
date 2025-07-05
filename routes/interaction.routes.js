import { Router } from 'express';
import { authorize } from '../middlewares/auth.middlewares.js';
import { saveInteraction, getAllInteractions, updateInteraction, deleteInteraction } from '../controllers/interaction.controllers.js';

export const interactionRouter = Router();

interactionRouter.post('/', authorize, saveInteraction);

interactionRouter.get('/', authorize, getAllInteractions);

interactionRouter.put('/', authorize, updateInteraction);

interactionRouter.delete('/', authorize, deleteInteraction);