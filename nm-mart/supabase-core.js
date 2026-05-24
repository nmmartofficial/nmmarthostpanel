/**
 * NM MART - Supabase Core Initialization
 * This file centralizes the connection to your Supabase Cloud Database.
 */

// --- CONFIGURATION ---
// Replace these with your actual Supabase Project URL and Anon Key from the Supabase Dashboard
const SUPABASE_URL = 'https://pqmgfxntxhnvknrvdyub.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_z251RLg-OLDByiBi4ch5uQ_Xez66ygH';

// Initialize the Supabase Client
// We use the CDN-loaded supabase object from index.html
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Global Database Helper Functions
 */
const db = {
    /**
     * Fetch all items from the database
     */
    async getItems() {
        const { data, error } = await supabase
            .from('items')
            .select('*, categories(name), brands(name)');
        if (error) throw error;
        return data;
    },

    /**
     * Save a complete POS Invoice to Supabase
     * @param {Object} invoiceData - The main bill details
     * @param {Array} items - Array of items in the cart
     */
    async saveInvoice(invoiceData, items) {
        // 1. Insert into sales_invoices
        const { data: invoice, error: invoiceError } = await window.supabaseClient
            .from('sales_invoices')
            .insert([invoiceData])
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        // 2. Prepare and insert line items
        const lineItems = items.map(item => ({
            invoice_id: invoice.id,
            item_id: item.id,
            item_name: item.name,
            quantity: item.qty,
            rate: item.price,
            tax_amount: (item.price * item.tax / 100) * item.qty,
            total_amount: item.price * item.qty
        }));

        const { error: itemsError } = await window.supabaseClient
            .from('sales_invoice_items')
            .insert(lineItems);

        if (itemsError) throw itemsError;

        return invoice;
    },

    /**
     * Upload an image to Supabase Storage Bucket
     * @param {File} file - The file object to upload
     * @param {string} bucket - Bucket name ('product-images', 'app-banners')
     * @returns {string} Public URL of the uploaded image
     */
    async uploadImage(file, bucket) {
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error } = await window.supabaseClient.storage
            .from(bucket)
            .upload(fileName, file);

        if (error) throw error;

        const { data: publicUrl } = window.supabaseClient.storage
            .from(bucket)
            .getPublicUrl(fileName);

        return publicUrl.publicUrl;
    }
};

// Export to window so router.js can access it
window.supabaseClient = supabase;
window.db = db;
