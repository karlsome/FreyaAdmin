// ==================== MODAL STACK MANAGEMENT WITH ESC KEY SUPPORT ====================
// Add this to your main JavaScript file (app.js or create a separate modals.js)

/**
 * Global Modal Stack Management System
 * Handles multiple modals with ESC key support for layer-by-layer closing
 */
class ModalStackManager {
    constructor() {
        this.modalStack = [];
        this.isListenerAttached = false;
        this.setupEscapeListener();
    }

    /**
     * Register a modal in the stack
     */
    pushModal(modalId, closeFunction = null) {
        const modal = {
            id: modalId,
            element: document.getElementById(modalId),
            closeFunction: closeFunction
        };
        
        this.modalStack.push(modal);
        console.log(`📋 Modal stack: ${this.modalStack.map(m => m.id).join(' -> ')}`);
        
        // Set focus to the top modal for better accessibility
        if (modal.element) {
            modal.element.focus();
        }
    }

    /**
     * Remove a modal from the stack
     */
    popModal(modalId = null) {
        if (this.modalStack.length === 0) return null;
        
        let removedModal;
        
        if (modalId) {
            // Remove specific modal
            const index = this.modalStack.findIndex(m => m.id === modalId);
            if (index !== -1) {
                removedModal = this.modalStack.splice(index, 1)[0];
            }
        } else {
            // Remove top modal
            removedModal = this.modalStack.pop();
        }
        
        console.log(`📋 Modal stack after removal: ${this.modalStack.map(m => m.id).join(' -> ')}`);
        return removedModal;
    }

    /**
     * Get the top modal in the stack
     */
    getTopModal() {
        return this.modalStack.length > 0 ? this.modalStack[this.modalStack.length - 1] : null;
    }

    /**
     * Close the top modal using ESC key
     */
    closeTopModal() {
        const topModal = this.getTopModal();
        if (!topModal) return false;

        console.log(`🔑 ESC pressed - closing modal: ${topModal.id}`);

        // Use custom close function if provided
        if (topModal.closeFunction) {
            topModal.closeFunction();
        } else {
            // Default close behavior
            this.defaultCloseModal(topModal);
        }

        // Remove from stack
        this.popModal(topModal.id);
        return true;
    }

    /**
     * Default modal closing behavior
     */
    defaultCloseModal(modal) {
        if (modal.element) {
            modal.element.classList.add('hidden');
            modal.element.style.display = 'none';
        }
    }

    /**
     * Setup global ESC key listener
     */
    setupEscapeListener() {
        if (this.isListenerAttached) return;

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' || event.keyCode === 27) {
                event.preventDefault();
                event.stopPropagation();
                
                const closed = this.closeTopModal();
                if (closed) {
                    console.log(`🔑 ESC handled - ${this.modalStack.length} modals remaining`);
                }
            }
        });

        this.isListenerAttached = true;
        console.log('🔑 ESC key listener attached for modal management');
    }

    /**
     * Clear all modals (useful for reset)
     */
    clearStack() {
        this.modalStack = [];
        console.log('📋 Modal stack cleared');
    }

    /**
     * Check if any modals are open
     */
    hasOpenModals() {
        return this.modalStack.length > 0;
    }
}

// Create global instance
window.modalStackManager = new ModalStackManager();

/**
 * Enhanced modal functions with stack management
 */

// Work Order Detail Modal
window.showWorkOrderModal = function(workOrderId) {
    // Existing code to populate modal...
    const modal = document.getElementById('workOrderDetailModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // Register in modal stack
        modalStackManager.pushModal('workOrderDetailModal', () => {
            closeWorkOrderModal();
        });
    }
};

window.closeWorkOrderModal = function() {
    const modal = document.getElementById('workOrderDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    // Remove from stack
    modalStackManager.popModal('workOrderDetailModal');
};

// Work Order Edit Modal
window.editWorkOrder = function(workOrderId) {
    // Existing code to populate edit modal...
    const editModal = document.getElementById('editWorkOrderModal');
    if (editModal) {
        editModal.classList.remove('hidden');
        editModal.style.display = 'flex';
        
        // Register in modal stack
        modalStackManager.pushModal('editWorkOrderModal', () => {
            closeEditWorkOrderModal();
        });
    }
};

window.closeEditWorkOrderModal = function() {
    const modal = document.getElementById('editWorkOrderModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    // Remove from stack
    modalStackManager.popModal('editWorkOrderModal');
};

// Freya Tablet Detail Modal
window.showFreyaTabletModal = function(recordId) {
    // Existing code to populate modal...
    const modal = document.getElementById('freyaTabletDetailModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // Register in modal stack
        modalStackManager.pushModal('freyaTabletDetailModal', () => {
            closeFreyaTabletModal();
        });
    }
};

window.closeFreyaTabletModal = function() {
    const modal = document.getElementById('freyaTabletDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    // Remove from stack
    modalStackManager.popModal('freyaTabletDetailModal');
};

// Production Record Detail Modal
window.showProductionRecordModal = function(recordId) {
    // Existing code to populate modal...
    const modal = document.getElementById('productionRecordDetailModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // Register in modal stack
        modalStackManager.pushModal('productionRecordDetailModal', () => {
            closeProductionRecordModal();
        });
    }
};

window.closeProductionRecordModal = function() {
    const modal = document.getElementById('productionRecordDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    // Remove from stack
    modalStackManager.popModal('productionRecordDetailModal');
};

// Confirmation Modal (for overwrite, delete, etc.)
window.showConfirmationModal = function(message, onConfirm, onCancel) {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        // Set message
        const messageElement = modal.querySelector('.confirmation-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // Register in modal stack with custom close behavior
        modalStackManager.pushModal('confirmationModal', () => {
            if (onCancel) onCancel();
            closeConfirmationModal();
        });
        
        // Setup button handlers
        const confirmBtn = modal.querySelector('.confirm-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                if (onConfirm) onConfirm();
                closeConfirmationModal();
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                if (onCancel) onCancel();
                closeConfirmationModal();
            };
        }
    }
};

window.closeConfirmationModal = function() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    // Remove from stack
    modalStackManager.popModal('confirmationModal');
};

/**
 * Enhanced modal opening function with automatic stack management
 */
window.openModal = function(modalId, closeFunction = null) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // Register in modal stack
        modalStackManager.pushModal(modalId, closeFunction);
    }
};

/**
 * Enhanced modal closing function with automatic stack management
 */
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    // Remove from stack
    modalStackManager.popModal(modalId);
};

/**
 * Utility function to close all modals
 */
window.closeAllModals = function() {
    while (modalStackManager.hasOpenModals()) {
        modalStackManager.closeTopModal();
    }
};

console.log('🔑 Enhanced Modal Stack Management with ESC key support loaded');

/**
 * Example Usage:
 * 
 * // Open a modal
 * openModal('myModal', () => {
 *     // Custom close logic
 *     console.log('Modal closed');
 * });
 * 
 * // ESC key will automatically:
 * // 1. Close the top modal
 * // 2. Run the custom close function
 * // 3. Remove it from the stack
 * // 4. Keep lower modals open
 */
