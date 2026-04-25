// Auth routes (placeholder)
module.exports = (prisma, config) => {
  const express = require('express');
  const router = express.Router();

  router.post('/login', async (req, res) => {
    res.json({ token: 'fake-jwt-token' });
  });

  return router;
};