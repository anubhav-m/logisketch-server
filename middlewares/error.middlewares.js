export const errorMiddleware = (err, req, res, next) => {
    try{
        console.error(err);

        let error = err;

        //Mongoose bad object id error
        if(err.name === 'CastError'){
            error = new Error(`Resource not found. Invalid: ${err.path}`);
            error.statusCode = 404;
        }

        //Mongoose duplicate key error
        if(err.code === 11000){
            error = new Error(`Duplicate field value entered`);
            error.statusCode = 400
        }

        //Mongoose validation error
        if (err.name === 'ValidationError'){
            error = new Error(Object.values(err.errors).map(val => val.message).join(', '));
            error.statusCode = 400;
        }

        // Malformed JSON body
        if (err.type === 'entity.parse.failed'){
            error = new Error('Invalid JSON body');
            error.statusCode = 400;
        }

        const status = Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600
            ? error.statusCode : 500;

        res.status(status).json({
            success: "false", 
            error: error.message || "Internal Server Error"
        });
    }

    catch(e){
        console.error(`Error in middleware : ${e}`);

        res.status(500).json({
            success: "false",
            error: "Internal Server Error"
        });
    }
}
