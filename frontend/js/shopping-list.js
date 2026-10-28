// PriceProof: Shopping List and Savings Calculator
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.AuthManager?.isAuthenticated()) {
    document.getElementById('list-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔒</div>
        <h2>Sign In to Access Shopping Lists</h2>
        <p>Save persistent grocery lists, calculate basket totals across retailers, and uncover potential savings.</p>
        <a href="/login.html" class="btn btn-primary" style="margin-top:var(--space-md);">Sign In</a>
      </div>
    `;
    return;
  }

  const listSelector = document.getElementById('list-select');
  const itemsContainer = document.getElementById('list-items-container');
  const estimateContainer = document.getElementById('estimate-summary-container');
  const createListBtn = document.getElementById('create-list-btn');

  let activeListId = null;

  async function loadLists() {
    try {
      const res = await window.API.get('/shopping-lists');
      const lists = res.data || [];

      if (lists.length === 0) {
        // Auto create first default list
        const created = await window.API.post('/shopping-lists', { name: 'My Monthly Groceries' });
        activeListId = created.data.id;
        lists.push(created.data);
      } else {
        if (!activeListId) activeListId = lists[0].id;
      }

      if (listSelector) {
        listSelector.innerHTML = lists.map((l) => `
          <option value="${l.id}" ${l.id === activeListId ? 'selected' : ''}>${l.name} (${l.itemCount || 0} items)</option>
        `).join('');
      }

      await loadActiveList();
    } catch (err) {
      console.error('Failed to load shopping lists', err);
    }
  }

  async function loadActiveList() {
    if (!activeListId) return;

    try {
      const [listRes, estimateRes] = await Promise.all([
        window.API.get(`/shopping-lists/${activeListId}`),
        window.API.get(`/shopping-lists/${activeListId}/estimate`),
      ]);

      const items = listRes.data?.items || [];
      const estimate = estimateRes.estimate || {};

      // 1. Render List Items
      if (items.length === 0) {
        itemsContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🛒</div>
            <h3>Your list is empty</h3>
            <p>Explore household products and add them to compare your total basket cost.</p>
            <a href="/products.html" class="btn btn-primary" style="margin-top:var(--space-md);">Browse Essentials</a>
          </div>
        `;
      } else {
        itemsContainer.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:var(--space-sm);">
            ${items.map((it) => `
              <div style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:var(--space-md); display:flex; align-items:center; justify-content:space-between; gap:var(--space-md); flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:var(--space-md);">
                  <input type="checkbox" class="item-checkbox" data-item-id="${it.id}" ${it.is_checked ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--color-primary);" />
                  <div>
                    <h4 style="font-size:1.05rem; ${it.is_checked ? 'text-decoration:line-through; opacity:0.6;' : ''}">${it.product_name}</h4>
                    <span style="font-size:0.85rem; color:var(--color-text-muted);">${it.variant_name}</span>
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:var(--space-md);">
                  <div style="display:flex; align-items:center; border:1px solid var(--color-border); border-radius:var(--radius-md); overflow:hidden;">
                    <button class="btn btn-sm btn-outline qty-btn" data-item-id="${it.id}" data-action="decrease" style="border:none; padding:4px 10px;">-</button>
                    <span style="padding:0 12px; font-weight:600; font-size:0.9rem;" class="price-tabular">${it.quantity}</span>
                    <button class="btn btn-sm btn-outline qty-btn" data-item-id="${it.id}" data-action="increase" style="border:none; padding:4px 10px;">+</button>
                  </div>

                  <button class="btn-icon delete-item-btn" data-item-id="${it.id}" title="Remove item" style="color:var(--color-error);">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        `;

        // Checkbox toggle handlers
        document.querySelectorAll('.item-checkbox').forEach((cb) => {
          cb.addEventListener('change', async () => {
            const itemId = cb.getAttribute('data-item-id');
            await window.API.patch(`/shopping-lists/${activeListId}/items/${itemId}`, {
              is_checked: cb.checked,
            });
            await loadActiveList();
          });
        });

        // Quantity handlers
        document.querySelectorAll('.qty-btn').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const itemId = btn.getAttribute('data-item-id');
            const action = btn.getAttribute('data-action');
            const currentItem = items.find((i) => i.id === itemId);
            if (!currentItem) return;

            const newQty = action === 'increase' ? currentItem.quantity + 1 : Math.max(1, currentItem.quantity - 1);
            await window.API.patch(`/shopping-lists/${activeListId}/items/${itemId}`, {
              quantity: newQty,
            });
            await loadActiveList();
          });
        });

        // Delete handlers
        document.querySelectorAll('.delete-item-btn').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const itemId = btn.getAttribute('data-item-id');
            await window.API.delete(`/shopping-lists/${activeListId}/items/${itemId}`);
            window.showToast('Item removed from shopping list');
            await loadActiveList();
          });
        });
      }

      // 2. Render Savings Summary & Dual Estimate Modes
      if (estimateContainer && items.length > 0) {
        const bestStore = estimate.bestSingleStore;
        const combo = estimate.optimizedCombination;

        estimateContainer.innerHTML = `
          <!-- Potential Savings Banner -->
          ${estimate.potentialSavings > 0 ? `
            <div style="background:var(--color-success-bg); border:1px solid var(--color-success); border-radius:var(--radius-lg); padding:var(--space-md); margin-bottom:var(--space-lg); display:flex; align-items:center; gap:var(--space-md);">
              <span style="font-size:2rem;">💡</span>
              <div>
                <strong style="color:var(--color-success); font-size:1.1rem;">Save up to ${estimate.formattedSavings} on this basket!</strong>
                <p style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:2px;">
                  By choosing the best-price combination across stores rather than the highest single store.
                </p>
              </div>
            </div>
          ` : ''}

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:var(--space-lg);">
            <!-- Mode A: Single-Store Shopping Comparison -->
            <div style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-lg); box-shadow:var(--shadow-sm);">
              <h3 style="font-size:1.2rem; margin-bottom:var(--space-xs);">Option 1: Single-Store Delivery</h3>
              <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:var(--space-md);">All items bundled into a single checkout delivery</p>

              <div style="display:flex; flex-direction:column; gap:var(--space-sm);">
                ${(estimate.singleStoreTotals || []).map((s, idx) => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-radius:var(--radius-md); border:1px solid ${idx === 0 ? 'var(--color-primary)' : 'var(--color-border)'}; background:${idx === 0 ? 'var(--color-secondary)' : 'var(--color-surface)'};">
                    <div>
                      <strong>${s.storeName}</strong>
                      ${idx === 0 ? `<span class="badge badge-best-value" style="margin-left:6px;">Cheapest Basket</span>` : ''}
                      <div style="font-size:0.75rem; color:var(--color-text-muted);">
                        Items: ${s.matchedCount}/${estimate.itemCount} ${s.deliveryFee > 0 ? `• Delivery: ${window.formatPrice(s.deliveryFee)}` : '• Free Delivery'}
                      </div>
                    </div>
                    <div style="text-align:right;">
                      <strong class="price-tabular" style="font-size:1.1rem; color:var(--color-primary);">${s.formattedGrandTotal}</strong>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Mode B: Multi-Store Optimized Combination -->
            <div style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-lg); box-shadow:var(--shadow-sm);">
              <h3 style="font-size:1.2rem; margin-bottom:var(--space-xs);">Option 2: Lowest-Price Combination</h3>
              <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:var(--space-md);">Picking the best available deal on each item individually</p>

              <div style="margin-bottom:var(--space-md); padding:var(--space-sm) var(--space-md); background:var(--color-surface-hover); border-radius:var(--radius-md); display:flex; justify-content:space-between; align-items:baseline;">
                <span>Total Combined Cost:</span>
                <strong class="price-tabular" style="font-size:1.3rem; color:var(--color-primary);">${combo?.formattedSubtotal || '₹0.00'}</strong>
              </div>

              <div style="display:flex; flex-direction:column; gap:6px;">
                ${(combo?.items || []).map((it) => `
                  <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:6px 0; border-bottom:1px dashed var(--color-border);">
                    <span>${it.product_name} (${it.quantity}x)</span>
                    <span><strong>${it.storeName}</strong>: <span class="price-tabular">${it.formattedTotal}</span></span>
                  </div>
                `).join('')}
              </div>

              <p style="font-size:0.75rem; color:var(--color-text-muted); margin-top:var(--space-md); font-style:italic;">
                ${estimate.notice}
              </p>
            </div>
          </div>
        `;
      } else if (estimateContainer) {
        estimateContainer.innerHTML = '';
      }
    } catch (err) {
      console.error('Failed to load active list data', err);
    }
  }

  // Create new list dialog
  if (createListBtn) {
    createListBtn.addEventListener('click', async () => {
      const name = prompt('Enter a name for your new shopping list:', 'Weekend Essentials');
      if (name && name.trim()) {
        try {
          const res = await window.API.post('/shopping-lists', { name: name.trim() });
          activeListId = res.data.id;
          window.showToast('Shopping list created!');
          await loadLists();
        } catch (err) {
          window.showToast(err.message || 'Failed to create list', 'error');
        }
      }
    });
  }

  if (listSelector) {
    listSelector.addEventListener('change', async (e) => {
      activeListId = e.target.value;
      await loadActiveList();
    });
  }

  await loadLists();
});
