const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const config = require('./config');

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Affiliate tracking middleware
const affiliateTrack = require('./middleware/affiliateTrack');
app.use(affiliateTrack(prisma, config));

// Routes
const authRoutes = require('./routes/auth')(prisma, config);
const affiliateRoutes = require('./routes/affiliate')(prisma, config);
const productRoutes = require('./routes/product')(prisma, config);
const stripeRoutes = require('./routes/stripe')(prisma, config);
const payoutRoutes = require('./routes/payout')(prisma, config);

app.use('/auth', authRoutes);
app.use('/affiliate', affiliateRoutes);
app.use('/product', productRoutes);
app.use('/stripe', stripeRoutes);
app.use('/payout', payoutRoutes);

// Home page
app.get('/', async (req, res) => {
  res.render('home', { baseUrl: config.baseUrl });
});

// Dashboard
app.get('/dashboard', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).send('userId required');
  
  const affiliate = await prisma.affiliate.findFirst({
    where: { userId },
    include: { conversions: true, payouts: true },
  });
  
  if (!affiliate) return res.status(404).send('Affiliate not found');
  
  res.render('dashboard', { affiliate, baseUrl: config.baseUrl });
});

const PORT = process.env.PORT || 8080;

// Only start server if run directly (for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Prompt Coach IA running on port ${PORT}`);
  });
}

module.exports = app;