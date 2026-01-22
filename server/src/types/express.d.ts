import { TokenPayload } from '../lib/tokens.js';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: TokenPayload;
    }
  }
}

export {};
