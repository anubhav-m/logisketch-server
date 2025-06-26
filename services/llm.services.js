import { LLM_MODELS, ENGINES } from "../config/env.js";

export const callLLM = async (prompt, model, engine)=>{

    let enginePrompt;
    let API_KEY;
    let endpoint;
    let messages;

    for (const e of ENGINES) {
        if (e.name === engine) {
            enginePrompt = e.prompt;
            break;
        }
    }

    if (!enginePrompt) {
        throw new Error(`Engine ${engine} not found in ENGINES`);
    }


    for (const llm of LLM_MODELS) {

        if (llm.type === "text" && llm.model === model) {
            API_KEY = llm.api;
            endpoint = llm.endpoint;   

            messages = [
                {
                    "role": "system",
                    "content": enginePrompt
                },
                {
                    "role": "user",
                    "content": prompt?.text
                }
            ]

            break;
        }

        else if (llm.type === "image" && llm.model === model) {
            API_KEY = llm.api;
            endpoint = llm.endpoint;

            if (prompt.image === undefined || prompt.image === null || !prompt.image) {
                messages = [
                    {   
                        "role": "system",
                        "content": enginePrompt
                    },
                    {
                        "role": "user",
                        "content": prompt?.text
                    }
                ]
            }

            else{
                messages = [
                    {   
                        "role": "system",
                        "content": enginePrompt
                    },
                    {
                        "role":"user",
                        "content":[
                            {
                                "type":"image_url",
                                "image_url":{
                                    "url":prompt?.image
                                }
                            },
                            {
                                "type":"text",
                                "text":prompt?.text
                            }
                        ]
                    }
                ]
            }

            break;
        }
    }

    if (!API_KEY) {
        throw new Error(`Model ${model} not found in LLM_MODELS`);
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": model,
            "messages": messages
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`LLM Error ${response.status}: ${errorText}`);
        error.statusCode = response.status;
        throw error;
    }

    const data = await response.json();

    const code = data?.choices?.[0]?.message?.content;

    if(code=== undefined || code === null || !code) {
        const error = new Error("No response from LLM");
        error.statusCode = 404;
        throw error;
    }

    console.log(code);

    return code;
}