/**
 * NM MART - SPA Router
 * Handles dynamic loading of sections into the #main-content container
 */

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    
    // Mapping of button IDs to their respective section files
    const routes = {
        'homeBtn': 'sections/home.html',
        
        // 1. Master
        'itemMasterBtn': 'sections/master-item.html',
        'brandMasterBtn': 'sections/master-brand.html',
        'itemMainCategoryBtn': 'sections/master-main-category.html',
        'itemSubCategoryBtn': 'sections/master-sub-category.html',
        'itemUnitMasterBtn': 'sections/master-unit.html',
        'accountMasterBtn': 'sections/master-account.html',
        'userMasterBtn': 'sections/master-user.html',
        'bannerMasterBtn': 'sections/master-banner.html',
        'deliveryBoyMasterBtn': 'sections/master-delivery-boy.html',

        // 2. Sales & POS
        'posCounterBtn': 'sections/sale-entry.html',
        'onlineOrdersBtn': 'sections/sale-entry.html',
        'b2bInvoicingBtn': 'sections/sale-entry.html',
        'salesReturnBtn': 'sections/sale-entry.html',

        // 3. Procurement
        'purchaseEntryBtn': 'sections/purchase.html',
        'purchaseOrderBtn': 'sections/purchase.html',
        'supplierMasterBtn': 'sections/master-account.html',
        'purchaseReturnBtn': 'sections/purchase.html',

        // 4. Analytics
        'orderTrackingBtn': 'sections/view-bill.html',
        'billHistoryBtn': 'sections/view-bill.html',
        'customerDirectoryBtn': 'sections/master-delivery-customer.html',
        'inventoryOverviewBtn': 'sections/master-item.html',
        'deliveryLogisticsBtn': 'sections/view-bill.html',

        // 5. Intelligence
        'salesAnalyticsBtn': 'sections/home.html',
        'stockValuationBtn': 'sections/home.html',
        'profitLossBtn': 'sections/home.html',
        'taxGstReportBtn': 'sections/home.html',
        'customerInsightsBtn': 'sections/home.html',

        // 6. Logistics
        'warehouseMgmtBtn': 'sections/master-item.html',
        'stockAdjustmentBtn': 'sections/master-item.html',
        'internalTransferBtn': 'sections/master-item.html',
        'wastageTrackingBtn': 'sections/master-item.html',

        // 7. Finance
        'cashBankBookBtn': 'sections/transaction.html',
        'expenseEntryBtn': 'sections/transaction.html',
        'partyLedgerBtn': 'sections/master-account.html',
        'paymentReminderBtn': 'sections/master-credit.html',

        // 8. Systems
        'appConfigBtn': 'sections/home.html',
        'storeDisplayBtn': 'sections/home.html',
        'userPermissionsBtn': 'sections/master-user.html',
        'databaseBackupBtn': 'sections/home.html'
    };

    /**
     * Loads a section from an HTML file and injects it into the main container
     * @param {string} url - The path to the HTML file
     */
    async function loadSection(url, btnId) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load ${url}`);
            
            const html = await response.text();
            mainContent.innerHTML = html;
            
            // Re-initialize event listeners for the newly loaded content
            initializeSectionEvents();
            
            // Update active state in dropdowns
            updateActiveState(btnId);
            
            // Close any open dropdowns after navigation
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
        } catch (error) {
            console.error('Routing Error:', error);
            mainContent.innerHTML = `<div class="p-10 text-red-500">Error loading section: ${error.message}</div>`;
        }
    }

    /**
     * Updates the visual active state of navigation buttons
     * @param {string} activeId - The ID of the clicked button
     */
    function updateActiveState(activeId) {
        // Remove active classes from all nav items and dropdown items
        document.querySelectorAll('.nav-item, .dropdown-item').forEach(item => {
            item.classList.remove('bg-blue-600', 'bg-gray-100', 'text-blue-600', 'font-semibold');
            const icon = item.querySelector('i');
            if (icon) icon.classList.remove('text-blue-600');
        });

        // Add active classes to the current button
        const activeBtn = document.getElementById(activeId);
        if (activeBtn) {
            if (activeBtn.classList.contains('dropdown-item')) {
                activeBtn.classList.add('bg-gray-100', 'text-blue-600', 'font-semibold');
                const icon = activeBtn.querySelector('i');
                if (icon) icon.classList.add('text-blue-600');
            } else if (activeBtn.classList.contains('nav-item')) {
                activeBtn.classList.add('bg-blue-600');
            }
        }
    }

    /**
     * Attaches event listeners to the navigation elements
     */
    function setupNavigation() {
        // Handle all navigation buttons defined in the routes mapping
        Object.keys(routes).forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    loadSection(routes[id], id);
                });
            }
        });

        // Global UI logic (Dropdowns, Fullscreen)
        setupGlobalUI();
    }

    /**
     * Setup for global UI elements like dropdown toggles and fullscreen
     */
    function setupGlobalUI() {
        const dropdownToggles = [
            { btn: 'masterBtn', menu: 'masterDropdown' },
            { btn: 'saleEntryBtn', menu: 'saleDropdown' },
            { btn: 'purchaseBtn', menu: 'purchaseDropdown' },
            { btn: 'viewBtn', menu: 'viewDropdown' },
            { btn: 'reportBtn', menu: 'reportDropdown' },
            { btn: 'storeBtn', menu: 'storeDropdown' },
            { btn: 'transactionBtn', menu: 'transactionDropdown' },
            { btn: 'toolsBtn', menu: 'toolsDropdown' }
        ];

        dropdownToggles.forEach(item => {
            const btn = document.getElementById(item.btn);
            const menu = document.getElementById(item.menu);
            if (btn && menu) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Close other dropdowns
                    dropdownToggles.forEach(other => {
                        if (other.menu !== item.menu) {
                            document.getElementById(other.menu).classList.remove('show');
                        }
                    });
                    menu.classList.toggle('show');
                });
            }
        });

        // Close dropdowns on outside click
        window.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
        });

        // Fullscreen Toggle
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            });
        }
    }

    /**
     * Section-specific event listeners (e.g., "Add New" button toggles)
     * This uses event delegation where possible or re-binds after content load
     */
    function initializeSectionEvents() {
        // Map of buttons to their corresponding forms/views
        const toggleBtnMap = {
            'addNewItemBtn': 'item-master-form',
            'addNewUnitBtn': 'unit-master-form',
            'addNewMainCatBtn': 'main-cat-master-form',
            'addNewSubCatBtn': 'sub-cat-master-form',
            'addNewBrandBtn': 'brand-master-form',
            'addNewDeptBtn': 'dept-master-form',
            'addNewAccountBtn': 'account-master-form',
            'addNewUserBtn': 'user-master-form',
            'addNewBannerBtn': 'banner-master-form',
            'addNewCreditBtn': 'credit-master-form',
            'addNewDeliveryBoyBtn': 'delivery-boy-master-form',
            'addNewDeliveryCustomerBtn': 'delivery-customer-master-form',
            'addNewPurchaseBtn': 'purchase-entry-view',
            'addNewTransactionBtn': 'transaction-entry-view'
        };

        Object.keys(toggleBtnMap).forEach(btnId => {
            const btn = document.getElementById(btnId);
            const formId = toggleBtnMap[btnId];
            const form = document.getElementById(formId);
            
            if (btn && form) {
                btn.addEventListener('click', () => {
                    form.classList.toggle('hidden');
                    
                    // Specific logic for Master modules that have List vs Form views
                    const modulePrefix = btnId.replace('addNew', '').replace('Btn', '');
                    const listViewId = modulePrefix.toLowerCase() + '-master-list';
                    const listView = document.getElementById(listViewId) || 
                                   document.getElementById(modulePrefix.toLowerCase() + '-list-view');
                    
                    if (listView) {
                        listView.classList.toggle('hidden');
                    }
                });
            }
        });

        // Handle Cancel buttons specifically
        const cancelBtnMap = {
            'cancelBrandBtn': { form: 'brand-master-form', list: 'brand-master-list' },
            'cancelDeptBtn': { form: 'dept-master-form', list: 'department-master-list' },
            'cancelAccountBtn': { form: 'account-master-form', list: 'account-master-list' },
            'cancelUserBtn': { form: 'user-master-form', list: 'user-master-list' },
            'cancelBannerBtn': { form: 'banner-master-form', list: 'banner-master-list' },
            'cancelCreditBtn': { form: 'credit-master-form', list: 'credit-master-list' },
            'cancelDeliveryBoyBtn': { form: 'delivery-boy-master-form', list: 'delivery-boy-master-list' },
            'cancelDeliveryCustomerBtn': { form: 'delivery-customer-master-form', list: 'delivery-customer-master-list' },
            'cancelPurchaseEntryBtn': { form: 'purchase-entry-view', list: 'purchase-list-view' },
            'cancelTransactionBtn': { form: 'transaction-entry-view', list: 'transaction-list-view' }
        };

        Object.keys(cancelBtnMap).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    const config = cancelBtnMap[btnId];
                    const form = document.getElementById(config.form);
                    const list = document.getElementById(config.list);
                    if (form) form.classList.add('hidden');
                    if (list) list.classList.remove('hidden');
                });
            }
        });

        // Handle generic cancel buttons (cancelBtn class)
        document.querySelectorAll('.cancelBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                const form = btn.closest('[id$="-form"]');
                if (form) form.classList.add('hidden');
            });
        });

        // Item Master specific: Import Button
        const importItemBtn = document.getElementById('importItemBtn');
        const importItemInput = document.getElementById('importItemInput');
        if (importItemBtn && importItemInput) {
            importItemBtn.addEventListener('click', () => importItemInput.click());
            importItemInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) alert(`Excel file "${file.name}" selected for import!`);
            });
        }

        // Item Master specific: Discount Calculation
        const mrpInput = document.getElementById('product-mrp');
        const sellingInput = document.getElementById('product-selling-price');
        const discountInput = document.getElementById('product-discount');

        if (mrpInput && sellingInput && discountInput) {
            const calculateDiscount = () => {
                const mrp = parseFloat(mrpInput.value) || 0;
                const selling = parseFloat(sellingInput.value) || 0;

                if (mrp > 0 && selling <= mrp) {
                    const discount = ((mrp - selling) / mrp) * 100;
                    discountInput.value = Math.round(discount) + '%';
                } else {
                    discountInput.value = '0%';
                }
            };
            mrpInput.addEventListener('input', calculateDiscount);
            sellingInput.addEventListener('input', calculateDiscount);
        }

        // Sale Entry specific: Sidebar buttons
        document.querySelectorAll('.pos-sidebar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pos-sidebar-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Sale Entry specific: Clear Cart
        const clearCartBtn = document.getElementById('clearCartBtn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear the cart?')) {
                    showNotification('Cart cleared!', 'info');
                }
            });
        }

        // Sale Entry specific: Payment
        const paymentBtn = document.getElementById('paymentBtn');
        if (paymentBtn) {
            paymentBtn.addEventListener('click', () => {
                showNotification('Redirecting to payment...', 'success');
            });
        }
    }

    // Initialize the app
    setupNavigation();
    setupGlobalActions(); // Setup global Save/Edit/Delete actions
    
    // Load default Home section
    loadSection(routes['homeBtn']);

    /**
     * Setup global actions using event delegation on #main-content
     */
    function setupGlobalActions() {
        mainContent.addEventListener('click', (e) => {
            const target = e.target;

            // 1. SAVE ACTION
            const saveBtn = target.closest('.save-btn') || 
                           (target.tagName === 'BUTTON' && (target.innerText.includes('Save') || target.innerText.includes('Update')));
            
            if (saveBtn) {
                e.preventDefault();
                const sectionName = document.querySelector('h2, h3, .text-xl span')?.innerText || 'Record';
                showNotification(`${sectionName} saved successfully!`, 'success');
                
                // Auto-close form if it exists
                const form = saveBtn.closest('[id$="-form"]') || saveBtn.closest('[id$="-view"]');
                if (form && !form.id.includes('sale-entry')) { // Don't close sale entry
                    form.classList.add('hidden');
                    const modulePrefix = form.id.split('-')[0];
                    const listView = document.getElementById(`${modulePrefix}-master-list`) || 
                                   document.getElementById(`${modulePrefix}-list-view`);
                    if (listView) listView.classList.remove('hidden');
                }
                return;
            }

            // 2. DELETE ACTION
            const deleteBtn = target.closest('.delete-btn') || target.closest('.fa-trash') || target.closest('.fa-trash-alt');
            if (deleteBtn) {
                e.preventDefault();
                if (confirm('Are you sure you want to delete this record?')) {
                    const row = deleteBtn.closest('tr');
                    if (row) {
                        row.classList.add('opacity-0', 'transition-all', 'duration-300');
                        setTimeout(() => row.remove(), 300);
                        showNotification('Record deleted successfully!', 'error');
                    }
                }
                return;
            }

            // 3. EDIT ACTION
            const editBtn = target.closest('.edit-btn') || target.closest('.fa-edit') || target.closest('.far.fa-edit');
            if (editBtn) {
                e.preventDefault();
                const modulePrefix = mainContent.querySelector('[id$="-content"]')?.id.split('-')[0];
                const formId = `${modulePrefix}-master-form` || `${modulePrefix}-form`;
                const form = document.getElementById(formId);
                const list = document.getElementById(`${modulePrefix}-master-list`) || 
                            document.getElementById(`${modulePrefix}-list-view`);
                
                if (form && list) {
                    list.classList.add('hidden');
                    form.classList.remove('hidden');
                    showNotification('Editing record...', 'info');
                }
                return;
            }

            // 4. PRINT ACTION
            const printBtn = target.closest('.print-btn') || target.closest('.fa-print');
            if (printBtn) {
                e.preventDefault();
                window.print();
                return;
            }
        });
    }

    /**
     * Simple notification system
     */
    function showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-20 right-5 px-6 py-3 rounded-lg shadow-2xl text-white font-bold transform transition-all duration-500 translate-y-20 z-[100] flex items-center gap-2`;
        
        const colors = {
            'success': 'bg-emerald-600',
            'error': 'bg-red-600',
            'info': 'bg-blue-600',
            'warning': 'bg-amber-500'
        };
        
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'info': 'fa-info-circle',
            'warning': 'fa-exclamation-triangle'
        };

        toast.classList.add(colors[type] || colors.info);
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.remove('translate-y-20'), 10);
        
        // Animate out
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
});
