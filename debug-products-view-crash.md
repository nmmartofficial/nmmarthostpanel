# Debug Session: products-view-crash

- **Status**: [OPEN]
- **Started**: 2026-09-17
- **Session ID**: products-view-crash
- **Log File**: trae-debug-log-products-view-crash.ndjson

## Symptoms
- ProductsView page crashes on localhost:5201
- Stack trace points to ProductsView.jsx line 175:40
- Component tree: Suspense → MotionComponent → AnimatePresence → App → ProtectedRoute → BrowserRouter → GlobalProvider → AuthProvider → ErrorBoundary

## Hypotheses (Falsifiable)
1. **H1**: `brands` array or related lookup object is `undefined/null` at line 175, causing property access (e.g. `.find()`, `.map()`, `.filter()`) on undefined
2. **H2**: Type mismatch after schema sync — `product.brand_id` / `brand.id` types (string vs number) causing `.find()` or equality checks to fail and return undefined, then downstream access crashes
3. **H3**: `dbSchema.js` sync changed `TABLE_COLUMN_MAPPINGS` or column names, causing product/brand data shape mismatch at render time (expected keys missing)
4. **H4**: Brand name resolution helper returns non-primitive (object/undefined) when passed to a React child, triggering "Objects are not valid as a React child"
5. **H5**: Import/export mismatch — `resolveBrandName` or similar helper not exported properly after refactor, usage is `undefined` being called as function

## Evidence Log
| # | Timestamp | Observation | Verdict |
|---|-----------|-------------|---------|
| 1 | 2026-09-17 | L175 stack is Vite offset. Static analysis of [ProductsView.jsx:1](file:///d:/NM%20MART%20DATA/admin%20panel%20host/src/pages/Inventory/ProductsView.jsx#L1) imports: `useState, useMemo, useRef, useEffect` but NOT `useCallback`. | H5 confirmed |
| 2 | 2026-09-17 | [ProductsView.jsx:193](file:///d:/NM%20MART%20DATA/admin%20panel%20host/src/pages/Inventory/ProductsView.jsx#L193): `resolveBrandName = useCallback(...)` is called but `useCallback` is `undefined`. Throws `ReferenceError: useCallback is not defined` at component init (hooks run top-to-bottom; Vite reports hook-definition line ~175 column ~40 due to sourcemap offset). | H5 confirmed |
| 3 | 2026-09-17 | Props analysis: `products/categories/brands/subcategories` initialized as `[]` in App.jsx state (never null). So H1/H2 falsified. | H1❌ H2❌ |
| 4 | 2026-09-17 | `DB_SCHEMA`, `dbSync`, `generateUUID`, `generateNumericId` exports verified in dbSchema.js, dbSync.js, helpers.js — all exist. So H3 partially ruled out. | H3❌ (partial) |
| 5 | 2026-09-17 | `resolveBrandName` returns primitive ('-' / string name). React child object case H4 ruled out. | H4❌ |

## Root Cause Summary
In the commit `4466aaa` the brand-name resolver `resolveBrandName` was refactored from a plain function to a `useCallback` hook, but the import statement on line 1 was never updated to include `useCallback`. This caused `ReferenceError: useCallback is not defined` the moment the component mounted (hooks execute eagerly), crashing the view before any child rendering.

## Steps
- [x] Step 1: Static code analysis of L175 context
- [ ] Step 2: Add instrumentation + start Debug Server (skipped — root cause statically confirmed)
- [x] Step 3: Reproduce & collect runtime evidence — user stack + static import diff
- [x] Step 4: Identify root cause — `useCallback` import missing
- [x] Step 5: Minimal fix — `useCallback` added to React imports at ProductsView.jsx L1
- [ ] Step 6: Verify post-fix
