// Affiliate cookie tracking middleware
module.exports = (prisma, config) => {
  return async (req, res, next) => {
    const refCode = req.query.ref;
    const existingRef = req.cookies[config.cookieName];

    // Set cookie if referral code provided and no existing one
    if (refCode && !existingRef) {
      const referralCode = await prisma.referralCode.findFirst({
        where: { code: refCode, isActive: true },
        include: { affiliate: true },
      });

      if (referralCode && referralCode.affiliate.isActive) {
        res.cookie(config.cookieName, refCode, {
          maxAge: config.cookieMaxAge,
          httpOnly: true,
          sameSite: 'lax',
        });
        req.affiliateId = referralCode.affiliateId;
      }
    } else if (existingRef) {
      const referralCode = await prisma.referralCode.findFirst({
        where: { code: existingRef },
        include: { affiliate: true },
      });
      if (referralCode && referralCode.affiliate.isActive) {
        req.affiliateId = referralCode.affiliateId;
      }
    }
    next();
  };
};