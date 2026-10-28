// PriceProof: Administrator Operations Logic
document.addEventListener('DOMContentLoaded', async () => {
  // Check admin privileges
  if (!window.AuthManager?.isAdmin()) {
    const adminArea = document.getElementById('admin-container');
    if (adminArea) {
      adminArea.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⛔</div>
          <h2>Administrator Access Required</h2>
          <p>You must be authenticated with an administrator role to access this console.</p>
          <a href="/login.html" class="btn btn-primary" style="margin-top:var(--space-md);">Sign In as Admin</a>
        </div>
      `;
    }
    return;
  }

  // 1. Overview Statistics
  const statsOverview = document.getElementById('admin-stats-overview');
  if (statsOverview) {
    try {
      const res = await window.API.get('/admin/overview');
      const s = res.stats;
      statsOverview.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:var(--space-md); margin-bottom:var(--space-xl);">
          <div style="background:var(--color-surface); padding:var(--space-md); border-radius:var(--radius-md); border:1px solid var(--color-border);">
            <span style="font-size:0.8rem; text-transform:uppercase; color:var(--color-text-muted);">Total Products</span>
            <div style="font-size:1.8rem; font-weight:700; color:var(--color-primary);">${s.totalProducts}</div>
          </div>
          <div style="background:var(--color-surface); padding:var(--space-md); border-radius:var(--radius-md); border:1px solid var(--color-border);">
            <span style="font-size:0.8rem; text-transform:uppercase; color:var(--color-text-muted);">Active Brands</span>
            <div style="font-size:1.8rem; font-weight:700; color:var(--color-text-primary);">${s.totalBrands}</div>
          </div>
          <div style="background:var(--color-surface); padding:var(--space-md); border-radius:var(--radius-md); border:1px solid var(--color-border);">
            <span style="font-size:0.8rem; text-transform:uppercase; color:var(--color-text-muted);">Retailers Tracked</span>
            <div style="font-size:1.8rem; font-weight:700; color:var(--color-text-primary);">${s.totalStores}</div>
          </div>
          <div style="background:var(--color-surface); padding:var(--space-md); border-radius:var(--radius-md); border:1px solid var(--color-border);">
            <span style="font-size:0.8rem; text-transform:uppercase; color:var(--color-text-muted);">Price Observations</span>
            <div style="font-size:1.8rem; font-weight:700; color:var(--color-accent);">${s.totalPriceRecords}</div>
          </div>
        </div>
      `;
    } catch (err) {
      console.error('Failed to load admin stats', err);
    }
  }

  // 2. Manual Price Logger Form
  const priceForm = document.getElementById('record-price-form');
  if (priceForm) {
    // Populate store dropdown and product variants dropdown
    try {
      const [storesRes, productsRes] = await Promise.all([
        window.API.get('/products/stores'),
        window.API.get('/products?limit=100'),
      ]);

      const storeSelect = document.getElementById('price-store-select');
      const variantSelect = document.getElementById('price-variant-select');

      if (storeSelect && storesRes.data) {
        storeSelect.innerHTML = storesRes.data.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
      }

      if (variantSelect && productsRes.data) {
        const options = [];
        productsRes.data.forEach((p) => {
          (p.variants || []).forEach((v) => {
            options.push(`<option value="${v.id}">${p.name} — ${v.variant_name} (${v.quantity} ${v.unit})</option>`);
          });
        });
        variantSelect.innerHTML = options.join('');
      }
    } catch (err) {
      console.error('Failed to populate price logger options', err);
    }

    priceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const variant_id = document.getElementById('price-variant-select').value;
      const store_id = document.getElementById('price-store-select').value;
      const price = document.getElementById('price-amount-input').value;
      const mrp = document.getElementById('price-mrp-input').value;

      try {
        await window.API.post('/admin/prices', {
          variant_id,
          store_id,
          price: Number(price),
          mrp: mrp ? Number(mrp) : null,
          source: 'admin_dashboard',
        });
        window.showToast('Price observation recorded and alerts evaluated!');
        priceForm.reset();
      } catch (err) {
        window.showToast(err.message || 'Failed to update price', 'error');
      }
    });
  }

  // 3. New Product Form
  const productForm = document.getElementById('create-product-form');
  if (productForm) {
    try {
      const [catsRes, brandsRes] = await Promise.all([
        window.API.get('/products/categories'),
        window.API.get('/products/brands'),
      ]);

      const catSelect = document.getElementById('new-product-category');
      const brandSelect = document.getElementById('new-product-brand');

      if (catSelect && catsRes.data) {
        catSelect.innerHTML = catsRes.data.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
      }
      if (brandSelect && brandsRes.data) {
        brandSelect.innerHTML = brandsRes.data.map((b) => `<option value="${b.id}">${b.name}</option>`).join('');
      }
    } catch {}

    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-product-name').value;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const category_id = document.getElementById('new-product-category').value;
      const brand_id = document.getElementById('new-product-brand').value;
      const description = document.getElementById('new-product-desc').value;
      const image_url = document.getElementById('new-product-img').value;

      const variant_name = document.getElementById('new-variant-name').value;
      const quantity = document.getElementById('new-variant-qty').value;
      const unit = document.getElementById('new-variant-unit').value;

      try {
        await window.API.post('/admin/products', {
          name,
          slug,
          category_id,
          brand_id,
          description,
          image_url,
          variants: [
            {
              variant_name,
              quantity: Number(quantity),
              unit,
              is_default: true,
            },
          ],
        });

        window.showToast('Product and default variant created successfully!');
        productForm.reset();
      } catch (err) {
        window.showToast(err.message || 'Failed to create product', 'error');
      }
    });
  }

  // 4. Batch Import Feed Simulator
  const importForm = document.getElementById('import-batch-form');
  if (importForm) {
    importForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const store_id = document.getElementById('import-store-select').value;
      const source_name = document.getElementById('import-source-name').value;
      const jsonText = document.getElementById('import-json-payload').value;

      try {
        const records = JSON.parse(jsonText);
        const res = await window.API.post('/admin/import-jobs', {
          store_id,
          source_name,
          records,
        });
        window.showToast(`Import processed! Total: ${res.data.total}, Imported: ${res.data.imported}, Failed: ${res.data.failed}`);
      } catch (err) {
        window.showToast('Invalid JSON payload or import error: ' + err.message, 'error');
      }
    });
  }
});
