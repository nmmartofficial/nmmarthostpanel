/**
 * NM MART - SPA Router
 * Handles dynamic loading of sections into the #main-content container
 */

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    
    // Mapping of button IDs to their respective section files
    const routes = {
        'homeBtn': 'sections/home.html',
        'saleEntryBtn': 'sections/sale-entry.html',
        'purchaseBtn': 'sections/purchase.html',
        'transactionBtn': 'sections/transaction.html',
        'billViewBtn': 'sections/view-bill.html',
        'itemMasterBtn': 'sections/master-item.html',
        'itemUnitMasterBtn': 'sections/master-unit.html',
        'itemGroupMasterBtn': 'sections/master-group.html',
        'itemMainCategoryBtn': 'sections/master-main-category.html',
        'itemSubCategoryBtn': 'sections/master-sub-category.html',
        'brandMasterBtn': 'sections/master-brand.html',
        'departmentMasterBtn': 'sections/master-department.html',
        'accountMasterBtn': 'sections/master-account.html',
        'userMasterBtn': 'sections/master-user.html',
        'bannerMasterBtn': 'sections/master-banner.html',
        'creditMasterBtn': 'sections/master-credit.html',
        'deliveryBoyMasterBtn': 'sections/master-delivery-boy.html',
        'deliveryCustomerMasterBtn': 'sections/master-delivery-customer.html'
    };

    /**
     * Loads a section from an HTML file and injects it into the main container
     * @param {string} url - The path to the HTML file
     */
    async function loadSection(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load ${url}`);
            
            const html = await response.text();
            mainContent.innerHTML = html;
            
            // Re-initialize event listeners for the newly loaded content
            initializeSectionEvents();
            
            // Close any open dropdowns after navigation
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
        } catch (error) {
            console.error('Routing Error:', error);
            mainContent.innerHTML = `<div class="p-10 text-red-500">Error loading section: ${error.message}</div>`;
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
                    loadSection(routes[id]);
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
            { btn: 'viewBtn', menu: 'viewDropdown' },
            { btn: 'reportBtn', menu: 'reportDropdown' },
            { btn: 'storeBtn', menu: 'storeDropdown' },
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

        // Sale Entry specific: Sidebar buttons
        document.querySelectorAll('.pos-sidebar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pos-sidebar-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    // Initialize the app
    setupNavigation();
    
    // Load default Home section
    loadSection(routes['homeBtn']);
});
