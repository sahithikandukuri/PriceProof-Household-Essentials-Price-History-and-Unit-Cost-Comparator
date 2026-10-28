// PriceProof: Theme Manager (Light & Dark)
(function () {
  const THEME_KEY = 'priceproof_theme';

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeToggleButtons(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function updateThemeToggleButtons(theme) {
    const buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach((btn) => {
      btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      btn.setAttribute('title', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    });
  }

  // Initialize immediately on script load
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  window.ThemeManager = {
    getTheme: () => document.documentElement.getAttribute('data-theme') || 'light',
    setTheme: applyTheme,
    toggleTheme,
  };

  document.addEventListener('DOMContentLoaded', () => {
    updateThemeToggleButtons(initialTheme);
  });
})();
