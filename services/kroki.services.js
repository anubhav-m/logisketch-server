import { ENGINES } from "../config/env.js";

export const callKroki = async (code, engine) => {

    let isEngineValid = false;

    for (let e of ENGINES){
        if (e.name === engine){
            isEngineValid = true;
            break;      
        }
    }

    if (!isEngineValid){
        throw new Error(`Engine ${engine} not found in ENGINES`);
    }

    const response = await fetch("https://kroki.io/" , {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(
            {
                "diagram_source": code,
                "diagram_type": engine,
                "output_format": "svg"
            }
        )
    })

    if (!response.ok){
        const errorText = await response.text();
        const error = new Error(`Kroki Error #${response.status}: ${errorText}`);
        error.statusCode = response.status;
        throw error;
    }

    const svg = await response.text();
    return svg;
}