import { callLLM } from "../services/llm.services.js";
import { callKroki } from "../services/kroki.services.js";
import { extractCode } from "../utilities/extractCode.utilites.js";

export const generateImage = async (req, res, next)=>{

    try{
        const code = await callLLM(req.body.prompt, req.body.model, req.body.engine);

        const sanitisedCode = extractCode(code);
        console.log(sanitisedCode[0]);

        const svg = await callKroki(sanitisedCode[0], req.body.engine);
        console.log(svg);
        
        res.status(200).json({success: true, code, svg});
    }

    catch(err){
        next(err);
    }
    
}