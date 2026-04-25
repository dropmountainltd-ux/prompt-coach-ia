#!/bin/bash
set -e

echo "🚀 Deploying Prompt Coach IA to Fly.io..."

# Check flyctl
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl not found. Install: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Check login status
flyctl auth whoami &> /dev/null || {
    echo "❌ Not logged in to Fly. Run: fly auth login"
    exit 1
}

cd "$(dirname "$0")"

# Create .env from example if missing
if [ ! -f .env ]; then
    echo "⚠️  .env not found. Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your values before deploying!"
    echo "   You need: STRIPE_SECRET_KEY, DATABASE_URL"
    exit 1
fi

# Source .env to check required vars
source .env

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ STRIPE_SECRET_KEY is required in .env"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is required in .env"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔨 Generating Prisma client..."
npx prisma generate

# Deploy secrets
echo "🔐 Setting Fly.io secrets..."
flyctl secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
flyctl secrets set DATABASE_URL="$DATABASE_URL"
flyctl secrets set BASE_URL="${BASE_URL:-https://prompt-coach-ia.fly.dev}"
flyctl secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"

# Deploy
echo "🚀 Deploying to Fly.io..."
flyctl deploy

# Run migrations on the deployed instance
echo "🔄 Running database migrations..."
flyctl ssh issue --agent
flyctl ssh console -C "cd /app && npx prisma migrate deploy"

echo "✅ Deployment complete!"
echo ""
echo "App URL: https://${FLY_APP_NAME:-prompt-coach-ia}.fly.dev"
echo ""
echo "Next steps:"
echo "1. Set up Stripe webhook:"
echo "   URL: https://${FLY_APP_NAME:-prompt-coach-ia}.fly.dev/stripe/webhook"
echo "   Events: checkout.session.completed"
echo "2. Create an admin user in your database"
echo "3. Register your first affiliate via the /affiliate/register endpoint"
