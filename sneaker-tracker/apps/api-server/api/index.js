/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
// Vercel serverless function entry point
// This imports the compiled Express app from dist/
const app = require('../dist/server').default;

module.exports = (req, res) => {
  return app(req, res);
};
