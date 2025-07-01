import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import { User } from '../models/user.models.js';
import { JWT_SECRET, JWT_EXPIRY } from '../config/env.js';

export const signUp = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { email, password } = req.body;

        //Check if user exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            const error = new Error("User already exists");
            error.statusCode = 409 //Conflict
            throw error;
        }

        //Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        //Create a new user
        const newUser = await User.create([{ email, password: hashedPassword }], { session });

        //If user creation is successful, commit the transaction
        await session.commitTransaction();
        session.endSession();

        //Send user response
        res.status(201).json({
            success: true,
            message: 'User created successfully',
        });
    }

    catch (err) {
        await session.abortTransaction();
        session.endSession();
        next(err);
    }
}

export const signIn = async (req, res, next) => {

    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            const error = new Error('Invalid password');
            error.statusCode = 404;
            throw error;
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

        res.status(200).json({
            success: true,
            message: 'User signed in successfully',
            token
        });
    }

    catch (err) {
        next(err);
    }
}