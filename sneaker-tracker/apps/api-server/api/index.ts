import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/server';

// Export the Express app as a Vercel serverless function
export default async (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};
