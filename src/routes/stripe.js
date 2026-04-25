// Stripe webhooks and payment handling
module.exports = (prisma, config) => {
  const express = require('express');
  const router = express.Router();
  const stripe = require('stripe')(config.stripe.secretKey);

  // Stripe webhook endpoint
  router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    // Allow bypass for testing
    if (config.stripe.webhookSecret === 'test_mode_bypass') {
      event = req.body;
    } else {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    // Stripe sends the event object when using proper webhooks
    // For bypass mode, req.body is already the event object
    const eventData = event.data ? event.data.object : event;
    const eventType = event.type ? event.type : event.type;

    if (!event.type) {
      // This is our test bypass - wrap it
      event.type = 'checkout.session.completed';
    }

    switch (event.type) {
      case 'checkout.session.completed':
        const session = eventData;

        if (session.metadata.affiliateId) {
          const commissionCents = parseInt(session.metadata.commissionCents) || 0;

          // Record conversion
          await prisma.conversion.create({
            data: {
              affiliateId: session.metadata.affiliateId,
              userId: session.metadata.userId || null,
              orderId: session.id,
              amountCents: session.amount_total,
              commissionCents,
              status: 'APPROVED',
            },
          });

          // Update affiliate balance
          const affiliate = await prisma.affiliate.findUnique({
            where: { id: session.metadata.affiliateId },
          });

          await prisma.affiliate.update({
            where: { id: session.metadata.affiliateId },
            data: {
              balanceCents: affiliate.balanceCents + commissionCents,
              totalEarnedCents: affiliate.totalEarnedCents + commissionCents,
            },
          });
        }
        break;

      case 'payout.paid':
        // Handle payout completion from Stripe Connect transfers
        break;

      case 'payout.failed':
        // Handle failed payout
        break;
    }

    res.json({ received: true });
  });

  // Request payout (manual trigger)
  router.post('/request-payout', async (req, res) => {
    const { affiliateId, amountCents } = req.body;

    try {
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
      });

      if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });
      if (amountCents > affiliate.balanceCents) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      if (amountCents < config.minPayoutCents) {
        return res.status(400).json({ error: `Minimum payout is ${config.minPayoutCents / 100} USD` });
      }

      // Create transfer to affiliate's Stripe Connect account
      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: 'usd',
        destination: affiliate.stripeAccountId,
      });

      const payout = await prisma.payout.create({
        data: {
          affiliateId,
          amountCents,
          stripePayoutId: transfer.id,
          status: 'PROCESSING',
        },
      });

      // Deduct from affiliate balance
      await prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          balanceCents: affiliate.balanceCents - amountCents,
          totalPaidCents: affiliate.totalPaidCents + amountCents,
        },
      });

      res.json(payout);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};