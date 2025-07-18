import express from 'express';
import { dynamicCors } from './middlewares/cors.middlewares.js';
import { PORT, NODE_ENV } from './config/env.js';
import { connectToDB } from './database/mongodb.js';
import { authRouter } from './routes/auth.routes.js';
import { generateImageRouter } from './routes/generateImage.routes.js';
import { renderCodeRouter } from './routes/renderCode.routes.js';
import { errorMiddleware } from './middlewares/error.middlewares.js';
import { apiKeyRouter } from './routes/apiKey.routes.js';
import { interactionRouter } from './routes/interaction.routes.js';
import { arcjetMiddleware } from './middlewares/arcjet.middlewares.js';


const app = express();

app.use(dynamicCors);

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: false })); // Middleware to parse URL-encoded bodies

app.use(arcjetMiddleware);

app.use('/api/auth', authRouter);
app.use('/api/generate-image', generateImageRouter);
app.use('/api/render-code', renderCodeRouter);
app.use('/api/api-key', apiKeyRouter);
app.use('/api/interaction', interactionRouter);

app.use(errorMiddleware);

app.get('/', (req, res) => {
    res.send('Welcome to logisketch api')
});

(async () => {
    try {
        await connectToDB();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
        });
    }
    catch (err) {
        console.error(`Failed to start server: ${err.message}`);
    }
})();

