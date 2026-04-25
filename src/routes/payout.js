// Payout request routes
module.exports = (prisma, config) => {
  const express = require('express');
  const router = express.Router();

  // Manual payout request (if not using automatic Stripe transfers)
  router.post('/request', async (req, res) => {
    const { affiliateId, amountCents } = req.body;

    if (amountCents < config.minPayoutCents) {
      return res.status(400).json({ error: `Minimum payout is $${config.minPayoutCents / 100}` });
    }

    try {
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
      });

      if (amountCents > affiliate.balanceCents) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      const payout = await prisma.payout.create({
        data: {
          affiliateId,
          amountCents,
          status: 'PENDING',
        },
      });

      res.json(payout);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get payout history
  router.get('/history/:affiliateId', async (req, res) => {
    const { affiliateId } = req.params;

    try {
      const payouts = await prisma.payout.findMany({
        where: { affiliateId },
        orderBy: { requestedAt: 'desc' },
      });
      res.json(payouts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};