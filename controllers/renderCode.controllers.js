import { callKroki } from "../services/kroki.services.js";

export const renderCode = async (req, res, next)=>{
    try{
            const svg = await callKroki(req.body.code, req.body.engine);
            // console.log(svg);
            
            res.status(200).json({success: true, svg});
        }
    
        catch(err){
            next(err);
        }
        
}