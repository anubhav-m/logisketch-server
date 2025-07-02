import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email : {
        type: String,
        required: [true, 'User name is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },

    password : {
        type: String,
        required: [true, 'Password is required'],
        minLength: 6
    },

    role : {
        type: String,
        enum: ['admin','member'],
        default: 'member'
    },

    apiKey : {
        type: String,
        unique: true,
        sparse: true,
        default: null
    }    
}, {timestamps:true});

export const User = mongoose.model('User', userSchema);
