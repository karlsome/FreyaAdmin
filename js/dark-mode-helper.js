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
    this.fixInlineStyles(document.body);
  }

  enhanceElements(container) {
    if (!container) return;

    // Background colors - using muted colors for night mode
    this.addDarkClasses(container, '.bg-white', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-gray-50', 'dark:bg-gray-900');
    this.addDarkClasses(container, '.bg-gray-100', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-gray-200', 'dark:bg-gray-700');
    // Muted color backgrounds for better night viewing
    this.addDarkClasses(container, '.bg-blue-50', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-blue-100', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-green-50', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-green-100', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-yellow-50', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-yellow-100', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-red-50', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-red-100', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-orange-50', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-orange-100', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-purple-50', 'dark:bg-gray-800');
    this.addDarkClasses(container, '.bg-purple-100', 'dark:bg-gray-800');

    // Text colors - muted for better readability at night
    this.addDarkClasses(container, '.text-gray-900', 'dark:text-gray-100');
    this.addDarkClasses(container, '.text-gray-800', 'dark:text-gray-200');
    this.addDarkClasses(container, '.text-gray-700', 'dark:text-gray-400');
    this.addDarkClasses(container, '.text-gray-600', 'dark:text-gray-500');
    this.addDarkClasses(container, '.text-gray-500', 'dark:text-gray-500');
    // Status color texts - muted versions
    this.addDarkClasses(container, '.text-blue-600', 'dark:text-blue-400');
    this.addDarkClasses(container, '.text-blue-700', 'dark:text-blue-400');
    this.addDarkClasses(container, '.text-blue-800', 'dark:text-blue-400');
    this.addDarkClasses(container, '.text-blue-900', 'dark:text-blue-400');
    this.addDarkClasses(container, '.text-green-600', 'dark:text-green-400');
    this.addDarkClasses(container, '.text-green-700', 'dark:text-green-400');
    this.addDarkClasses(container, '.text-green-800', 'dark:text-green-400');
    this.addDarkClasses(container, '.text-green-900', 'dark:text-green-400');
    this.addDarkClasses(container, '.text-red-600', 'dark:text-red-400');
    this.addDarkClasses(container, '.text-red-700', 'dark:text-red-400');
    this.addDarkClasses(container, '.text-red-800', 'dark:text-red-400');
    this.addDarkClasses(container, '.text-red-900', 'dark:text-red-400');
    this.addDarkClasses(container, '.text-yellow-600', 'dark:text-yellow-400');
    this.addDarkClasses(container, '.text-yellow-700', 'dark:text-yellow-400');
    this.addDarkClasses(container, '.text-yellow-800', 'dark:text-yellow-400');
    this.addDarkClasses(container, '.text-yellow-900', 'dark:text-yellow-400');
    this.addDarkClasses(container, '.text-orange-600', 'dark:text-orange-400');
    this.addDarkClasses(container, '.text-orange-700', 'dark:text-orange-400');
    this.addDarkClasses(container, '.text-orange-800', 'dark:text-orange-400');

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
        card.classList.add('dark:bg-gray-800', 'dark:text-gray-200');
      }
    });

    // Fix gray background cards
    const grayCards = container.querySelectorAll('.bg-gray-50, .bg-gray-100');
    grayCards.forEach(card => {
      if (!card.classList.contains('dark:bg-gray-900')) {
        card.classList.add('dark:bg-gray-900', 'dark:text-gray-200');
      }
    });

    // Tables - improved readability
    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
      if (!table.classList.contains('dark:bg-gray-800')) {
        table.classList.add('dark:bg-gray-800');
      }

      // Table headers - subtle gray background
      const headers = table.querySelectorAll('th');
      headers.forEach(th => {
        if (!th.classList.contains('dark:bg-gray-700')) {
          th.classList.add('dark:bg-gray-700', 'dark:text-gray-200', 'dark:border-gray-600');
        }
      });

      // Table body background
      const tbody = table.querySelectorAll('tbody');
      tbody.forEach(tb => {
        if (!tb.classList.contains('dark:bg-gray-800')) {
          tb.classList.add('dark:bg-gray-800');
        }
      });

      // Table rows - subtle hover effect
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(tr => {
        if (!tr.classList.contains('dark:hover:bg-gray-700')) {
          tr.classList.add('dark:hover:bg-gray-700', 'dark:border-gray-700');
        }
      });

      // Table cells - readable text
      const cells = table.querySelectorAll('td');
      cells.forEach(td => {
        if (!td.classList.contains('dark:text-gray-300')) {
          td.classList.add('dark:text-gray-300', 'dark:border-gray-700');
        }
      });
    });

    // Input fields - better contrast
    const inputs = container.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), textarea, select');
    inputs.forEach(input => {
      if (!input.classList.contains('dark:bg-gray-700')) {
        input.classList.add('dark:bg-gray-700', 'dark:text-gray-100', 'dark:border-gray-600', 'dark:placeholder-gray-500');
      }
    });

    // Buttons - subtle styling
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      // Skip if button already has specific dark styling or is a primary button
      if (button.classList.contains('bg-blue-500') || 
          button.classList.contains('bg-blue-600') ||
          button.classList.contains('bg-green-500') ||
          button.classList.contains('bg-green-600') ||
          button.classList.contains('bg-red-500') ||
          button.classList.contains('bg-red-600')) {
        return;
      }
      if (!button.classList.contains('dark:bg-gray-700') && !button.classList.contains('dark:hover:bg-gray-700')) {
        button.classList.add('dark:border-gray-600', 'dark:text-gray-200', 'dark:hover:bg-gray-700');
      }
    });

    // Modals and overlays
    const modals = container.querySelectorAll('[class*="modal"], [class*="overlay"]');
    modals.forEach(modal => {
      if (modal.classList.contains('bg-white')) {
        modal.classList.add('dark:bg-gray-800', 'dark:text-gray-200');
      }
      if (modal.classList.contains('bg-black')) {
        modal.classList.add('dark:bg-opacity-90');
      }
    });

    // Status badges - ensure they have proper muted colors
    const statusBadges = container.querySelectorAll('[class*="badge"], [class*="status"], span[class*="bg-"], span[class*="text-"]');
    statusBadges.forEach(badge => {
      // Green status indicators
      if (badge.classList.contains('bg-green-100') || badge.classList.contains('bg-green-50')) {
        badge.classList.add('dark:bg-gray-800', 'dark:text-green-400');
      }
      if (badge.classList.contains('text-green-800') || badge.classList.contains('text-green-900') || badge.classList.contains('text-green-700')) {
        badge.classList.add('dark:text-green-400');
      }
      
      // Blue status indicators
      if (badge.classList.contains('bg-blue-100') || badge.classList.contains('bg-blue-50')) {
        badge.classList.add('dark:bg-gray-800', 'dark:text-blue-400');
      }
      if (badge.classList.contains('text-blue-800') || badge.classList.contains('text-blue-900') || badge.classList.contains('text-blue-700')) {
        badge.classList.add('dark:text-blue-400');
      }
      
      // Yellow status indicators
      if (badge.classList.contains('bg-yellow-100') || badge.classList.contains('bg-yellow-50')) {
        badge.classList.add('dark:bg-gray-800', 'dark:text-yellow-400');
      }
      if (badge.classList.contains('text-yellow-800') || badge.classList.contains('text-yellow-900') || badge.classList.contains('text-yellow-700')) {
        badge.classList.add('dark:text-yellow-400');
      }
      
      // Red status indicators
      if (badge.classList.contains('bg-red-100') || badge.classList.contains('bg-red-50')) {
        badge.classList.add('dark:bg-gray-800', 'dark:text-red-400');
      }
      if (badge.classList.contains('text-red-800') || badge.classList.contains('text-red-900') || badge.classList.contains('text-red-700')) {
        badge.classList.add('dark:text-red-400');
      }
    });

    // Headings and titles
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      if (!heading.classList.contains('dark:text-gray-100')) {
        heading.classList.add('dark:text-gray-100');
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
            this.fixInlineStyles(node);
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

  fixInlineStyles(container) {
    // Fix elements with inline styles that break dark mode
    if (!container) return;
    
    const isDark = document.documentElement.classList.contains('dark');
    if (!isDark) return;

    // Find all elements with inline background colors
    const elementsWithBg = container.querySelectorAll('[style*="background"]');
    elementsWithBg.forEach(el => {
      const style = el.getAttribute('style');
      if (!style) return;
      
      // Check for white backgrounds
      if (style.includes('background-color: white') || 
          style.includes('background-color:#fff') ||
          style.includes('background-color: #fff') ||
          style.includes('background-color: #ffffff') ||
          style.includes('background: white')) {
        
        // Add a data attribute to track that we've modified it
        if (!el.hasAttribute('data-dark-fixed')) {
          el.style.backgroundColor = '#1f2937';
          el.setAttribute('data-dark-fixed', 'true');
        }
      }
      
      // Check for light gray backgrounds
      if (style.includes('background-color: #f9fafb') ||
          style.includes('background-color: #f3f4f6') ||
          style.includes('background-color: #e5e7eb')) {
        if (!el.hasAttribute('data-dark-fixed')) {
          el.style.backgroundColor = '#374151';
          el.setAttribute('data-dark-fixed', 'true');
        }
      }
    });

    // Find all elements with inline text colors
    const elementsWithColor = container.querySelectorAll('[style*="color"]');
    elementsWithColor.forEach(el => {
      const style = el.getAttribute('style');
      if (!style) return;
      
      // Check for black text
      if (style.includes('color: black') || 
          style.includes('color:#000') ||
          style.includes('color: #000') ||
          style.includes('color: #000000')) {
        
        if (!el.hasAttribute('data-dark-color-fixed')) {
          el.style.color = '#e5e7eb';
          el.setAttribute('data-dark-color-fixed', 'true');
        }
      }
      
      // Check for dark gray text that might be hard to read
      if (style.includes('color: #111') ||
          style.includes('color: #222') ||
          style.includes('color: #333')) {
        if (!el.hasAttribute('data-dark-color-fixed')) {
          el.style.color = '#d1d5db';
          el.setAttribute('data-dark-color-fixed', 'true');
        }
      }
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
