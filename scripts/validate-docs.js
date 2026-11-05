// npm run validate-docs — renders every code example in data/engine-docs with Kroki.
// Makes sure RAG never feeds the model a broken example. No LLM calls.
import fs from 'fs';
import path from 'path';
import { RAG_CONFIG } from '../config/env.js';
import { callKroki } from '../services/kroki.services.js';

let failed = 0;
let total = 0;
for (const file of fs.readdirSync(RAG_CONFIG.docsDir).filter((f) => f.endsWith('.md')).sort()) {
    const engine = path.basename(file, '.md');
    const md = fs.readFileSync(path.join(RAG_CONFIG.docsDir, file), 'utf-8').replace(/\r\n/g, '\n');
    const blocks = [...md.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]);
    for (const [i, code] of blocks.entries()) {
        total++;
        try {
            await callKroki(code, engine);
            console.log(`ok    ${engine} example ${i + 1}`);
        } catch (err) {
            failed++;
            console.log(`FAIL  ${engine} example ${i + 1}: ${err.message.slice(0, 300)}`);
        }
    }
}
console.log(`\n${total - failed}/${total} examples render`);
process.exit(failed ? 1 : 0);
