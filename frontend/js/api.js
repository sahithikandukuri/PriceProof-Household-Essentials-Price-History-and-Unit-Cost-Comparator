// PriceProof: Centralized API Client
class ApiClient {
  static async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${window.CONFIG?.API_BASE_URL || '/api'}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Attach token if user is signed in
    const token = window.AuthManager?.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${url}:`, err.message);
      throw err;
    }
  }

  static get(endpoint, params = {}) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`${endpoint}${qs}`, { method: 'GET' });
  }

  static post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  static delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

window.API = ApiClient;
