// PriceProof: Client Authentication Manager
(function () {
  const SESSION_KEY = 'priceproof_auth_session';
  let supabaseClient = null;

  async function getSupabase() {
    if (supabaseClient) return supabaseClient;
    try {
      // Query config endpoint to get Supabase URL and anon key
      const config = await window.API.get('/config');
      if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
        supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      }
    } catch (e) {
      console.warn('Could not initialize direct client-side Supabase instance', e);
    }
    return supabaseClient;
  }

  const AuthManager = {
    getSession: () => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },

    getToken: () => {
      const session = AuthManager.getSession();
      return session?.access_token || null;
    },

    getUser: () => {
      const session = AuthManager.getSession();
      return session?.user || null;
    },

    isAuthenticated: () => {
      return Boolean(AuthManager.getToken());
    },

    isAdmin: () => {
      const session = AuthManager.getSession();
      return session?.user?.role === 'administrator' || session?.role === 'administrator';
    },

    saveSession: (session, role = 'customer') => {
      const payload = {
        ...session,
        role,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
      AuthManager.updateNavUI();
    },

    signIn: async (email, password) => {
      const sb = await getSupabase();
      if (sb) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Fetch role from backend
        let role = 'customer';
        try {
          const profileRes = await fetch(`${window.CONFIG.API_BASE_URL}/user/profile`, {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          });
          const profileData = await profileRes.json();
          if (profileData.user?.role) role = profileData.user.role;
        } catch {}

        AuthManager.saveSession(data.session, role);
        return data;
      } else {
        // DEMO / OFFLINE MODE ONLY
        // This mock path activates only when the Supabase client could not be initialised
        // (e.g. the /api/config endpoint is unreachable). It is intentionally limited to
        // local development and must never reach production. Mock tokens are rejected by
        // the backend JWT verification middleware, so all protected API calls will fail.
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          throw new Error('Authentication service is unavailable. Please try again later.');
        }
        console.warn('[PriceProof] Using offline demo mode — mock token active. Protected API routes will return 401.');
        const mockUser = {
          id: '00000000-0000-0000-0000-000000000001',
          email,
          user_metadata: { full_name: email.split('@')[0] },
        };
        const mockSession = {
          access_token: 'mock_jwt_token_demo',
          user: mockUser,
        };
        const role = email.includes('admin') ? 'administrator' : 'customer';
        AuthManager.saveSession(mockSession, role);
        return { user: mockUser, session: mockSession };
      }
    },

    signUp: async (email, password, fullName) => {
      const sb = await getSupabase();
      if (sb) {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.session) {
          AuthManager.saveSession(data.session, 'customer');
        }
        return data;
      } else {
        // DEMO / OFFLINE MODE ONLY — see signIn for explanation
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          throw new Error('Authentication service is unavailable. Please try again later.');
        }
        console.warn('[PriceProof] Using offline demo mode — mock token active. Protected API routes will return 401.');
        const mockUser = {
          id: '00000000-0000-0000-0000-000000000001',
          email,
          user_metadata: { full_name: fullName },
        };
        const mockSession = {
          access_token: 'mock_jwt_token_demo',
          user: mockUser,
        };
        AuthManager.saveSession(mockSession, 'customer');
        return { user: mockUser, session: mockSession };
      }
    },

    signOut: async () => {
      const sb = await getSupabase();
      if (sb) {
        await sb.auth.signOut().catch(() => {});
      }
      localStorage.removeItem(SESSION_KEY);
      AuthManager.updateNavUI();
      window.location.href = '/login.html';
    },

    updateNavUI: () => {
      const authLinks = document.getElementById('nav-auth-links');
      if (!authLinks) return;

      const user = AuthManager.getUser();
      const isAdmin = AuthManager.isAdmin();

      if (user) {
        authLinks.innerHTML = `
          ${isAdmin ? `<a href="/admin/dashboard.html" class="nav-link" style="color:var(--color-accent); font-weight:700;">⚙️ Admin</a>` : ''}
          <a href="/wishlist.html" class="btn-icon" title="Wishlist">❤️</a>
          <a href="/shopping-list.html" class="btn btn-secondary btn-sm">🛒 Lists</a>
          <a href="/profile.html" class="btn-icon" title="Profile">👤</a>
          <button id="logout-btn" class="btn btn-outline btn-sm">Logout</button>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', () => {
          AuthManager.signOut();
        });
      } else {
        authLinks.innerHTML = `
          <a href="/login.html" class="btn btn-outline btn-sm">Sign In</a>
          <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
        `;
      }
    },
  };

  window.AuthManager = AuthManager;
  document.addEventListener('DOMContentLoaded', () => {
    AuthManager.updateNavUI();
  });
})();
