import { config } from 'dotenv';
import fs from "fs";

config({path:`.env.${process.env.NODE_ENV || 'development'}.local`});

export const { PORT } = process.env || 3000; //Fallback if on prod no PORT is specified

export const { NODE_ENV } = process.env; 

export const LLM_MODELS = [];

for (let i = 1; i <= 4; i++) {
    LLM_MODELS.push({
        type: "text",
        model: process.env[`LLM_${i}`],
        api: process.env.GROQ_API,
        endpoint: process.env.GROQ_ENDPOINT
    });
}

export const ENGINES = [];

for (let i = 1; i <= 13; i++) {
    ENGINES.push({
        name: process.env[`ENGINE_${i}`], 
        prompt: fs.readFileSync(`./prompts/${process.env[`ENGINE_${i}`]}.prompts.txt`, "utf-8")
    });
}
