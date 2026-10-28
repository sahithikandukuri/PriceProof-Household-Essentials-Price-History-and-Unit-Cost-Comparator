// PriceProof: User Profile Routes (Protected)
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { supabase, supabaseAdmin } = require('../config/supabase');

router.use(requireAuth);

/**
 * GET /api/user/profile
 */
router.get('/profile', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = req.supabase || supabase;

    const { data: profile, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    return res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.userRole,
        profile: profile || {
          full_name: req.user.user_metadata?.full_name || 'Valued Shopper',
          city: 'Mumbai',
          preferred_currency: 'INR',
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/user/profile
 */
router.patch('/profile', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { full_name, phone, city } = req.body;
    const client = req.supabase || supabase;

    const { data, error } = await client
      .from('profiles')
      .upsert({
        id: userId,
        email: req.user.email,
        full_name,
        phone,
        city,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, profile: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
