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
        enum: ['admin','member']
    },

    apiKey : {
        type: String,
        unique: true,
        sparse: true
    }    
}, {timestamps:true});

//Middleware to set role by default
userSchema.pre('save', function(next){
    if (!this.role){
        this.role = 'member';
    }
    next();
});

export const User = mongoose.model('User', userSchema);
