import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRY } from '../config/env.js';

export const signUp = async(req, res, next) => {
    try{
        const session = await mongoose.startSession();
        session.startTransaction();

        const {user, email, password} = req.body;

        
    }

    catch(err){
        next(err);
    }
}