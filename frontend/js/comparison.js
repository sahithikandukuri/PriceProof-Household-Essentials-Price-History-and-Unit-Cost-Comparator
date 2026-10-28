// PriceProof: Full Product Store Comparison Engine
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  const container = document.getElementById('comparison-container');
  if (!productId) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚖️</div>
        <h2>Select a Product to Compare</h2>
        <p>Browse our catalog to compare prices and unit costs across 8 retailers.</p>
        <a href="/products.html" class="btn btn-primary" style="margin-top: var(--space-md);">Browse Products</a>
      </div>
    `;
    return;
  }

  try {
    const res = await window.API.get(`/comparison/${productId}/compare`);
    const { product, matrix } = res;

    container.innerHTML = `
      <div style="margin-bottom: var(--space-xl); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-md);">
        <div>
          <span class="product-brand">${product.brand?.name || 'Essential'} • ${product.category?.name || 'Pantry'}</span>
          <h1 style="font-size: 2rem; margin-top: 4px;">${product.name}</h1>
          <p>Real-time cross-retailer unit-cost analysis</p>
        </div>
        <div>
          <a href="/product-details.html?id=${product.id}" class="btn btn-outline">Back to Product Details</a>
        </div>
      </div>

      <!-- Comparison Matrices for all package variants -->
      ${matrix.map((variant) => `
        <div style="background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-lg); margin-bottom: var(--space-xl); box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md); flex-wrap: wrap; gap: 8px;">
            <div>
              <h3>Variant: ${variant.variant_name} (${variant.quantity} ${variant.unit})</h3>
              <span style="font-size: 0.85rem; color: var(--color-text-muted);">Standardized Base Quantity: ${variant.quantity} ${variant.unit}</span>
            </div>
            <div>
              <a href="/price-history.html?variantId=${variant.variant_id}" class="btn btn-outline btn-sm">📈 Price Trend Line</a>
            </div>
          </div>

          <div class="table-responsive">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>Retailer</th>
                  <th>Selling Price</th>
                  <th>Standard Unit Cost</th>
                  <th>Estimated Delivery</th>
                  <th>Inventory</th>
                  <th>Value Verdict</th>
                </tr>
              </thead>
              <tbody>
                ${variant.listings.map((item) => `
                  <tr class="${item.isBestUnitValue ? 'highlight-best' : ''}">
                    <td>
                      <strong>${item.store_name}</strong>
                    </td>
                    <td class="price-tabular">
                      <strong style="color: var(--color-primary); font-size: 1.1rem;">${window.formatPrice(item.current_price)}</strong>
                      ${item.mrp && item.mrp > item.current_price ? `<div style="text-decoration: line-through; font-size: 0.75rem; color: var(--color-text-muted);">MRP ${window.formatPrice(item.mrp)}</div>` : ''}
                    </td>
                    <td class="price-tabular">
                      <span class="badge ${item.isBestUnitValue ? 'badge-best-value' : 'badge-discount'}" style="font-size: 0.85rem;">
                        ${item.formattedUnitCost}
                      </span>
                    </td>
                    <td>
                      ${item.delivery_charge > 0 ? window.formatPrice(item.delivery_charge) : '<span style="color:var(--color-success); font-weight:600;">FREE</span>'}
                      ${item.min_free_delivery > 0 ? `<div style="font-size: 0.7rem; color: var(--color-text-muted);">Free on orders > ${window.formatPrice(item.min_free_delivery)}</div>` : ''}
                    </td>
                    <td>
                      <span class="badge" style="background:${item.is_in_stock ? 'var(--color-success-bg)' : 'var(--color-error-bg)'}; color:${item.is_in_stock ? 'var(--color-success)' : 'var(--color-error)'};">
                        ${item.is_in_stock ? 'Available' : 'Out of Stock'}
                      </span>
                    </td>
                    <td>
                      ${item.isBestUnitValue ? '<span class="badge badge-best-value">⭐ BEST UNIT VALUE</span>' : (item.isLowestPrice ? '<span class="badge badge-discount">Lowest Selling Price</span>' : 'Standard')}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('')}
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error retrieving comparison data.</p></div>`;
  }
});
