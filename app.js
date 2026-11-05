import express from 'express';
import { pathToFileURL } from 'url';
import { dynamicCors } from './middlewares/cors.middlewares.js';
import { PORT, NODE_ENV, LLM_CONFIG, RAG_CONFIG } from './config/env.js';
import { connectToDB } from './database/mongodb.js';
import { authRouter } from './routes/auth.routes.js';
import { generateImageRouter } from './routes/generateImage.routes.js';
import { renderCodeRouter } from './routes/renderCode.routes.js';
import { errorMiddleware } from './middlewares/error.middlewares.js';
import { apiKeyRouter } from './routes/apiKey.routes.js';
import { interactionRouter } from './routes/interaction.routes.js';
import { arcjetMiddleware } from './middlewares/arcjet.middlewares.js';


export const app = express();

app.use(dynamicCors);

app.use(express.json({ limit: '8mb' })); // Middleware to parse JSON bodies (8mb allows data-URL images)
app.use(express.urlencoded({ extended: false })); // Middleware to parse URL-encoded bodies

app.use(arcjetMiddleware);

app.use('/api/auth', authRouter);
app.use('/api/generate-image', generateImageRouter);
app.use('/api/render-code', renderCodeRouter);
app.use('/api/api-key', apiKeyRouter);
app.use('/api/interaction', interactionRouter);

app.get('/', (req, res) => {
    res.send('Welcome to logisketch api')
});

app.use(errorMiddleware);

export const startServer = async () => {
    try {
        await connectToDB();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT} in ${NODE_ENV} mode (LLM: ${LLM_CONFIG.provider}/${LLM_CONFIG.model}, keys: ${LLM_CONFIG.apiKeys.length}, RAG: ${RAG_CONFIG.enabled ? 'on' : 'off'})`);
        });
    }
    catch (err) {
        console.error(`Failed to start server: ${err.message}`);
    }
};

// Start only when run directly (`node app.js`), not when imported by tests/scripts.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    startServer();
}
