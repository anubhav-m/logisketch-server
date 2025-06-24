import { callLLM } from "../services/llm.services.js";

export const generateImage = async (req, res, next)=>{

    try{
        const data = await callLLM(req.body.prompt, req.body.model, req.body.engine);
        
        const code = data?.choices?.[0]?.message?.content;

        console.log(code);

        if (!code) {
            const error = new Error("No response from LLM");
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({success: true, code});
    }

    catch(err){
        next(err);
    }
    
}