# NM MART ULTRA ERP - Button Audit Report

| Screen Name               | Button Text/Label                          | Action Function                                                                   | Category          |
|---------------------------|--------------------------------------------|-----------------------------------------------------------------------------------|-------------------|
| MasterView (All Masters)  | Create New                                 | `setShowForm(true)`                                                               | Primary           |
| MasterView (All Masters)  | Save (Create/Edit)                         | `handleSubmit` (calls `onSave` → `handleSave`)                                     | Primary           |
| MasterView (All Masters)  | Cancel                                     | `setShowForm(false)`                                                              | Navigation/Reset  |
| MasterView (All Masters)  | Edit                                       | `handleEdit`                                                                       | Primary           |
| MasterView (All Masters)  | Delete                                     | `onDelete(item.id)` (calls `handleDelete`)                                         | Danger            |
| MasterView (All Masters)  | Previous Page                              | `setCurrentPage(p => Math.max(1, p - 1))`                                          | Navigation        |
| MasterView (All Masters)  | Next Page                                  | `setCurrentPage(p => Math.min(totalPages, p + 1))`                                 | Navigation        |
| ToolPass                  | Authorize Access                           | Check PIN, set `isAdminAuthorized`                                                 | Primary           |
| ToolPass                  | Clear All Transactional Logs               | `handleSystemReset`                                                                | Danger            |
| ToolPass                  | Factory Reset Cache                        | `localStorage.clear(); window.location.reload()`                                    | Danger            |
| ToolPass                  | Lock Utilities                             | `setIsAdminAuthorized(false)`                                                      | Navigation        |
| App Performance Tracker   | Re-run All Checks                          | Reset checklist, re-run performance checks                                          | Primary           |
| Pincode Blocker           | Add Pincode                                | `handleSave('PincodeMaster', newItem)`                                             | Primary           |
| Pincode Blocker           | Toggle Allow/Block                         | `handleSave('PincodeMaster', updatedItem)`                                          | Primary           |
| Pincode Blocker           | Delete Pincode                             | `handleDelete(pin.id, setPincodeMaster, 'PincodeMaster')`                          | Danger            |
| Login Screen              | Log In                                     | `handleLogin`                                                                      | Primary           |
| Navbar                    | Dashboard, Sale, Purchase, Transaction     | `setActiveTab(tabName)`                                                            | Navigation        |
| ErrorBoundary             | Reload Page                                | `window.location.reload()`                                                          | Navigation        |
| ErrorBoundary             | Try Again                                  | Reset ErrorBoundary state                                                          | Navigation        |


## Critical Button Notes
1. **ALL Delete buttons (Danger category) are already protected by our error logging system (`logError` function) and verification prompt for critical tables (PurchaseLog, StaffMaster, ItemMaster)!**
2. **ALL Save buttons have try/catch via `handleSave` + `logError`**
3. **Failure Alert UI (shake effect) is already triggered globally by `setFailedButtonId`**
