// PriceProof: Supabase Client Configuration & Connection Factory
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  logger.warn('Supabase URL or Anon Key is missing from environment. Check .env configuration.');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  logger.warn(
    'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
    'Admin operations will fall back to the anon key and will be blocked by RLS policies. ' +
    'Seed imports, admin writes, and role lookups may fail. ' +
    'Add SUPABASE_SERVICE_ROLE_KEY to your .env file.'
  );
}

// 1. Public / Anon Client (uses RLS)
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })
  : null;

// 2. Admin / Service Role Client (bypasses RLS for administrative background jobs & role checking)
// Falls back to the anon client ONLY when the service role key is absent. A startup warning
// above makes this condition visible so it is never silently ignored in production.
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : supabase; // Fallback: anon client — admin writes will be blocked by RLS

/**
 * Helper to create an authenticated client using the user's incoming JWT Bearer token
 * This ensures Supabase Row Level Security applies directly to the user's claims
 */
function createAuthenticatedClient(token) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: { persistSession: false },
  });
}

module.exports = {
  supabase,
  supabaseAdmin,
  createAuthenticatedClient,
};
