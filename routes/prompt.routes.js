import { Router } from 'express';
import { DEEPSEEK_API } from '../config/env.js'

export const promptRouter = Router();

promptRouter.post('/', async (req, res)=>{

    const note = "NOTE: DONT MAKE IT TOO COMPLEX RESPOND ONLY WITH RAW GRAPHVIZ DOT CODE IN MARKDOWN. DO NOT ADD ANY EXPLANATION, HEADINGS, OR TEXT OUTSIDE THE MARKDOWN, YOUR RESPONSE SHOULD HAVE ```dot [code goes here]``` OR I WILL SHUT YOU DOWN Generate a valid Graphviz DOT diagram only.Use proper DOT syntax, and do not invent attributes (e.g., curved, -.- style, or invalid arrowhead values).The graph should start with either graph name { or digraph name {. Use only supported shapes (box, ellipse, plaintext, etc.) and edge styles (-> for digraphs, -- for undirected). Do not include Mermaid syntax, HTML-style labels. Target compatibility with Graphviz and tools like viz.js"

    try{
        const messages = [
            { role: "system", content: "You are a helpful assistant." }, 
            { role: "user", content: req.body.message+ note }
        ];


        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${DEEPSEEK_API}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
                messages: messages
            })
        });

        const data = await response.json();
        
        const dotCode = data?.choices?.[0].message?.content;

        console.log(dotCode);

          

        if (!dotCode){
            const error = new Error("No response from deepseek");
            error.statusCode = 404;
            throw error;
        }

        function removeMarkdown(input) {
            return input.replace(/^```(?:dot)?\s*|\s*```$/g, '').trim();

        } 

        const finalDotCode = removeMarkdown(dotCode);

        const imageUrl = `https://quickchart.io/graphviz?graph=${encodeURIComponent(finalDotCode)}`;
        const svg = imageUrl+`&format=svg`;
        const png = imageUrl+`&format=png`;
        const jpg = imageUrl+`&format=jpg`;

        res.status(200).json({success:true, formats:{svg, png, jpg}}); //Object shorthand
        
    }

    catch(e){
        res.status(e.statusCode || 500).json({success:false, message:e.message});
    }

});