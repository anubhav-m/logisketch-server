import jwt from 'jsonwebtoken';
import { JWT_SECRET } from "../config/env.js";
import { User } from "../models/user.models.js";

export const authorize = async (req, res, next) => {
    try{
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token){
            const error = new Error('No token - Unauthorized');
            error.statusCode = 401;
            throw error;
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded || !decoded.userId){
            const error = new Error('Invalid token - Unauthorized');
            error.statusCode = 401;
            throw error;
        }

        const user = await User.findById(decoded.userId);

        if (!user){
            const error = new Error('User not found - Unauthorized');
            error.statusCode = 401;
            throw error;
        }

        req.user = user;

        next();
    }

    catch(err){
        next(err);
    }
}