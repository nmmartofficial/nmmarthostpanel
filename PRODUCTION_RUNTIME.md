# NM Mart Production Runtime

The authoritative production application is this repository root:

- Build root: `d:/NM MART DATA/admin panel host`
- Source: `src/`
- POS: `src/features/pos/` and `src/pages/POSView.jsx`
- Entry: `index.html` -> `src/main.jsx`
- Vite config: `vite.config.js`

The nested `nmmarthostpanel/` directory is a separate historical checkout with
its own Git metadata, package manifest, Vite config, Supabase files, and source
tree. It is not imported by the root Vite build. It must not be selected as the
Vercel project root or used as the production build directory.

The production transaction path is:

`POS -> erpController.js -> dbSync.js -> place_order_atomic -> Supabase`

The atomic RPC owns order creation, order items, stock deduction, inventory
logging, and payment transaction recording.