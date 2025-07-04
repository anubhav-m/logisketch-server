import { aj } from '../config/arcjet.js';

export const arcjetMiddleware = async (req, res, next) => {
    try{
        const decision = await aj.protect(req, { requested: 1});

        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()){
                const error = new Error("Rate limit exceeded");
                error.statusCode = 429; // Rate Limit Exceeded
                throw error;
            }

            if(decision.reason.isBot()){
                const error = new Error("Bot detected");
                error.statusCode = 403; // Forbidden
                throw error;
            }

            const error = new Error("Access denied");
            error.statusCode = 403; // Forbidden
            throw error;
                  
        }
        next(); // Proceed to the next middleware if not denied
    }
    catch (error) {
        next(error);
    }
}