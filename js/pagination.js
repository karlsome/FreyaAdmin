/**
 * Generic Pagination Utility for FreyaAdmin
 * Provides reusable pagination functionality for various data types
 */

class PaginationManager {
    constructor(options = {}) {
        this.apiBaseUrl = options.apiBaseUrl || (window.BASE_URL || '') + 'api/paginate';
        this.defaultPageSize = options.defaultPageSize || 15;
        this.maxPageSize = options.maxPageSize || 100;
        this.currentPage = 1;
        this.totalPages = 0;
        this.totalRecords = 0;
        this.isLoading = false;
        this.lastQuery = null;
        
        // Callbacks
        this.onDataLoad = options.onDataLoad || (() => {});
        this.onError = options.onError || ((error) => console.error('Pagination error:', error));
        this.onLoadingStart = options.onLoadingStart || (() => {});
        this.onLoadingEnd = options.onLoadingEnd || (() => {});
    }

    /**
     * Load paginated data
     */
    async loadData(queryOptions) {
        if (this.isLoading) return;

        const {
            dbName,
            collectionName,
            query = {},
            sort = {},
            page = 1,
            limit = this.defaultPageSize,
            aggregation = null,
            projection = null,
            useSpecializedApi = null // For special APIs like sensor-history or approval-paginate
        } = queryOptions;

        this.isLoading = true;
        this.onLoadingStart();

        try {
            let apiUrl = this.apiBaseUrl;
            let requestBody = {
                dbName,
                collectionName,
                query,
                sort,
                page: parseInt(page),
                limit: Math.min(parseInt(limit), this.maxPageSize),
                aggregation,
                projection
            };

            // Use specialized APIs if specified
            if (useSpecializedApi) {
                apiUrl = `${window.BASE_URL || ''}api/${useSpecializedApi}`;
                // Customize request body based on specialized API
                if (useSpecializedApi === 'sensor-history') {
                    requestBody = {
                        deviceId: queryOptions.deviceId,
                        page: parseInt(page),
                        limit: Math.min(parseInt(limit), this.maxPageSize),
                        startDate: queryOptions.startDate || null,
                        endDate: queryOptions.endDate || null,
                        factoryName: queryOptions.factoryName || null
                    };
                } else if (useSpecializedApi === 'approval-paginate') {
                    requestBody = {
                        collectionName,
                        page: parseInt(page),
                        limit: Math.min(parseInt(limit), this.maxPageSize),
                        filters: query,
                        userRole: queryOptions.userRole || 'member',
                        factoryAccess: queryOptions.factoryAccess || []
                    };
                }
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to load data');
            }

            // Update pagination state
            this.currentPage = result.pagination.currentPage;
            this.totalPages = result.pagination.totalPages;
            this.totalRecords = result.pagination.totalRecords;
            this.lastQuery = queryOptions;

            // Call data callback
            this.onDataLoad({
                data: result.data,
                pagination: result.pagination,
                query: result.query || queryOptions.query
            });

            return result;

        } catch (error) {
            this.onError(error);
            throw error;
        } finally {
            this.isLoading = false;
            this.onLoadingEnd();
        }
    }

    /**
     * Go to specific page
     */
    async goToPage(page) {
        if (!this.lastQuery) {
            console.warn('No previous query found. Use loadData() first.');
            return;
        }

        return await this.loadData({
            ...this.lastQuery,
            page: page
        });
    }

    /**
     * Go to next page
     */
    async nextPage() {
        if (this.currentPage < this.totalPages) {
            return await this.goToPage(this.currentPage + 1);
        }
    }

    /**
     * Go to previous page
     */
    async previousPage() {
        if (this.currentPage > 1) {
            return await this.goToPage(this.currentPage - 1);
        }
    }

    /**
     * Go to first page
     */
    async firstPage() {
        if (this.currentPage > 1) {
            return await this.goToPage(1);
        }
    }

    /**
     * Go to last page
     */
    async lastPage() {
        if (this.currentPage < this.totalPages) {
            return await this.goToPage(this.totalPages);
        }
    }

