const app = require('./src/index.js');
const http = require('http');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_fake');
const { PrismaClient } = require('@prisma/client');

// Use SQLite in-memory for testing
const prisma = new PrismaClient();

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTest() {
  console.log('🧪 Starting e2e test...');

  // 1) Create a test user
  const user = await prisma.user.create({
    data: { email: 'test@example.com', name: 'Test User' },
  });
  console.log('✅ Created user:', user.id);

  // 2) Create affiliate for that user (manually - simulating Stripe Connect completed)
  const affiliate = await prisma.affiliate.create({
    data: {
      userId: user.id,
      stripeAccountId: 'acct_test123',
      isActive: true,
      commissionRate: 30,
    },
  });
  console.log('✅ Created affiliate:', affiliate.id);

  // 3) Create a referral code
  const ref = await prisma.referralCode.create({
    data: { code: 'TESTREF', affiliateId: affiliate.id },
  });
  console.log('✅ Created referral code:', ref.code);

  // 4) Simulate a Stripe Checkout session completed webhook
  // Build a fake session object like Stripe sends
  const fakeSession = {
    id: 'cs_test_fake_session_123',
    amount_total: 4999, // $49.99 in cents
    customer: 'cus_fake123',
    metadata: {
      affiliateId: affiliate.id,
      commissionCents: '1499', // 30% of 4999
      userId: user.id,
    },
  };

  console.log('📦 Simulating Stripe webhook: checkout.session.completed...');
  const res = await fetch('http://localhost:8080/stripe/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'fake-sig',
    },
    body: JSON.stringify(fakeSession),
  });

  const text = await res.text();
  console.log('📬 Webhook response:', res.status, text);

  // Wait a tick for DB write
  await sleep(500);

  // 5) Check DB for conversion
  const conversions = await prisma.conversion.findMany({
    where: { affiliateId: affiliate.id },
  });
  console.log('📊 Conversions found:', conversions.length);
  conversions.forEach(c => {
    console.log('   - Order:', c.orderId, 'Amount:', c.amountCents, '¢ Commission:', c.commissionCents, '¢ Status:', c.status);
  });

  // 6) Check affiliate balance updated
  const aff = await prisma.affiliate.findUnique({
    where: { id: affiliate.id },
  });
  console.log('💰 Affiliate balance:', aff.balanceCents, '¢ (earned total:', aff.totalEarnedCents, '¢)');

  if (conversions.length > 0 && aff.balanceCents === 1499) {
    console.log('✅✅✅ TEST PASSED! Commissions recorded correctly!');
  } else {
    console.log('❌ TEST FAILED! Expected balance 1499¢ and 1 conversion.');
  }

  await prisma.$disconnect();
  process.exit(conversions.length > 0 && aff.balanceCents === 1499 ? 0 : 1);
}

// Only run if called directly
if (require.main === module) {
  runTest().catch(err => {
    console.error('❌ Test error:', err);
    process.exit(1);
  });
}

module.exports = { runTest };
