/**
 * Theme Manager - Handles dark/light mode switching
 * Supports system preference detection and localStorage persistence
 */

class ThemeManager {
  constructor() {
    this.storageKey = 'freyaAdminTheme';
    this.init();
  }

  init() {
    // Load saved theme or use system preference
    const savedTheme = localStorage.getItem(this.storageKey);

    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem(this.storageKey)) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  setTheme(theme) {
    const html = document.documentElement;

    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    localStorage.setItem(this.storageKey, theme);
    this.updateToggleButton();
    
    // Trigger dark mode helper to re-enhance content if available
    if (typeof darkModeHelper !== 'undefined' && darkModeHelper) {
      setTimeout(() => {
        darkModeHelper.enhanceExistingContent();
      }, 50);
    }
  }

  toggle() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  getCurrentTheme() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }

  updateToggleButton() {
    const toggleBtn = document.getElementById('themeToggle');
    if (!toggleBtn) return;

    const isDark = this.getCurrentTheme() === 'dark';
    const icon = toggleBtn.querySelector('i');

    if (icon) {
      icon.className = isDark ? 'ri-sun-line' : 'ri-moon-line';
    }

    toggleBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    toggleBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }
}

// Initialize theme manager
let themeManager;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    themeManager = new ThemeManager();
  });
} else {
  themeManager = new ThemeManager();
}

// Global function for toggle button
function toggleTheme() {
  if (themeManager) {
    themeManager.toggle();
  }
}
