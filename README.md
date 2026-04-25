# Prompt Coach IA - Affiliate Platform

Affiliate + Stripe Connect platform built on Fly.io with Postgres.

## Features
- Affiliate registration with Stripe Connect onboarding
- Unique referral codes + cookie-based tracking (30 days)
- Commission tracking: clicks, conversions, earnings
- Automatic commission on Stripe Checkout purchases
- Affiliate payout requests via Stripe Connect transfers
- Dashboard for affiliates

## Quick Start

### 1. Environment
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

### 2. Database
Uses Neon or Fly Postgres. Set `DATABASE_URL` in `.env`.

Prisma commands:
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed   # optional
```

### 3. Stripe Setup
- Create Stripe account: https://dashboard.stripe.com
- Get **Secret Key**: https://dashboard.stripe.com/apikeys
- Set up **Webhook endpoint**:
  ```
  URL: https://your-app.fly.dev/stripe/webhook
  Events: checkout.session.completed
  ```
- Copy webhook secret to `.env`

### 4. Fly.io Deploy
```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
fly auth login
fly launch --copy-config      # uses existing fly.toml
fly secrets set STRIPE_SECRET_KEY=sk_live_... DATABASE_URL=...
fly deploy
```

### 5. Create Your First Affiliate
Run via curl or API client:

```bash
curl -X POST http://localhost:8080/affiliate/register \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-id"}'
```

Returns `accountLinkUrl` — open it to complete Stripe Connect onboarding.

After onboarding, generate a referral code:
```bash
curl -X POST http://localhost:8080/affiliate/referral-code \
  -H "Content-Type: application/json" \
  -d '{"affiliateId": "<affiliate-id>"}'
```

## Usage

### Referral Links
Affiliates share: `https://prompt-coach-ia.fly.dev/?ref=CODE`

When a visitor clicks and buys within 30 days, commission is recorded.

### Products
Edit `src/routes/product.js` `PRODUCTS` array to add/change products.

Prices are in cents (USD).

### Commission
Default: 30%. Set per-affiliate via `commissionRate` on registration.

Commission = `product.price * (affiliate.commissionRate / 100)`

## API Endpoints

### Products
- `GET /product/list` — list products
- `POST /product/checkout/:productId` — create checkout session
  - Body: `{ "affiliateId": "...", "userId": "..." }`

### Affiliate
- `POST /affiliate/register` — register as affiliate
  - Body: `{ "userId": "...", "commissionRate": 30 }`
  - Returns: `{ affiliate, accountLinkUrl }`
- `POST /affiliate/referral-code` — create referral code
  - Body: `{ "affiliateId": "...", "code": "optional" }`
- `GET /affiliate/stats/:affiliateId` — stats
- `GET /affiliate/link/:code` — get referral URL

### Stripe (webhooks)
- `POST /stripe/webhook` — Stripe webhook (internal)

### Payout
- `POST /payout/request` — request payout
  - Body: `{ "affiliateId": "...", "amountCents": 5000 }`
- `GET /payout/history/:affiliateId` — payout history

### Dashboard
- `GET /dashboard?userId=...` — affiliate dashboard

## Database Schema
Key tables:
- `User` — customers
- `Affiliate` — affiliates + Stripe account + balance
- `ReferralCode` — affiliate codes
- `Conversion` — tracked sales/commissions
- `Payout` — payout requests

## Security Notes
- Stripe secret key is sensitive — keep in `.env`
- Webhook secret must match
- Use HTTPS in production (Fly handles this)
- Affiliate onboarding uses Stripe's hosted onboarding for PCI compliance

## Troubleshooting

### Commissions not recording
- Check Stripe webhook is configured and receiving events
- Verify `STRIPE_WEBHOOK_SECRET` matches dashboard
- Check `conversion` table after a test purchase

### Affiliate not receiving payouts
- Make sure Stripe Connect onboarding is complete
- Check `affiliate.stripeAccountId` exists
- Verify account can receive transfers

### Cookie tracking not working
- Ensure `BASE_URL` uses HTTPS in production (cookies are secure)
- Check `affiliateTrack` middleware is loaded (in `index.js`)

## License
MIT
