
/**
 * Load unique factory options for the current approval tab
 */
async function loadFactoryOptions(collection = 'kensaDB') {
    try {
        console.log(`📋 Loading factory options for ${collection}...`);
        
        const factoryFilter = document.getElementById('factoryFilter');
        if (!factoryFilter) {
            console.warn('❌ Factory filter element not found');
            return;
        }

        // Show loading state
        factoryFilter.innerHTML = '<option value="">Loading factories...</option>';
        factoryFilter.disabled = true;

        // Fetch unique factories from the API - use BASE_URL for server communication
        const apiUrl = `${BASE_URL}api/factories/${collection}`;
        console.log(`🌐 Fetching from: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch factory data');
        }

        console.log(`✅ Loaded ${data.count} unique factories for ${collection}:`, data.factories);

        // Clear existing options and add default
        factoryFilter.innerHTML = '<option value="" data-i18n="allFactories">All Factories</option>';
        
        // Add factory options
        data.factories.forEach(factory => {
            const option = document.createElement('option');
            option.value = factory;
            option.textContent = factory;
            factoryFilter.appendChild(option);
        });

        // Re-enable dropdown
        factoryFilter.disabled = false;

        // Apply language if available
        if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
        } else if (typeof applyLanguage === 'function') {
            applyLanguage();
        }

    } catch (error) {
        console.error(`❌ Error loading factory options for ${collection}:`, error);
        
        const factoryFilter = document.getElementById('factoryFilter');
        if (factoryFilter) {
            factoryFilter.innerHTML = `
                <option value="" data-i18n="allFactories">All Factories</option>
                <option value="" disabled>Error loading factories</option>
            `;
            factoryFilter.disabled = false;
        }
    }
}

/**
 * Load factory options for multiple collections in batch
 */
async function loadFactoryOptionsBatch(collections = ['kensaDB', 'pressDB', 'SRSDB', 'slitDB']) {
    try {
        console.log('📋 Loading factory options for multiple collections...');
        
        // Use BASE_URL for server communication
        const apiUrl = `${BASE_URL}api/factories/batch`;
        console.log(`🌐 Fetching batch from: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ collections })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Failed to fetch batch factory data');
        }

        console.log('✅ Loaded factory data for all collections:', data.results);
        
        // Store factory data for each collection
        window.factoryData = data.results;
        
        return data.results;

    } catch (error) {
        console.error('❌ Error loading batch factory options:', error);
        return null;
    }
}

/**
 * Update factory dropdown when switching approval tabs
 */
function updateFactoryDropdownForTab(collection) {
    console.log(`🔄 Updating factory dropdown for ${collection}`);
    
    // If we have cached batch data, use it
    if (window.factoryData && window.factoryData[collection]) {
        const factoryFilter = document.getElementById('factoryFilter');
        if (!factoryFilter) return;

        const factories = window.factoryData[collection].factories || [];
        
        // Clear and rebuild options
        factoryFilter.innerHTML = '<option value="" data-i18n="allFactories">All Factories</option>';
        
        factories.forEach(factory => {
            const option = document.createElement('option');
            option.value = factory;
            option.textContent = factory;
            factoryFilter.appendChild(option);
        });

        console.log(`✅ Updated factory dropdown with ${factories.length} options for ${collection}`);
    } else {
        // Fall back to individual loading
        loadFactoryOptions(collection);
    }
}

// Make functions available globally
window.loadFactoryOptions = loadFactoryOptions;
window.loadFactoryOptionsBatch = loadFactoryOptionsBatch;
window.updateFactoryDropdownForTab = updateFactoryDropdownForTab;

console.log('✅ Factory dropdown functions loaded for approvals');