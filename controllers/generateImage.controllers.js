import { callLLM } from "../services/llm.services.js";

export const generateImage = async (req, res, next)=>{

    try{
        const code = await callLLM(req.body.prompt, req.body.model, req.body.engine);
        
        res.status(200).json({success: true, code});
    }

    catch(err){
        next(err);
    }
    
}