import { User } from '../models/user.models.js';
import { generateApiKey } from '../utilities/generateApiKey.utilites.js';

export const createApiKey = async (req, res, next) => {
    try{
        //Getting user again to get 'save()' method of mongo
        const user = await User.findById(req.user._id);

        if (!user){
            const error = new Error('No user found - Unauthorized');
            error.statusCode = 401;
            throw error;
        }

        if (user.apiKey){
            const error = new Error('API key already exists - Conflict');
            error.statusCode = 409;
            throw error;
        }

        const newKey = generateApiKey();
        user.apiKey = newKey;
        const savedUser = await user.save();

        res.status(201).json({
            success: true,
            message: "API Key generated successfully",
            apiKey: savedUser.apiKey 
        });
    }

    catch(err){
        next(err);
    }
}

export const getApiKey = async(req, res, next) => {
    try{
        const user = await User.findById(req.user._id);

        if (!user){
            const error = new Error('No user found - Unauthorized');
            error.statusCode = 401;
            throw error;
        }

        if (!user.apiKey){
            const error = new Error('No API key found');
            error.stausCode = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            message: "API Key found",
            apiKey: user.apiKey
        });
    }

    catch(err){
        next(err);
    }
}

export const deleteApiKey = async(req, res, next) => {
    try{
        const user = await User.findById(req.user._id);

        if (!user){
            const error = new Error('No user found - Unauthorized');
            error.statusCode = 401;
            throw error;
        }
        
        if (!user.apiKey){
            const error = new Error('No API key found');
            error.stausCode = 404;
            throw error;
        }

        user.apiKey = null;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'API Key deleted'
        });
    }

    catch(err){
        next(err);
    }
}