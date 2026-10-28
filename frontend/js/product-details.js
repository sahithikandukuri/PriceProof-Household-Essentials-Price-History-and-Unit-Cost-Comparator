// PriceProof: Product Details & Store Comparison Logic
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    window.location.href = '/products.html';
    return;
  }

  const container = document.getElementById('product-details-container');

  try {
    const res = await window.API.get(`/products/${productId}`);
    const product = res.data;

    if (!product) {
      container.innerHTML = `<div class="empty-state"><h3>Product not found</h3><a href="/products.html" class="btn btn-primary">Return to Catalog</a></div>`;
      return;
    }

    const variants = product.variants || [];
    let activeVariantIndex = 0;

    function renderView() {
      const activeVariant = variants[activeVariantIndex] || {};
      const listings = activeVariant.listings || [];

      // Sort listings: lowest unit cost first
      listings.sort((a, b) => (a.unitCost || 9999) - (b.unitCost || 9999));

      container.innerHTML = `
        <div class="product-details-grid" style="display: grid; grid-template-columns: 1fr 1.2fr; gap: var(--space-xl); margin-top: var(--space-lg);">
          <!-- Left: Product Image & Quick Info -->
          <div>
            <div style="background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-lg); text-align: center;">
              <img src="${product.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'}" alt="${product.name}" style="max-height: 320px; width: auto; max-width: 100%; object-fit: contain;" />
            </div>

            <div style="margin-top: var(--space-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-md);">
              <h4 style="margin-bottom: var(--space-xs);">About This Item</h4>
              <p style="font-size: 0.95rem;">${product.description || 'Household grocery essential verified for standard unit-cost comparisons.'}</p>
              
              <div style="margin-top: var(--space-md); display: flex; gap: var(--space-sm);">
                <button id="add-to-list-btn" class="btn btn-primary" style="flex:1;">🛒 Add to Shopping List</button>
                <button id="set-alert-btn" class="btn btn-outline" title="Set Price-Drop Alert">🔔 Set Alert</button>
              </div>
            </div>
          </div>

          <!-- Right: Pricing, Packaging Switcher & Comparisons -->
          <div>
            <span class="product-brand">${product.brand?.name || 'Essential'} • ${product.category?.name || 'Grocery'}</span>
            <h1 style="font-size: 1.8rem; margin: var(--space-xs) 0 var(--space-md) 0;">${product.name}</h1>

            <!-- Packaging Variants Switcher -->
            ${variants.length > 1 ? `
              <div style="margin-bottom: var(--space-lg);">
                <label class="form-label">Available Packaging Sizes:</label>
                <div style="display: flex; gap: var(--space-sm); flex-wrap: wrap; margin-top: 4px;">
                  ${variants.map((v, idx) => `
                    <button class="btn btn-sm ${idx === activeVariantIndex ? 'btn-primary' : 'btn-outline'} variant-pill" data-index="${idx}">
                      ${v.variant_name} (${v.quantity} ${v.unit})
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Multi-Store Comparison Table for Selected Variant -->
            <div style="margin-bottom: var(--space-lg);">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--space-sm);">
                <h3>Live Store Prices</h3>
                <a href="/price-history.html?variantId=${activeVariant.id}" class="btn btn-outline btn-sm">📈 Price History Trends</a>
              </div>

              <div class="table-responsive">
                <table class="comparison-table">
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th>Selling Price</th>
                      <th>Unit Cost</th>
                      <th>Status</th>
                      <th>Value Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${listings.map((item) => `
                      <tr class="${item.isBestUnitValue ? 'highlight-best' : ''}">
                        <td>
                          <strong>${item.store_name}</strong>
                          <div style="font-size: 0.75rem; color: var(--color-text-muted);">Delivery: ${item.delivery_charge > 0 ? window.formatPrice(item.delivery_charge) : 'Free'}</div>
                        </td>
                        <td class="price-tabular">
                          <strong style="color: var(--color-primary);">${window.formatPrice(item.current_price)}</strong>
                          ${item.mrp && item.mrp > item.current_price ? `<div style="text-decoration: line-through; font-size: 0.8rem; color: var(--color-text-muted);">${window.formatPrice(item.mrp)}</div>` : ''}
                        </td>
                        <td class="price-tabular">
                          <span class="badge ${item.isBestUnitValue ? 'badge-best-value' : 'badge-discount'}">${item.formattedUnitCost}</span>
                        </td>
                        <td>
                          <span class="badge" style="background:${item.is_in_stock ? 'var(--color-success-bg)' : 'var(--color-error-bg)'}; color:${item.is_in_stock ? 'var(--color-success)' : 'var(--color-error)'};">
                            ${item.is_in_stock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>
                        <td>
                          ${item.isBestUnitValue ? `<span class="badge badge-best-value">⭐ Lowest Unit Cost</span>` : (item.isLowestPrice ? `<span class="badge badge-discount">Cheapest Price</span>` : 'Standard Price')}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Discount Transparency Section (Section 10) -->
            <div id="discount-transparency-card" style="background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-md);">
              <h4 style="margin-bottom: var(--space-xs);">📊 Discount Transparency Analysis</h4>
              <p style="font-size: 0.85rem; margin-bottom: var(--space-md);">PriceProof evaluates advertised retailer discounts against recorded historical prices to detect misleading markdowns.</p>
              <div id="discount-content" class="skeleton" style="height: 60px;"></div>
            </div>
          </div>
        </div>
      `;

      // Variant pill click handlers
      document.querySelectorAll('.variant-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeVariantIndex = parseInt(btn.getAttribute('data-index'), 10);
          renderView();
        });
      });

      // Add to list click handler
      document.getElementById('add-to-list-btn')?.addEventListener('click', async () => {
        if (!window.AuthManager?.isAuthenticated()) {
          window.showToast('Please sign in to add to your shopping list', 'error');
          setTimeout(() => { window.location.href = '/login.html'; }, 1000);
          return;
        }

        try {
          // Get user lists
          const listsRes = await window.API.get('/shopping-lists');
          const lists = listsRes.data || [];
          let targetListId;

          if (lists.length === 0) {
            // Auto create default list
            const newListRes = await window.API.post('/shopping-lists', { name: 'Monthly Essentials' });
            targetListId = newListRes.data.id;
          } else {
            targetListId = lists[0].id;
          }

          await window.API.post(`/shopping-lists/${targetListId}/items`, {
            variant_id: activeVariant.id,
            quantity: 1,
          });

          window.showToast(`Added ${product.name} (${activeVariant.variant_name}) to your shopping list!`);
        } catch (err) {
          window.showToast(err.message || 'Failed to add item', 'error');
        }
      });

      // Price Alert Prompt
      document.getElementById('set-alert-btn')?.addEventListener('click', async () => {
        if (!window.AuthManager?.isAuthenticated()) {
          window.showToast('Please sign in to set price-drop alerts', 'error');
          setTimeout(() => { window.location.href = '/login.html'; }, 1000);
          return;
        }

        const currentLowest = listings.length > 0 ? Math.min(...listings.map((l) => Number(l.current_price))) : 100;
        const targetStr = prompt(`Set target price for ${product.name} (${activeVariant.variant_name}).\nCurrent lowest price is ₹${currentLowest}. Alert me when price drops to:`, (currentLowest * 0.9).toFixed(0));

        if (targetStr && !isNaN(Number(targetStr))) {
          try {
            await window.API.post('/alerts', {
              variant_id: activeVariant.id,
              target_price: Number(targetStr),
            });
            window.showToast(`Alert set! You will be notified when price drops to ₹${targetStr}`);
          } catch (err) {
            window.showToast(err.message || 'Failed to set alert', 'error');
          }
        }
      });

      // Load Discount Analysis
      loadDiscountAnalysis(activeVariant.id);
    }

    async function loadDiscountAnalysis(variantId) {
      const discountEl = document.getElementById('discount-content');
      if (!discountEl) return;

      try {
        const res = await window.API.get(`/comparison/variants/${variantId}/value-analysis`);
        const a = res.analysis;

        discountEl.classList.remove('skeleton');
        discountEl.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xs); flex-wrap: wrap; gap: 8px;">
            <span class="badge ${a.label === 'Lowest Observed Price' || a.label === 'Below Historical Average' ? 'badge-best-value' : (a.label === 'Above Historical Average' ? 'badge-warning' : 'badge-discount')}">
              ${a.label}
            </span>
            <span style="font-size: 0.85rem; color: var(--color-text-secondary);">
              Recorded Avg: <strong>${window.formatPrice(a.historicalAverage)}</strong> | All-Time Low: <strong>${window.formatPrice(a.lowestHistoricalPrice)}</strong>
            </span>
          </div>
          <p style="font-size: 0.9rem; color: var(--color-text-primary); margin-top: 6px;">${a.explanation}</p>
        `;
      } catch (err) {
        discountEl.innerHTML = `<p style="font-size:0.85rem;">Historical analysis currently updating for this variant.</p>`;
      }
    }

    renderView();
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error loading product details.</p></div>`;
  }
});
