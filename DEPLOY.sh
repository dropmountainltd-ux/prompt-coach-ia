#!/bin/bash
# One-command deploy for Prompt Coach IA
# Run this on your machine after `fly auth login`
set -e

cd "$(dirname "$0")"

echo "🚀 Deploying Prompt Coach IA to Fly.io..."

# Export .env values for fly deploy (they must be set as fly secrets)
export STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-"pk_live_51Suhu90XJcR1YL8tozmuQZluvgp3bujUvfnrJwqDjQnRsk0r2RKSmHm7dSuibjGkjbsAwwbt0UG4aqRiyUWmFYOj00DZVpBpTT"}
export STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-"whsec_0LpSFlrNxWgBRHuDU2zivuIwRq7YdVKh"}
export DATABASE_URL=${DATABASE_URL:-"postgresql://neondb_owner:npg_redwICY1pH9T@ep-fancy-sound-a4hl6eys-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"}
export BASE_URL=${BASE_URL:-"https://prompt-coach-ia.fly.dev"}

# Set fly secrets
echo "🔐 Setting Fly secrets..."
fly secrets set \
  STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
  DATABASE_URL="$DATABASE_URL" \
  BASE_URL="$BASE_URL"

# Deploy
echo "🚀 Deploying..."
fly deploy

# Run migrations
echo "🔄 Running migrations..."
fly ssh console -C "cd /app && npx prisma migrate deploy"

echo "✅ Deploy complete!"
echo "App URL: https://prompt-coach-ia.fly.dev"
