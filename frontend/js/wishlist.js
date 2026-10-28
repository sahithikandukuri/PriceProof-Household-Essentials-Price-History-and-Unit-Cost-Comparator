// PriceProof: Wishlist Management Logic
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.AuthManager?.isAuthenticated()) {
    document.getElementById('wishlist-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔒</div>
        <h2>Sign In to View Your Wishlist</h2>
        <p>Save items you purchase frequently to track price fluctuations and get alerts.</p>
        <a href="/login.html" class="btn btn-primary" style="margin-top:var(--space-md);">Sign In</a>
      </div>
    `;
    return;
  }

  const container = document.getElementById('wishlist-container');

  async function loadWishlist() {
    try {
      const res = await window.API.get('/wishlist');
      const items = res.data || [];

      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">❤️</div>
            <h3>Your wishlist is empty</h3>
            <p>Save household products to easily monitor deals and price drops.</p>
            <a href="/products.html" class="btn btn-primary" style="margin-top:var(--space-md);">Explore Essentials</a>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="product-grid">
          ${items.map((item) => `
            <div class="product-card">
              <div class="product-card-img-wrapper">
                <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'}" alt="${item.productName}" class="product-card-img" />
                <button class="btn-icon remove-wishlist-btn" data-variant-id="${item.variantId}" style="position:absolute; top:8px; right:8px;" title="Remove from Wishlist">✕</button>
              </div>
              <span class="product-brand">${item.categoryName || 'Household'}</span>
              <h3 class="product-title">
                <a href="/product-details.html?id=${item.productId}">${item.productName}</a>
              </h3>
              <span style="font-size:0.85rem; color:var(--color-text-muted);">${item.variantName}</span>

              <div class="product-pricing-box">
                <div class="price-main">
                  <span class="price-lowest price-tabular">${item.lowestPrice ? window.formatPrice(item.lowestPrice) : 'N/A'}</span>
                </div>
                <span class="price-stores-count">Available in ${item.storeCount} store${item.storeCount > 1 ? 's' : ''}</span>
              </div>

              <div class="product-actions">
                <a href="/compare.html?id=${item.productId}" class="btn btn-primary btn-sm" style="flex:1;">Compare</a>
                <button class="btn btn-outline btn-sm set-alert-btn" data-variant-id="${item.variantId}" data-product-name="${item.productName}" data-current-price="${item.lowestPrice || 100}">🔔 Alert</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Remove handler
      document.querySelectorAll('.remove-wishlist-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const variantId = btn.getAttribute('data-variant-id');
          try {
            await window.API.delete(`/wishlist/${variantId}`);
            window.showToast('Item removed from wishlist');
            await loadWishlist();
          } catch (err) {
            window.showToast(err.message || 'Failed to remove', 'error');
          }
        });
      });

      // Set Alert handler
      document.querySelectorAll('.set-alert-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const variantId = btn.getAttribute('data-variant-id');
          const name = btn.getAttribute('data-product-name');
          const currentPrice = Number(btn.getAttribute('data-current-price'));

          const target = prompt(`Set price alert for ${name}.\nCurrent lowest price is ₹${currentPrice}. Notify me when price reaches:`, (currentPrice * 0.9).toFixed(0));
          if (target && !isNaN(Number(target))) {
            try {
              await window.API.post('/alerts', {
                variant_id: variantId,
                target_price: Number(target),
              });
              window.showToast(`Alert set for ₹${target}!`);
            } catch (err) {
              window.showToast(err.message || 'Failed to set alert', 'error');
            }
          }
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>Error loading wishlist.</p></div>`;
    }
  }

  await loadWishlist();
});
