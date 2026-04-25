// Affiliate routes
module.exports = (prisma, config) => {
  const express = require('express');
  const router = express.Router();
  const stripe = require('stripe')(config.stripe.secretKey);
  const { v4: uuidv4 } = require('uuid');

  // Register as affiliate
  router.post('/register', async (req, res) => {
    const { userId, commissionRate } = req.body;

    try {
      // Create Stripe Connect account (Express account)
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      const affiliate = await prisma.affiliate.create({
        data: {
          userId,
          stripeAccountId: account.id,
          commissionRate: commissionRate || config.stripe.defaultCommissionRate,
          isActive: false, // Needs to complete onboarding
        },
      });

      // Generate account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${config.baseUrl}/affiliate/refresh`,
        return_url: `${config.baseUrl}/affiliate/return`,
        type: 'account_onboarding',
      });

      res.json({ affiliate, accountLinkUrl: accountLink.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create referral code
  router.post('/referral-code', async (req, res) => {
    const { affiliateId, code } = req.body;
    const refCode = code || uuidv4().slice(0, 8);

    try {
      const referralCode = await prisma.referralCode.create({
        data: {
          code: refCode,
          affiliateId,
        },
      });
      res.json(referralCode);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get affiliate stats
  router.get('/stats/:affiliateId', async (req, res) => {
    const { affiliateId } = req.params;

    try {
      const conversions = await prisma.conversion.findMany({
        where: { affiliateId },
      });

      const totalClicks = conversions.length;
      const approved = conversions.filter(c => c.status === 'APPROVED').length;
      const totalCommissionCents = conversions
        .filter(c => c.status === 'APPROVED')
        .reduce((sum, c) => sum + c.commissionCents, 0);

      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
        include: { payouts: true },
      });

      res.json({
        totalClicks,
        approvedConversions: approved,
        totalCommissionCents,
        balanceCents: affiliate.balanceCents,
        totalPaidCents: affiliate.totalPaidCents,
        payouts: affiliate.payouts,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get referral link URL
  router.get('/link/:code', async (req, res) => {
    const { code } = req.params;
    res.json({ url: `${config.baseUrl}/?ref=${code}` });
  });

  return router;
};