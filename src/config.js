require('dotenv').config();

const config = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    // Commission rate default (can be overridden per affiliate)
    defaultCommissionRate: 30.0,
  },
  baseUrl: process.env.BASE_URL || 'http://localhost:8080',
  cookieName: 'affiliate_ref',
  cookieMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  minPayoutCents: 5000, // $50 minimum payout
};

module.exports = config;