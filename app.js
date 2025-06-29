import express from 'express';
import cors from 'cors';
import { PORT, NODE_ENV } from './config/env.js';
import { connectToDB } from './database/mongodb.js';
// import { authRouter } from './routes/auth.routes.js';
import { generateImageRouter } from './routes/generateImage.routes.js';
import { renderCodeRouter } from './routes/renderCode.routes.js';
import { errorMiddleware } from './middlewares/error.middlewares.js';
import arcjetMiddleware from './middlewares/arcjet.middlewares.js';


const app = express();

//Temporary fix
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: false })); // Middleware to parse URL-encoded bodies

app.use(arcjetMiddleware);

// app.use('/api/auth', authRouter);
app.use('/api/generate-image', generateImageRouter);
app.use('/api/render-code', renderCodeRouter);

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

