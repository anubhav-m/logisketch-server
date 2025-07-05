import { Router } from 'express';
import { signUp, signIn, deleteAccount } from '../controllers/auth.controllers.js';
import { authorize } from "../middlewares/auth.middlewares.js"

export const authRouter = Router();

authRouter.post('/sign-up', signUp);

authRouter.post('/sign-in', signIn);

authRouter.delete('/delete-account', authorize, deleteAccount);