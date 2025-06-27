import { config } from 'dotenv';
import fs from "fs";

config({path:`.env.${process.env.NODE_ENV || 'development'}.local`});

export const { PORT } = process.env || 3000; //Fallback if on prod no PORT is specified

export const { NODE_ENV, ARCJET_KEY} = process.env; 

//Put all the models inside LLM_MODELS
export const LLM_MODELS = [
    {
        type: "image",
        model: process.env.OPENROUTER_LLM_1,
        api: process.env.OPENROUTER_API_1,
        endpoint: process.env.OPENROUTER_ENDPOINT
    }
];

// Put GROQ LLMs in LLM_MODELS
for (let i = 1; i <= 4; i++) {
    LLM_MODELS.push({
        type: "text",
        model: process.env[`GROQ_LLM_${i}`],
        api: process.env.GROQ_API,
        endpoint: process.env.GROQ_ENDPOINT
    });
}

export const ENGINES = [];

//PUT all engines in ENGINES
for (let i = 1; i <= 15; i++) {
    ENGINES.push({
        name: process.env[`ENGINE_${i}`], 
        prompt: fs.readFileSync(`./prompts/${process.env[`ENGINE_${i}`]}.prompts.txt`, "utf-8")
    });
}
