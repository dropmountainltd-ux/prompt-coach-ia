// Product and checkout routes
module.exports = (prisma, config) => {
  const express = require('express');
  const router = express.Router();
  const stripe = require('stripe')(config.stripe.secretKey);

  // Product list
  const PRODUCTS = [
    {
      id: 'prompt-coach-pro',
      name: 'Prompt Coach Pro',
      price: 4999, // cents = $49.99
      description: 'Full course + lifetime updates',
    },
    {
      id: 'prompt-coach-basic',
      name: 'Prompt Coach Basic',
      price: 1999, // cents = $19.99
      description: 'Basic course access',
    },
  ];

  // Create checkout session with affiliate tracking
  router.post('/checkout/:productId', async (req, res) => {
    const { productId } = req.params;
    const { affiliateId, userId } = req.body;

    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    try {
      let affiliate = null;
      if (affiliateId) {
        affiliate = await prisma.affiliate.findUnique({
          where: { id: affiliateId },
        });
      }

      const commissionCents = affiliate
        ? Math.round((product.price * affiliate.commissionRate) / 100)
        : 0;

      // Create Stripe Checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: product.name },
              unit_amount: product.price,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${config.baseUrl}/product/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.baseUrl}/product/cancel`,
        metadata: {
          affiliateId: affiliateId || '',
          commissionCents: commissionCents.toString(),
          userId: userId || '',
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Product list
  router.get('/list', (req, res) => {
    res.json(PRODUCTS);
  });

  // Success page
  router.get('/success', async (req, res) => {
    const { session_id } = req.query;
    res.render('success', { sessionId: session_id });
  });

  router.get('/cancel', (req, res) => {
    res.render('cancel');
  });

  return router;
};