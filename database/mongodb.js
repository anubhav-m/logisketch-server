import mongoose from "mongoose";
import { DB_URI, NODE_ENV } from '../config/env.js';

export const connectToDB = async () => {
    try{
        await mongoose.connect(DB_URI);
        console.log(`Connected to MongoDB successfully in ${NODE_ENV} mode`);
    }
    catch(err){
        console.error('Error connecting to MongoDB:', err.message);
        process.exit(1);
    }
}