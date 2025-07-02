import cors from 'cors';
import { User } from '../models/user.models.js';

export const dynamicCors = async (req, res, next) => {
  const origin = req.headers.origin;
  const method = req.method;

  // STEP 1: Handle preflight requests without checking DB
  if (method === 'OPTIONS') {
    return cors({
      origin: origin || false,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['content-type', 'authorization', 'X-API-Key'],
      optionsSuccessStatus: 204,
    })(req, res, next);
  }

  // STEP 2: For actual requests, validate API key
  const apiKey = req.headers['x-api-key'];

  if (!origin || !apiKey) {
    return cors({ origin: false })(req, res, next);
  }

  try {
    const user = await User.findOne({ apiKey });

    const corsOptions = {
      origin: user ? origin : false,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['content-type', 'authorization', 'X-API-Key'],
    };

    return cors(corsOptions)(req, res, next);
  } catch (err) {
    return cors({ origin: false })(req, res, next);
  }
};
