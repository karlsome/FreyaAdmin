/**
 * Dark Mode Helper - Automatically adds dark mode classes to dynamically loaded content
 * This script observes DOM changes and enhances elements with dark mode support
 */

class DarkModeHelper {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    // Apply dark mode classes to existing content
    this.enhanceExistingContent();

    // Set up mutation observer to handle dynamically loaded content
    this.setupObserver();
  }

  enhanceExistingContent() {
    this.enhanceElements(document.body);
  }

  enhanceElements(container) {
    if (!container) return;

    // Background colors
    this.addDarkClasses(container, '.bg-white', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-gray-50', 'dark:bg-gray-900');
    this.addDarkClasses(container, '.bg-gray-100', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-gray-200', 'dark:bg-gray-700');
    this.addDarkClasses(container, '.bg-blue-100', 'dark:bg-blue-900');
    this.addDarkClasses(container, '.bg-green-100', 'dark:bg-green-900');
    this.addDarkClasses(container, '.bg-yellow-100', 'dark:bg-yellow-900');
    this.addDarkClasses(container, '.bg-red-100', 'dark:bg-red-900');

    // Text colors
    this.addDarkClasses(container, '.text-gray-900', 'dark:text-white');
    this.addDarkClasses(container, '.text-gray-800', 'dark:text-gray-100');
    this.addDarkClasses(container, '.text-gray-700', 'dark:text-gray-300');
    this.addDarkClasses(container, '.text-gray-600', 'dark:text-gray-400');
    this.addDarkClasses(container, '.text-gray-500', 'dark:text-gray-500');
    this.addDarkClasses(container, '.text-blue-600', 'dark:text-blue-400');
    this.addDarkClasses(container, '.text-green-600', 'dark:text-green-400');
    this.addDarkClasses(container, '.text-red-600', 'dark:text-red-400');
    this.addDarkClasses(container, '.text-yellow-600', 'dark:text-yellow-400');

    // Borders
    this.addDarkClasses(container, '.border-gray-200', 'dark:border-gray-700');
    this.addDarkClasses(container, '.border-gray-300', 'dark:border-gray-600');

    // Buttons and interactive elements
    this.addDarkClasses(container, '.hover\\:bg-gray-100', 'dark:hover:bg-gray-700');
    this.addDarkClasses(container, '.hover\\:bg-blue-700', 'dark:hover:bg-blue-600');
    this.addDarkClasses(container, '.hover\\:bg-green-700', 'dark:hover:bg-green-600');
    this.addDarkClasses(container, '.hover\\:bg-red-700', 'dark:hover:bg-red-600');

    // Cards and panels - check for bg-white class
    const cards = container.querySelectorAll('.bg-white, [class*="bg-white "]');
    cards.forEach(card => {
      if (!card.classList.contains('dark:bg-gray-800') &&
          !card.classList.contains('dark:bg-gray-900')) {
        card.classList.add('dark:bg-gray-800');
      }
    });

    // Tables
    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
      if (!table.classList.contains('dark:bg-gray-800')) {
        table.classList.add('dark:bg-gray-800', 'dark:text-white');
      }

      // Table headers
      const headers = table.querySelectorAll('th');
      headers.forEach(th => {
        if (!th.classList.contains('dark:bg-gray-700')) {
          th.classList.add('dark:bg-gray-700', 'dark:text-gray-200');
        }
      });

      // Table rows
      const rows = table.querySelectorAll('tr');
      rows.forEach(tr => {
        if (!tr.classList.contains('dark:hover:bg-gray-700')) {
          tr.classList.add('dark:hover:bg-gray-700');
        }
      });

      // Table cells
      const cells = table.querySelectorAll('td');
      cells.forEach(td => {
        if (!td.classList.contains('dark:text-gray-300')) {
          td.classList.add('dark:text-gray-300', 'dark:border-gray-700');
        }
      });
    });

    // Input fields
    const inputs = container.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), textarea, select');
    inputs.forEach(input => {
      if (!input.classList.contains('dark:bg-gray-700')) {
        input.classList.add('dark:bg-gray-700', 'dark:text-white', 'dark:border-gray-600', 'dark:placeholder-gray-400');
      }
    });

    // Modals and overlays
    const modals = container.querySelectorAll('[class*="modal"], [class*="overlay"]');
    modals.forEach(modal => {
      if (modal.classList.contains('bg-white')) {
        modal.classList.add('dark:bg-gray-800');
      }
      if (modal.classList.contains('bg-black')) {
        modal.classList.add('dark:bg-opacity-80');
      }
    });
  }

  addDarkClasses(container, selector, darkClasses) {
    try {
      // Escape special characters in selector for CSS
      const elements = container.querySelectorAll(selector);
      const darkClassArray = darkClasses.split(' ');

      elements.forEach(element => {
        darkClassArray.forEach(darkClass => {
          if (!element.classList.contains(darkClass)) {
            element.classList.add(darkClass);
          }
        });
      });
    } catch (e) {
      // Silently fail for invalid selectors
    }
  }

  setupObserver() {
    // Create an observer to watch for DOM changes
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            this.enhanceElements(node);
          }
        });
      });
    });

    // Observe the main content area and body
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
      this.observer.observe(mainContent, {
        childList: true,
        subtree: true
      });
    }

    // Also observe the body for modals and other dynamic content
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Initialize dark mode helper when DOM is ready
let darkModeHelper;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    darkModeHelper = new DarkModeHelper();
  });
} else {
  darkModeHelper = new DarkModeHelper();
}
