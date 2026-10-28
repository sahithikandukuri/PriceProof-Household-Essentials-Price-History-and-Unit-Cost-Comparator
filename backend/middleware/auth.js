// PriceProof: Authentication and Role-Based Authorization Middleware
const { supabase, supabaseAdmin, createAuthenticatedClient } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Middleware: Verify user authentication via Supabase JWT
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Missing or malformed Bearer token.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token.',
      });
    }

    // Verify token with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData || !authData.user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please sign in again.',
      });
    }

    const user = authData.user;
    req.user = user;
    req.token = token;
    req.supabase = createAuthenticatedClient(token) || supabase;

    // Fetch user role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    req.userRole = roleData ? roleData.role : 'customer';

    next();
  } catch (err) {
    logger.error('Authentication middleware error', err);
    return res.status(500).json({
      success: false,
      message: 'Internal authentication error.',
    });
  }
}

/**
 * Middleware: Enforce Administrator privileges
 *
 * BUG FIX: The previous implementation called requireAuth(req, res, callback)
 * inline synchronously. Because requireAuth is an async function, any errors or
 * early returns inside it (e.g. res.status(401).json(...)) happened in the
 * async call but the outer requireAdmin still called next() through the callback
 * before the async path settled. This could bypass the 401/403 response.
 *
 * Fix: await requireAuth by wrapping it in a Promise so we only proceed once it
 * has fully settled — including all its own async Supabase calls.
 */
async function requireAdmin(req, res, next) {
  // Wrap requireAuth so we can await it properly inside an async function
  const authPassed = await new Promise((resolve) => {
    requireAuth(req, res, () => resolve(true));
    // If requireAuth calls res.status(...).json(...) it will NOT call next,
    // so the Promise simply never resolves — Express has already sent the
    // 401 response. We add a safety guard by checking if the response was
    // already sent in the next tick.
  }).catch(() => false);

  // If requireAuth already sent a response (401/500), stop here
  if (res.headersSent) return;

  if (!authPassed) return; // Safety — should not normally be reached

  if (req.userRole !== 'administrator') {
    logger.warn(`Unauthorized administrative access attempt by user ${req.user?.id}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.',
    });
  }
  next();
}

/**
 * Optional Auth Middleware: If token provided, populates user; does not reject anonymous users
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: authData } = await supabase.auth.getUser(token);
      if (authData && authData.user) {
        req.user = authData.user;
        req.token = token;
        req.supabase = createAuthenticatedClient(token) || supabase;

        const { data: roleData } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', authData.user.id)
          .maybeSingle();
        req.userRole = roleData ? roleData.role : 'customer';
      }
    }
  } catch {
    // Ignore error for optional authentication
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
};