    /**
     * Generate pagination HTML
     */
    generatePaginationHTML(options = {}) {
        const {
            showPageNumbers = true,
            showFirstLast = true,
            showInfo = true,
            containerClass = '',
            buttonClass = 'px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 hover:border-gray-300',
            activeButtonClass = 'px-3 py-2 text-sm border rounded-lg bg-blue-500 text-white border-blue-500',
            disabledButtonClass = 'px-3 py-2 text-sm border rounded-lg opacity-50 cursor-not-allowed',
            infoClass = 'text-sm text-gray-600'
        } = options;

        if (this.totalPages <= 1) {
            if (showInfo && this.totalRecords > 0) {
                return `
                    <div class="mt-4 pt-4 border-t border-gray-200 text-center">
                        <div class="${infoClass}">
                            <span class="font-medium">${this.totalRecords}</span> 件のデータを表示中
                        </div>
                    </div>
                `;
            }
            return '';
        }

        const pagination = {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            totalRecords: this.totalRecords,
            startIndex: (this.currentPage - 1) * this.defaultPageSize + 1,
            endIndex: Math.min(this.currentPage * this.defaultPageSize, this.totalRecords),
            hasNext: this.currentPage < this.totalPages,
            hasPrevious: this.currentPage > 1
        };

        let html = `<div class="mt-6 pt-4 border-t border-gray-200 ${containerClass}">`;

        if (showInfo) {
            html += `
                <div class="flex items-center justify-between mb-3">
                    <div class="${infoClass}">
                        <span class="font-medium">${pagination.totalRecords}</span> 件中 
                        <span class="font-medium">${pagination.startIndex}-${pagination.endIndex}</span> 件を表示
                    </div>
                    <div class="${infoClass}">
                        ページ <span class="font-medium">${pagination.currentPage}</span> / <span class="font-medium">${pagination.totalPages}</span>
                    </div>
                </div>
            `;
        }

        html += `<div class="flex items-center justify-center space-x-2">`;

        // First page button
        if (showFirstLast) {
            html += `
                <button 
                    onclick="paginationManager.firstPage()"
                    ${pagination.currentPage === 1 ? 'disabled' : ''}
                    class="${pagination.currentPage === 1 ? disabledButtonClass : buttonClass}"
                    title="最初のページ"
                >
                    <i class="ri-skip-back-line"></i>
                </button>
            `;
        }

        // Previous button
        html += `
            <button 
                onclick="paginationManager.previousPage()"
                ${!pagination.hasPrevious ? 'disabled' : ''}
                class="${pagination.hasPrevious ? buttonClass : disabledButtonClass}"
            >
                前へ
            </button>
        `;

        // Page numbers
        if (showPageNumbers) {
            html += this.generatePageNumbers(pagination.currentPage, pagination.totalPages, buttonClass, activeButtonClass);
        }

        // Next button
        html += `
            <button 
                onclick="paginationManager.nextPage()"
                ${!pagination.hasNext ? 'disabled' : ''}
                class="${pagination.hasNext ? buttonClass : disabledButtonClass}"
            >
                次へ
            </button>
        `;

        // Last page button
        if (showFirstLast) {
            html += `
                <button 
                    onclick="paginationManager.lastPage()"
                    ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}
                    class="${pagination.currentPage === pagination.totalPages ? disabledButtonClass : buttonClass}"
                    title="最後のページ"
                >
                    <i class="ri-skip-forward-line"></i>
                </button>
            `;
        }

        html += `</div></div>`;
        
        return html;
    }

    /**
     * Generate page number buttons
     */
    generatePageNumbers(currentPage, totalPages, buttonClass, activeButtonClass) {
        if (totalPages <= 7) {
            // Show all pages if 7 or fewer
            return Array.from({ length: totalPages }, (_, i) => i + 1)
                .map(page => `
                    <button 
                        onclick="paginationManager.goToPage(${page})"
                        class="${page === currentPage ? activeButtonClass : buttonClass}"
                    >
                        ${page}
                    </button>
                `).join('');
        } else {
            // Show abbreviated pagination
            let pages = [];
            
            if (currentPage <= 4) {
                // Show first 5 pages + ... + last page
                pages = [1, 2, 3, 4, 5, '...', totalPages];
            } else if (currentPage >= totalPages - 3) {
                // Show first page + ... + last 5 pages
                pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
            } else {
                // Show first + ... + current-1, current, current+1 + ... + last
                pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
            }
            
            return pages.map(page => {
                if (page === '...') {
                    return '<span class="px-3 py-2 text-sm text-gray-400">...</span>';
                }
                return `
                    <button 
                        onclick="paginationManager.goToPage(${page})"
                        class="${page === currentPage ? activeButtonClass : buttonClass}"
                    >
                        ${page}
                    </button>
                `;
            }).join('');
        }
    }

    /**
     * Get current pagination state
     */
    getState() {
        return {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            totalRecords: this.totalRecords,
            isLoading: this.isLoading,
            hasNext: this.currentPage < this.totalPages,
            hasPrevious: this.currentPage > 1
        };
    }

    /**
     * Reset pagination state
     */
    reset() {
        this.currentPage = 1;
        this.totalPages = 0;
        this.totalRecords = 0;
        this.lastQuery = null;
        this.isLoading = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaginationManager;
} else {
    // Make available globally in browser
    window.PaginationManager = PaginationManager;
}

/**
 * Example usage:
 * 
 * // Initialize pagination manager
 * const paginationManager = new PaginationManager({
 *     defaultPageSize: 15,
 *     onDataLoad: (result) => {
 *         console.log('Data loaded:', result.data);
 *         updateUI(result.data);
 *         document.getElementById('paginationContainer').innerHTML = paginationManager.generatePaginationHTML();
 *     },
 *     onError: (error) => {
 *         console.error('Error:', error);
 *     },
 *     onLoadingStart: () => {
 *         showLoadingSpinner();
 *     },
 *     onLoadingEnd: () => {
 *         hideLoadingSpinner();
 *     }
 * });
 * 
 * // Load sensor data
 * paginationManager.loadData({
 *     useSpecializedApi: 'sensor-history',
 *     deviceId: '84:1F:E8:1A:D1:44',
 *     factoryName: '第二工場',
 *     page: 1,
 *     limit: 15
 * });
 * 
 * // Load approval data
 * paginationManager.loadData({
 *     useSpecializedApi: 'approval-paginate',
 *     collectionName: 'kensaDB',
 *     query: { Date: '2025-08-18' },
 *     userRole: 'admin',
 *     page: 1,
 *     limit: 15
 * });
 * 
 * // Load general MongoDB data
 * paginationManager.loadData({
 *     dbName: 'submittedDB',
 *     collectionName: 'masterDB',
 *     query: { 工場: '第二工場' },
 *     sort: { _id: -1 },
 *     page: 1,
 *     limit: 20
 * });
 */
