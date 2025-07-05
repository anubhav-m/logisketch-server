import mongoose from "mongoose";

const interactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
        index: true
    },

    prompt: {
        type: String,
        required: [true, 'Prompt is required']
    },

    code: {
        type: String,
        required: [true, 'Code is required']
    },

    svg: {
        type: String,
        required: [true, 'svg is required']
    }
}, { timestamps: true });

export const Interaction = mongoose.model('Interaction', interactionSchema);