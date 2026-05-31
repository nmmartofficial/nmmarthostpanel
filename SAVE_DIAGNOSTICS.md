# Save Operation Diagnostic Kit

## Step 1: Enhanced handleSave Function (Copy-paste this)

```javascript
  const handleSave = async (tab, data, setter) => {
    setIsSaving(true);
    
    console.log('======= SAVE DIAGNOSTICS START =======');
    console.log('1. Tab:', tab);
    console.log('2. Full Raw Data:', JSON.stringify(data, null, 2));

    // Ensure data has a valid UUID
    const processedData = { ...data };
    if (!processedData.id || !isValidUUID(processedData.id)) {
      processedData.id = generateUUID();
      console.log('3. Generated new UUID:', processedData.id);
    } else {
      console.log('3. Using existing UUID:', processedData.id);
    }

    // --- VALIDATION CHECKS ---
    let validationErrors = [];
    if (tab === 'ItemMaster') {
      if (!processedData.name || processedData.name.trim() === '') {
        validationErrors.push('Item Name is required');
      }
      if (!processedData.main_category && !processedData.mainCategory) {
        validationErrors.push('Main Category is required');
      }
    }

    if (validationErrors.length > 0) {
      console.warn('4. VALIDATION ERRORS:', validationErrors);
      validationErrors.forEach(err => addToast(err, 'error'));
      setIsSaving(false);
      console.log('======= SAVE DIAGNOSTICS END (VALIDATION FAILED) =======');
      return;
    } else {
      console.log('4. Validation passed!');
    }

    // Update local state first
    setter(prev => {
      const exists = prev.find(i => i.id === processedData.id);
      if (exists) return prev.map(i => i.id === processedData.id ? processedData : i);
      return [processedData, ...prev];
    });

    try {
      console.log('5. Starting Supabase operations...');

      if (tab === 'ItemMaster') {
        // 1. item_master के लिए 100% सेफ डेटा टाइप्स
        const cleanItem = {
          id: String(processedData.id),
          name: String(processedData.name || 'Unknown Item'),
          barcode: processedData.barcode ? String(processedData.barcode) : null,
          hsn_code: processedData.hsn_code || processedData.hsnCode || null,
          selling_price: parseFloat(processedData.selling_price || processedData.sellingPrice) || 0,
          mrp: parseFloat(processedData.mrp) || 0,
          purchase_rate: parseFloat(processedData.purchase_rate || processedData.purchaseRate) || 0,
          gst: parseFloat(processedData.gst) || 0,
          cess: parseFloat(processedData.cess) || 0,
          discount: parseFloat(processedData.discount) || 0,
          opening_stock: parseFloat(processedData.opening_stock || processedData.openingStock) || 0,
          stock_qty: parseFloat(processedData.stock_qty || processedData.stockQty) || 0,
          unit: processedData.unit ? String(processedData.unit) : null,
          item_group: processedData.item_group || processedData.group || null,
          main_category: processedData.main_category || processedData.mainCategory || null,
          sub_category: processedData.sub_category || processedData.subCategory || null,
          brand: processedData.brand ? String(processedData.brand) : null,
          is_favourite: Boolean(processedData.is_favourite || processedData.isFavourite),
          is_discountable: Boolean(processedData.is_discountable || processedData.isDiscountable),
          description: processedData.description ? String(processedData.description) : null,
          min_stock_level: parseFloat(processedData.min_stock_level) || 10
        };

        console.log('6. Clean ItemMaster Data:', JSON.stringify(cleanItem, null, 2));

        // 2. products के लिए 100% सेफ डेटा टाइप्स (NM App के लिए)
        const cleanProduct = {
          id: String(processedData.id),
          name: String(processedData.name || 'Unknown Item'),
          description: processedData.description ? String(processedData.description) : null,
          "ItemGroupName": processedData.main_category || processedData.mainCategory || processedData.item_group || processedData.group || '',
          "MRP": parseFloat(processedData.mrp) || 0,
          "Rate": parseFloat(processedData.selling_price || processedData.sellingPrice) || 0,
          "discountPerc": parseFloat(processedData.discount) || 0,
          "ImageUrl": processedData.picture || processedData.image_url || processedData.ImageUrl || '',
          "RawCodeNew": processedData.barcode ? String(processedData.barcode) : '',
          "RawName": String(processedData.name || 'Unknown Item'),
          unit: processedData.unit ? String(processedData.unit) : '',
          stock: parseInt(processedData.stock_qty || processedData.stockQty || processedData.stock) || 0,
          is_featured: Boolean(processedData.is_favourite || processedData.isFavourite || processedData.is_featured),
          badge: processedData.badge ? String(processedData.badge) : '',
          min_stock_level: parseFloat(processedData.min_stock_level) || 10
        };

        console.log('7. Clean Products Data:', JSON.stringify(cleanProduct, null, 2));

        // Upsert to item_master and products in parallel for speed
        console.log('8. Sending to Supabase...');
        const [itemResult, productResult] = await Promise.all([
          supabase.from('item_master').upsert(cleanItem, { onConflict: 'id' }),
          supabase.from('products').upsert(cleanProduct, { onConflict: 'id' })
        ]);

        console.log('9. ItemMaster Result:', itemResult);
        console.log('10. Products Result:', productResult);

        if (itemResult.error) {
          console.error('11. ItemMaster Supabase Error:', {
            code: itemResult.error.code,
            message: itemResult.error.message,
            details: itemResult.error.details,
            hint: itemResult.error.hint,
            fullError: itemResult.error
          });
          throw itemResult.error;
        }
        if (productResult.error) {
          console.error('11. Products Supabase Error:', {
            code: productResult.error.code,
            message: productResult.error.message,
            details: productResult.error.details,
            hint: productResult.error.hint,
            fullError: productResult.error
          });
          throw productResult.error;
        }
      } else if (tab === 'BannerMaster') {
        const cleanBanner = {
          id: String(processedData.id),
          title: String(processedData.title || ''),
          image_url: processedData.imageUrl ? String(processedData.imageUrl) : null,
          redirect_path: processedData.redirect ? String(processedData.redirect) : null,
          is_active: Boolean(processedData.active !== undefined ? processedData.active : true)
        };
        console.log('6. Clean Banner Data:', cleanBanner);
        const { data, error } = await supabase.from('banner_master').upsert(cleanBanner, { onConflict: 'id' });
        if (error) {
          console.error('7. Banner Supabase Error:', { code: error.code, message: error.message, details: error.details, hint: error.hint, fullError: error });
          throw error;
        }
        console.log('7. Banner Result:', data);
      } else if (tab === 'PurchaseLog') {
        const cleanPurchase = masterConfig.PurchaseLog.toDb(processedData);
        console.log('6. Clean Purchase Data:', cleanPurchase);
        // Update vendor's pending dues when saving purchase!
        const vendor = vendorMaster.find(v => v.id === cleanPurchase.vendor_id);
        if (vendor) {
          const newPendingDues = parseFloat(vendor.pending_dues || 0) + (cleanPurchase.total_amount - cleanPurchase.paid_amount);
          await supabase.from('vendor_master').upsert({
            ...vendor,
            pending_dues: newPendingDues
          }, { onConflict: 'id' });
        }
        const { data, error } = await supabase.from('purchase_log').upsert(cleanPurchase, { onConflict: 'id' });
        if (error) {
          console.error('7. PurchaseLog Supabase Error:', { code: error.code, message: error.message, details: error.details, hint: error.hint, fullError: error });
          throw error;
        }
        console.log('7. Purchase Result:', data);
      } else if (masterConfig[tab]) {
        const config = masterConfig[tab];
        const cleanData = config.toDb(processedData);
        console.log('6. Clean', tab, 'Data for table', config.table, ':', cleanData);
        const { data, error } = await supabase.from(config.table).upsert(cleanData, { onConflict: 'id' });
        if (error) {
          console.error('7.', tab, 'Supabase Error:', { code: error.code, message: error.message, details: error.details, hint: error.hint, fullError: error });
          throw error;
        }
        console.log('7.', tab, 'Result:', data);
      }
      
      console.log('======= SAVE DIAGNOSTICS END (SUCCESS) =======');
      addToast('Record saved successfully!', 'success');
    } catch (error) {
      console.error('======= SAVE DIAGNOSTICS END (ERROR) =======');
      console.error('Final Error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      logError(error, `Save Failed (${tab})`);
    } finally {
      setIsSaving(false);
    }
  };
```

---

## Step 2: SQL Query to Check NOT NULL Constraints (Run in Supabase SQL Editor)

```sql
-- Check all columns and constraints in item_master
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM 
  information_schema.columns
WHERE 
  table_name = 'item_master'
ORDER BY 
  ordinal_position;

-- Also check foreign key relationships
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM
  information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE
  tc.constraint_type = 'FOREIGN KEY' AND
  tc.table_name = 'item_master';
```
