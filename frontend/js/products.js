// PriceProof: Product Catalog Logic
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('products-grid');
  const searchInput = document.getElementById('catalog-search');
  const categoryFilter = document.getElementById('category-filter');
  const brandFilter = document.getElementById('brand-filter');
  const sortSelect = document.getElementById('sort-select');
  const resultCount = document.getElementById('results-count');

  let currentParams = {
    search: new URLSearchParams(window.location.search).get('search') || '',
    category: new URLSearchParams(window.location.search).get('category') || '',
    brand: '',
    sort: 'price_asc',
    page: 1,
  };

  if (searchInput && currentParams.search) {
    searchInput.value = currentParams.search;
  }

  // 1. Load Filter Metadata
  async function loadFilters() {
    try {
      const [catsRes, brandsRes] = await Promise.all([
        window.API.get('/products/categories'),
        window.API.get('/products/brands'),
      ]);

      if (categoryFilter && catsRes.data) {
        catsRes.data.forEach((cat) => {
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = `${cat.icon || ''} ${cat.name}`;
          if (cat.id === currentParams.category || cat.slug === currentParams.category) {
            opt.selected = true;
          }
          categoryFilter.appendChild(opt);
        });
      }

      if (brandFilter && brandsRes.data) {
        brandsRes.data.forEach((brand) => {
          const opt = document.createElement('option');
          opt.value = brand.id;
          opt.textContent = brand.name;
          brandFilter.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('Failed to load catalog filters', err);
    }
  }

  // 2. Fetch and Render Products
  async function loadProducts() {
    if (!grid) return;
    grid.innerHTML = Array(6).fill('<div class="product-card skeleton" style="height: 340px;"></div>').join('');

    try {
      const res = await window.API.get('/products', currentParams);
      const products = res.data || [];

      if (resultCount) {
        resultCount.textContent = `Showing ${products.length} of ${res.total || products.length} products`;
      }

      if (products.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">🔍</div>
            <h3>No products found</h3>
            <p>Try adjusting your search terms or clearing selected category filters.</p>
            <button id="reset-filters-btn" class="btn btn-secondary">Reset Filters</button>
          </div>
        `;
        document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          if (categoryFilter) categoryFilter.value = '';
          if (brandFilter) brandFilter.value = '';
          currentParams = { search: '', category: '', brand: '', sort: 'price_asc', page: 1 };
          loadProducts();
        });
        return;
      }

      grid.innerHTML = products.map((p) => {
        const lowestPrice = p.lowestPrice ? window.formatPrice(p.lowestPrice) : 'Price N/A';
        const unitCost = p.lowestUnitCost || '';
        const storeCount = p.storesCompared || (p.variants?.[0]?.listings?.length) || 1;

        return `
          <div class="product-card">
            <div class="product-card-img-wrapper">
              <img src="${p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'}" alt="${p.name}" class="product-card-img" loading="lazy" />
              <button class="btn-icon wishlist-btn" data-variant-id="${p.variants?.[0]?.id || ''}" style="position: absolute; top: 8px; right: 8px;" title="Save to Wishlist">❤️</button>
            </div>
            <span class="product-brand">${p.brand?.name || 'Household Essential'}</span>
            <h3 class="product-title" title="${p.name}">
              <a href="/product-details.html?id=${p.id}">${p.name}</a>
            </h3>
            
            <div class="product-pricing-box">
              <div class="price-main">
                <span class="price-lowest price-tabular">${lowestPrice}</span>
                ${unitCost ? `<span class="badge badge-best-value price-tabular">${unitCost}</span>` : ''}
              </div>
              <span class="price-stores-count">Compared across ${storeCount} store${storeCount > 1 ? 's' : ''}</span>
            </div>

            <div class="product-actions">
              <a href="/compare.html?id=${p.id}" class="btn btn-primary btn-sm" style="flex:1;">Compare Stores</a>
              <a href="/product-details.html?id=${p.id}" class="btn btn-outline btn-sm" title="View Details">Details</a>
            </div>
          </div>
        `;
      }).join('');

      // Attach wishlist click handlers
      document.querySelectorAll('.wishlist-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const variantId = btn.getAttribute('data-variant-id');
          if (!variantId) return;

          if (!window.AuthManager?.isAuthenticated()) {
            window.showToast('Please sign in to save items to your wishlist', 'error');
            setTimeout(() => { window.location.href = '/login.html'; }, 1200);
            return;
          }

          try {
            await window.API.post('/wishlist', { variant_id: variantId });
            window.showToast('Product saved to your wishlist!');
          } catch (err) {
            window.showToast(err.message || 'Failed to save to wishlist', 'error');
          }
        });
      });
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><p>Error loading catalog. Please check backend connection.</p></div>`;
    }
  }

  // 3. Search Debounce
  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentParams.search = e.target.value.trim();
        currentParams.page = 1;
        loadProducts();
      }, 300);
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      currentParams.category = e.target.value;
      currentParams.page = 1;
      loadProducts();
    });
  }

  if (brandFilter) {
    brandFilter.addEventListener('change', (e) => {
      currentParams.brand = e.target.value;
      currentParams.page = 1;
      loadProducts();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentParams.sort = e.target.value;
      loadProducts();
    });
  }

  await loadFilters();
  await loadProducts();
});
