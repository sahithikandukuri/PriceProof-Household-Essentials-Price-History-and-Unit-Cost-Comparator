// PriceProof: Price History and Analytics Engine with Chart.js
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const variantId = urlParams.get('variantId') || '55555555-5555-5555-5555-555555555001';

  let currentRange = '30d';
  let chartInstance = null;

  const ctx = document.getElementById('price-history-chart')?.getContext('2d');
  const statsContainer = document.getElementById('history-stats-container');
  const rangeButtons = document.querySelectorAll('.range-btn');

  async function fetchAndRenderChart() {
    try {
      const res = await window.API.get(`/comparison/variants/${variantId}/history`, { range: currentRange });
      const { statistics, chartData } = res;

      // 1. Render Summary Statistics Cards
      if (statsContainer && statistics) {
        statsContainer.innerHTML = `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-xl);">
            <div style="background:var(--color-surface); padding:var(--space-md); border-radius:var(--radius-md); border:1px solid var(--color-border); box-shadow:var(--shadow-sm);">
              <span style="font-size:0.75rem; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Lowest Recorded</span>
              <div class="price-tabular" style="font-size:1.4rem; font-weight:700; color:var(--color-primary); margin-top:4px;">${window.formatPrice(statistics.lowestRecorded)}</div>
            </div>

            <div style="background:var(--color-surface); padding:var(--space-md); border-radius:var(--radius-md); border:1px solid var(--color-border); box-shadow:var(--shadow-sm);">
              <span style="font-size:0.75rem; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Average Recorded</span>
              <div class="price-tabular" style="font-size:1.4rem; font-weight:700; color:var(--color-text-primary); margin-top:4px;">${window.formatPrice(statistics.averageRecorded)}</div>
            </div>

            <div style="background:var(--color-surface); padding:var(--space-md); border-radius:var(--radius-md); border:1px solid var(--color-border); box-shadow:var(--shadow-sm);">
              <span style="font-size:0.75rem; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Highest Recorded</span>
              <div class="price-tabular" style="font-size:1.4rem; font-weight:700; color:var(--color-text-secondary); margin-top:4px;">${window.formatPrice(statistics.highestRecorded)}</div>
            </div>

            <div style="background:var(--color-surface); padding:var(--space-md); border-radius:var(--radius-md); border:1px solid var(--color-border); box-shadow:var(--shadow-sm);">
              <span style="font-size:0.75rem; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Period Price Shift</span>
              <div style="font-size:1.4rem; font-weight:700; color:${statistics.percentChange < 0 ? 'var(--color-success)' : (statistics.percentChange > 0 ? 'var(--color-error)' : 'var(--color-text-muted)')}; margin-top:4px;">
                ${statistics.percentChange > 0 ? '+' : ''}${statistics.percentChange}%
              </div>
            </div>
          </div>
        `;
      }

      // 2. Render Chart.js
      if (ctx && window.Chart) {
        if (chartInstance) chartInstance.destroy();

        // Sort timestamps and format labels
        const datasets = (chartData.datasets || []).map((ds) => ({
          ...ds,
          data: ds.data.map((dp) => ({
            x: new Date(dp.x).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
            y: dp.y,
          })),
        }));

        chartInstance = new window.Chart(ctx, {
          type: 'line',
          data: {
            datasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false,
            },
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#EBF2EE' : '#172B24',
                  font: { family: 'Inter', size: 12 },
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return ` ${context.dataset.label}: ₹${context.parsed.y.toFixed(2)}`;
                  },
                },
              },
            },
            scales: {
              x: {
                grid: { color: 'rgba(200, 200, 200, 0.15)' },
                ticks: { color: '#748980', font: { family: 'Inter' } },
              },
              y: {
                grid: { color: 'rgba(200, 200, 200, 0.15)' },
                ticks: {
                  color: '#748980',
                  font: { family: 'Inter' },
                  callback: function (val) { return '₹' + val; },
                },
              },
            },
          },
        });
      }
    } catch (err) {
      console.error('Failed to load chart data', err);
    }
  }

  // Range button toggles
  rangeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      rangeButtons.forEach((b) => b.classList.remove('btn-primary'));
      rangeButtons.forEach((b) => b.classList.add('btn-outline'));
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-primary');
      currentRange = btn.getAttribute('data-range');
      fetchAndRenderChart();
    });
  });

  await fetchAndRenderChart();
});
