import { Router } from 'express';
import { signUp, signIn } from '../controllers/auth.controllers.js';

export const authRouter = Router();

authRouter.post('/sign-up', signUp);

authRouter.post('/sign-in', signIn);

// authRouter.post('/sign-out', signOut);
