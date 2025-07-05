import { Interaction } from '../models/interaction.models.js';

export const saveInteraction = async (req, res, next) => {
    try {
        if (!req.body.prompt || !req.body.code || !req.body.svg) {
            const error = new Error('prompt/code/svg - Not found');
            error.statusCode = 404;
            throw error;
        }

        await Interaction.create({ ...req.body, user: req.user._id });

        res.status(201).json({
            success: true,
            message: 'Interaction saved successfully'
        });
    }

    catch (err) {
        next(err);
    }
}

export const getAllInteractions = async (req, res, next) => {
    try {
        const interactions = await Interaction.find({ user: req.user._id });

        if (interactions.length === 0) {
            const error = new Error('No history of interactions found');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            message: 'Interactions retreived',
            interactions
        })
    }

    catch (err) {
        next(err);
    }
}

export const updateInteraction = async (req, res, next) => {
    try {
        if (!req.body.interactionId) {
            const error = new Error('Interaction Id not found');
            error.statusCode = 404;
            throw error;
        }

        const interaction = await Interaction.findById(req.body.interactionId);

        if (!interaction) {
            const error = new Error('No interaction found by the given Id');
            error.statusCode = 404;
            throw error;
        }

        if (!req.body.prompt || !req.body.code || !req.body.svg) {
            const error = new Error('prompt/code/svg - Not found');
            error.statusCode = 404;
            throw error;
        }

        interaction.prompt = req.body.prompt;
        interaction.code = req.body.code;
        interaction.svg = req.body.svg;
        interaction.save();

        res.status(200).json({
            success: true,
            message: "Interaction updated successfully"
        });
    }

    catch (err) {
        next(err);
    }
}

export const deleteInteraction = async (req, res, next) => {
    try {
        if (!req.body.interactionId) {
            const error = new Error('Interaction Id not found');
            error.statusCode = 404;
            throw error;
        }

        const interaction = await Interaction.findById(req.body.interactionId);

        if (!interaction) {
            const error = new Error('No interaction found by the given Id');
            error.statusCode = 404;
            throw error;
        }

        await interaction.deleteOne();

        res.status(200).json({
            success: true,
            message: "Interection deleted successfully"
        });
    }

    catch (err) {
        next(err);
    }
}

