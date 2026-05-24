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
        'onlineOrdersBtn': 'sections/orders.html',
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
     * Generic Master Form Submission Handler
     */
    async function bindMasterFormSubmit(formId, tableName) {
        const form = document.getElementById(formId);
        if (!form) return;

        const saveBtn = form.querySelector('.save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Collect all input data from the form
                const formData = {};
                const inputs = form.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    if (input.id || input.name) {
                        const key = input.id || input.name;
                        // Map UI IDs to DB column names if necessary
                        const dbKey = key.replace('prod-', '').replace('product-', '');
                        formData[dbKey] = input.type === 'number' ? parseFloat(input.value) : input.value;
                    }
                });

                try {
                    showNotification(`Saving to ${tableName}...`, 'info');
                    const { data, error } = await window.supabaseClient
                        .from(tableName)
                        .insert([formData])
                        .select();

                    if (error) throw error;

                    alert(`SUCCESS: Data saved to ${tableName}!`);
                    showNotification('Record created successfully!', 'success');
                    
                    // Reset form and toggle views
                    inputs.forEach(input => input.value = '');
                    form.classList.add('hidden');
                    const modulePrefix = formId.split('-')[0];
                    const listView = document.getElementById(`${modulePrefix}-master-list`);
                    if (listView) listView.classList.remove('hidden');
                    
                } catch (error) {
                    console.error(`Error saving to ${tableName}:`, error);
                    alert(`ERROR: ${error.message}`);
                    showNotification('Save failed!', 'error');
                }
            });
        }
    }

    /**
     * Section-specific event listeners (e.g., "Add New" button toggles)
     * This uses event delegation where possible or re-binds after content load
     */
    async function initializeSectionEvents() {
        // --- 1. Supabase Master Sync ---
        if (document.getElementById('prod-category')) {
            syncMasterDropdowns();
            bindMasterFormSubmit('item-master-form', 'items');
        }

        // --- 2. Real-time Orders Listener ---
        if (document.getElementById('live-orders-table-body')) {
            setupOrdersRealtimeListener();
        }

        // --- 3. Other Master Forms Binding ---
        const masterForms = [
            { id: 'brand-master-form', table: 'brands' },
            { id: 'main-cat-master-form', table: 'categories' },
            { id: 'delivery-boy-master-form', table: 'delivery_boys' }
        ];
        masterForms.forEach(m => {
            if (document.getElementById(m.id)) bindMasterFormSubmit(m.id, m.table);
        });

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
     * POS STATE MANAGEMENT
     */
    let currentCart = [];

    /**
     * POS Functions
     */
    function addToCart(productName, price, taxPercent) {
        const existingItem = currentCart.find(item => item.name === productName);
        
        if (existingItem) {
            existingItem.qty += 1;
        } else {
            currentCart.push({
                name: productName,
                price: parseFloat(price),
                tax: parseFloat(taxPercent),
                qty: 1
            });
        }
        
        renderCart();
        calculateBillTotal();
        showNotification(`${productName} added to cart`, 'info');
    }

    function renderCart() {
        const cartContainer = document.getElementById('pos-cart-items');
        if (!cartContainer) return;

        cartContainer.innerHTML = currentCart.map((item, index) => `
            <div class="flex items-center p-2 text-[11px] border-b border-gray-100 bg-white group hover:bg-emerald-50 transition-colors">
                <div class="w-1/2 font-medium text-gray-700">${item.name}</div>
                <div class="w-1/4 flex items-center justify-center gap-2">
                    <button onclick="window.updateQty(${index}, -1)" class="w-5 h-5 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200">-</button>
                    <span class="font-bold w-4 text-center">${item.qty}</span>
                    <button onclick="window.updateQty(${index}, 1)" class="w-5 h-5 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200">+</button>
                </div>
                <div class="w-1/4 text-right font-bold text-gray-800">₹${(item.price * item.qty).toFixed(2)}</div>
                <button onclick="window.removeFromCart(${index})" class="ml-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-times-circle"></i>
                </button>
            </div>
        `).join('');
    }

    // Global qty update for onclick handlers
    window.updateQty = (index, delta) => {
        if (currentCart[index]) {
            currentCart[index].qty += delta;
            if (currentCart[index].qty <= 0) {
                currentCart.splice(index, 1);
            }
            renderCart();
            calculateBillTotal();
        }
    };

    window.removeFromCart = (index) => {
        currentCart.splice(index, 1);
        renderCart();
        calculateBillTotal();
    };

    function calculateBillTotal() {
        const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const taxTotal = currentCart.reduce((sum, item) => sum + ((item.price * item.tax / 100) * item.qty), 0);
        
        const discount = 0; // Future dynamic discount
        const delivery = 0; // Future dynamic delivery
        
        const rawTotal = subtotal + taxTotal - discount + delivery;
        const finalTotal = Math.round(rawTotal);
        const roundOff = finalTotal - rawTotal;

        // Update UI
        const elements = {
            'billSubtotal': `₹${subtotal.toFixed(2)}`,
            'billTax': `₹${taxTotal.toFixed(2)}`,
            'billRoundOff': roundOff.toFixed(2),
            'finalBillAmount': `₹${finalTotal.toFixed(0)}.00`
        };

        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = elements[id];
        });
    }

    /**
     * POS Save/Print Order
     */
    async function handlePOSCheckout(isPrint) {
        if (currentCart.length === 0) {
            showNotification('Cart is empty!', 'error');
            return;
        }

        const subtotalStr = document.getElementById('billSubtotal').innerText.replace('₹', '');
        const taxStr = document.getElementById('billTax').innerText.replace('₹', '');
        const finalStr = document.getElementById('finalBillAmount').innerText.replace('₹', '');
        
        const invoiceData = {
            customer_name: document.getElementById('displayCustName').innerText,
            customer_mobile: document.getElementById('displayCustMob').innerText,
            subtotal: parseFloat(subtotalStr),
            total_tax: parseFloat(taxStr),
            round_off: parseFloat(document.getElementById('billRoundOff').innerText),
            final_amount: parseFloat(finalStr),
            billing_type: 'POS',
            transaction_status: 'completed'
        };

        try {
            showNotification('Saving order to cloud...', 'info');
            const result = await window.db.saveInvoice(invoiceData, currentCart);
            
            console.log('Order Saved Successfully:', result);
            alert(`SUCCESS: Order #${result.bill_no} saved to Supabase!`);
            
            if (isPrint) window.print();

            // Clear Cart after success
            currentCart = [];
            renderCart();
            calculateBillTotal();
            showNotification('POS Cart Reset Successfully', 'success');
        } catch (error) {
            console.error('POS Checkout Error:', error);
            alert('CRITICAL ERROR: Failed to save invoice to cloud. Please check connection.');
            showNotification('Database Sync Failed!', 'error');
        }
    }

    /**
     * Sync Category/Brand dropdowns from Supabase
     */
    async function syncMasterDropdowns() {
        try {
            const [categories, brands] = await Promise.all([
                window.supabaseClient.from('categories').select('id, name'),
                window.supabaseClient.from('brands').select('id, name')
            ]);

            const catDropdown = document.getElementById('prod-category');
            const brandDropdown = document.getElementById('prod-brand');

            if (catDropdown && categories.data) {
                catDropdown.innerHTML = '<option value="">Select Category</option>' + 
                    categories.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }

            if (brandDropdown && brands.data) {
                brandDropdown.innerHTML = '<option value="">Select Brand</option>' + 
                    brands.data.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
            }
        } catch (error) {
            console.error('Master Sync Error:', error);
        }
    }

    /**
     * Real-time listener for new orders
     */
    let ordersSubscription = null;
    function setupOrdersRealtimeListener() {
        if (ordersSubscription) return; // Already listening

        ordersSubscription = window.supabaseClient
            .channel('public:sales_invoices')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'sales_invoices',
                filter: 'transaction_status=eq.pending' // Only Pending orders
            }, payload => {
                handleNewLiveOrder(payload.new);
            })
            .subscribe();
    }

    function handleNewLiveOrder(order) {
        const tableBody = document.getElementById('live-orders-table-body');
        const noMsg = document.getElementById('no-orders-msg');
        const sound = document.getElementById('orderAlertSound');

        if (tableBody) {
            if (noMsg) noMsg.remove();
            
            if (sound) sound.play().catch(e => console.log('Sound blocked by browser'));

            const time = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-50 hover:bg-emerald-50 transition-colors animate-bounce';
            row.innerHTML = `
                <td class="py-4 px-6 text-gray-400 font-medium">${time}</td>
                <td class="py-4 px-6 font-bold text-slate-800">#${order.bill_no}</td>
                <td class="py-4 px-6">
                    <p class="font-bold text-slate-700">${order.customer_name}</p>
                    <p class="text-[10px] text-gray-400">${order.customer_mobile || 'No Mobile'}</p>
                </td>
                <td class="py-4 px-6">
                    <span class="px-2 py-1 rounded text-[10px] font-bold ${order.billing_type === 'Online' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}">${order.billing_type}</span>
                </td>
                <td class="py-4 px-6 text-right font-black text-slate-900">₹${order.final_amount.toFixed(2)}</td>
                <td class="py-4 px-6 text-center">
                    <span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold">COMPLETED</span>
                </td>
                <td class="py-4 px-6 text-right">
                    <button class="text-blue-500 hover:text-blue-700"><i class="fas fa-eye"></i></button>
                </td>
            `;
            tableBody.prepend(row);
            
            // Update stats
            const countEl = document.getElementById('todayOrderCount');
            if (countEl) countEl.innerText = parseInt(countEl.innerText) + 1;
        }
    }

    /**
     * Setup global actions using event delegation on #main-content
     */
    function setupGlobalActions() {
        mainContent.addEventListener('click', (e) => {
            const target = e.target;

            // POS Product Click
            const posCard = target.closest('.pos-card');
            if (posCard && posCard.parentElement.id === 'pos-product-grid') {
                const name = posCard.dataset.name;
                const price = posCard.dataset.price;
                const tax = posCard.dataset.tax;
                addToCart(name, price, tax);
                return;
            }

            // POS Clear Cart
            if (target.id === 'clearCartBtn' || target.closest('#clearCartBtn')) {
                if (currentCart.length > 0 && confirm('Clear entire cart?')) {
                    currentCart = [];
                    renderCart();
                    calculateBillTotal();
                    showNotification('Cart cleared', 'warning');
                }
                return;
            }

            // POS Save/Print Order
            const isSave = target.id === 'saveOrderBtn' || target.closest('#saveOrderBtn');
            const isPrint = target.id === 'printOrderBtn' || target.closest('#printOrderBtn');
            
            if (isSave || isPrint) {
                handlePOSCheckout(isPrint);
                return;
            }

            // 1. SAVE ACTION (Other sections)
            const saveBtn = target.closest('.save-btn') || 
                           (target.tagName === 'BUTTON' && (target.innerText.includes('Save') || target.innerText.includes('Update')));
            
            if (saveBtn && !saveBtn.id.includes('saveOrderBtn')) {
                e.preventDefault();
                const sectionName = document.querySelector('h2, h3, .text-xl span')?.innerText || 'Record';
                showNotification(`${sectionName} saved successfully!`, 'success');
                
                // Auto-close form if it exists
                const form = saveBtn.closest('[id$="-form"]') || saveBtn.closest('[id$="-view"]');
                if (form && !form.id.includes('sale-entry')) { 
                    form.classList.add('hidden');
                    const modulePrefix = form.id.split('-')[0];
                    const listView = document.getElementById(`${modulePrefix}-master-list`) || 
                                   document.getElementById(`${modulePrefix}-list-view`);
                    if (listView) listView.classList.remove('hidden');
                }
                return;
            }
            
            // ... (keep existing delete, edit, print logic)
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

            // 4. PRINT ACTION (Other sections)
            const printBtn = target.closest('.print-btn') || target.closest('.fa-print');
            if (printBtn && !printBtn.id.includes('printOrderBtn')) {
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
