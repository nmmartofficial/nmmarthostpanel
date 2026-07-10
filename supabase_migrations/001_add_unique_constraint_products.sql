-- NM Mart: Add Unique Constraint on Products Table (Brand + Category + Subcategory)
-- This prevents duplicate entries of the same product combination at the database level

-- First, check if the constraint already exists to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_brand_category_subcategory' 
        AND table_name = 'products'
    ) THEN
        -- Add the unique constraint (allow NULLs for subcategory if needed)
        ALTER TABLE products 
        ADD CONSTRAINT unique_brand_category_subcategory 
        UNIQUE (brand_id, category_id, subcategory_id);
        
        RAISE NOTICE 'Unique constraint "unique_brand_category_subcategory" added successfully';
    ELSE
        RAISE NOTICE 'Unique constraint "unique_brand_category_subcategory" already exists';
    END IF;
END $$;
