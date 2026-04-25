/# 🚀 Quick Deployment Guide

## One-Command Deploy (if you have Fly & Stripe ready)

```bash
cd /root/.openclaw/workspace/prompt-coach-ia

# 1. Install deps
npm install

# 2. Edit .env or create from example
cp .env.example .env
# Edit: STRIPE_SECRET_KEY, DATABASE_URL, STRIPE_WEBHOOK_SECRET

# 3. Deploy to Fly
fly auth login
fly deploy
fly secrets set STRIPE_SECRET_KEY=sk_live_... DATABASE_URL=... STRIPE_WEBHOOK_SECRET=...

# 4. Run migrations
fly ssh console -C "cd /app && npx prisma migrate deploy"
```

## Stripe Setup Steps

1. Go to https://dashboard.stripe.com/apikeys → Copy **Secret Key** (pk_live_...)
2. Go to https://dashboard.stripe.com/webhooks → "Add endpoint"
   - URL: `https://prompt-coach-ia.fly.dev/stripe/webhook`
   - Events: `checkout.session.completed`
3. Copy the webhook secret (whsec_...)

## Database (Postgres)

Easiest: Neon (https://neon.tech) — free tier, connection string ready.

Or use Fly Postgres:
```bash
fly postgres create --name prompt-coach-ia-db --region iad --size shared-cpu-1x --initial-cluster-size 1
fly postgres attach prompt-coach-ia-db
```

This sets `DATABASE_URL` automatically.

## Test It Locally

```bash
# Terminal 1: Start DB (or use remote Neon)
npm install
npx prisma generate

# Terminal 2: Start app
npm run dev
```

Visit http://localhost:8080

## First Affiliate

```bash
curl -X POST http://localhost:8080/affiliate/register \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "commissionRate": 30}'
```

→ Returns `accountLinkUrl` — open it, complete Stripe Connect onboarding.

Then generate their referral code:
```bash
curl -X POST http://localhost:8080/affiliate/referral-code \
  -H "Content-Type: application/json" \
  -d '{"affiliateId": "<from-create-response>"}'
```

## How It Works

1. Visitor clicks `?ref=CODE` → cookie set for 30 days
2. When they buy via Stripe Checkout, webhook fires
3. Commission auto-added to affiliate's balance
4. Affiliate can request payout (min $50) → sent to their Stripe Connect account
5. Dashboard shows stats & history
