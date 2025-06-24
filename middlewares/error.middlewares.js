export const errorMiddleware = (err, req, res, next) => {
    try{
        console.error(err);

        res.status(err.statusCode || 500 ).json({
            success: "false", 
            error: err.message || "Internal Server Error"
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