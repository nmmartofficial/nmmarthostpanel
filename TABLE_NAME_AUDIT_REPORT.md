# NM MART ULTRA ERP - Table Name Dependency & Consistency Audit

## Mismatches Found
| Code Table Name         | Verified Table Name       | Notes                                  |
|-------------------------|---------------------------|----------------------------------------|
| `main_cat_master`       | `main_category_master`    | Naming convention mismatch             |
| `sub_cat_master`        | `sub_category_master`     | Naming convention mismatch             |
| `dept_master`           | `department_master`       | Naming convention mismatch             |
| `purchase_log`          | `purchase_logs` OR `vendor_purchase_log` | Singular vs Plural |
| `wallet_master`         | `wallet_balances`         | Naming mismatch                        |
| `wallet_transactions`   | Not in verified list      | New table, add to list or remove       |
| `pincode_master`        | Not in verified list      | New table, add to list or remove       |
| `staff_master`          | Not in verified list      | New table, add to list or remove       |


## Other Notes
- ✅ `error_log` is in verified list (used for error logging)
- ✅ `item_master`, `products`, `vendor_master`, `sale_logs`, `transaction_logs` match correctly
- ✅ All Supabase requests use the Supabase client which automatically includes the auth session (so RLS works properly)
