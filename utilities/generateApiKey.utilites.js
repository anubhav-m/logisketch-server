import crypto from 'crypto';

export const generateApiKey = () => {
    return crypto.randomBytes(32).toString("hex") //64 - character API Key
}