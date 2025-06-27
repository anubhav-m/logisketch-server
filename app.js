import express from 'express';
import { PORT, NODE_ENV } from './config/env.js';
import { generateImageRouter } from './routes/generateImage.routes.js';
import { renderCodeRouter } from './routes/renderCode.routes.js';
import { errorMiddleware } from './middlewares/error.middlewares.js';
import arcjetMiddleware from './middlewares/arcjet.middlewares.js';

const app = express();

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: false })); // Middleware to parse URL-encoded bodies

app.use(arcjetMiddleware);

app.use('/api/generate-image', generateImageRouter);
app.use('/api/render-code', renderCodeRouter);

app.use(errorMiddleware);

app.get('/', (req, res)=>{
    res.send('Welcome to logisketch api')
});  

app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});