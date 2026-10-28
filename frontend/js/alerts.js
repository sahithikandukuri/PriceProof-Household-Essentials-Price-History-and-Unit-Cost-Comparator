// PriceProof: Price-Drop Alerts and Notifications Center
document.addEventListener('DOMContentLoaded', async () => {
  const alertsContainer = document.getElementById('alerts-container');
  const notifContainer = document.getElementById('notifications-container');

  if (!window.AuthManager?.isAuthenticated()) return;

  async function loadAlertsAndNotifications() {
    try {
      const [alertsRes, notifRes] = await Promise.all([
        window.API.get('/alerts'),
        window.API.get('/alerts/notifications'),
      ]);

      const alerts = alertsRes.data || [];
      const notifs = notifRes.data || [];

      // 1. Render Notifications
      if (notifContainer) {
        if (notifs.length === 0) {
          notifContainer.innerHTML = `<p style="font-size:0.9rem; color:var(--color-text-muted);">No new price-drop notifications.</p>`;
        } else {
          notifContainer.innerHTML = notifs.map((n) => `
            <div style="background:var(--color-surface); border:1px solid ${n.is_read ? 'var(--color-border)' : 'var(--color-primary)'}; border-radius:var(--radius-md); padding:var(--space-md); margin-bottom:var(--space-sm); display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <strong>${n.title}</strong>
                <p style="font-size:0.85rem; margin-top:2px;">${n.message}</p>
                <span style="font-size:0.75rem; color:var(--color-text-muted);">${new Date(n.created_at).toLocaleString('en-IN')}</span>
              </div>
              ${!n.is_read ? `
                <button class="btn btn-sm btn-outline mark-read-btn" data-id="${n.id}">Mark Read</button>
              ` : ''}
            </div>
          `).join('');

          document.querySelectorAll('.mark-read-btn').forEach((b) => {
            b.addEventListener('click', async () => {
              const id = b.getAttribute('data-id');
              await window.API.patch(`/alerts/notifications/${id}/read`);
              await loadAlertsAndNotifications();
            });
          });
        }
      }

      // 2. Render Active Alerts
      if (alertsContainer) {
        if (alerts.length === 0) {
          alertsContainer.innerHTML = `<p style="font-size:0.9rem; color:var(--color-text-muted);">You have no active price alerts configured.</p>`;
        } else {
          alertsContainer.innerHTML = alerts.map((a) => `
            <div style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:var(--space-md); margin-bottom:var(--space-sm); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--space-sm);">
              <div>
                <strong>${a.productName}</strong> <span style="font-size:0.85rem; color:var(--color-text-muted);">(${a.variantName})</span>
                <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:2px;">
                  Target Price: <strong class="price-tabular" style="color:var(--color-primary);">${window.formatPrice(a.targetPrice)}</strong> • Store: ${a.storeName}
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:var(--space-sm);">
                ${a.triggeredAt ? '<span class="badge badge-best-value">Triggered</span>' : '<span class="badge badge-discount">Active</span>'}
                <button class="btn-icon delete-alert-btn" data-id="${a.id}" title="Delete alert" style="color:var(--color-error);">🗑️</button>
              </div>
            </div>
          `).join('');

          document.querySelectorAll('.delete-alert-btn').forEach((b) => {
            b.addEventListener('click', async () => {
              const id = b.getAttribute('data-id');
              await window.API.delete(`/alerts/${id}`);
              window.showToast('Alert removed');
              await loadAlertsAndNotifications();
            });
          });
        }
      }
    } catch (err) {
      console.error('Failed to load alerts/notifications', err);
    }
  }

  await loadAlertsAndNotifications();
});
