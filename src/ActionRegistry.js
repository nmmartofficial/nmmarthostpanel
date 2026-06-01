export function createActionRegistry(ctx) {
  const handleSave = async (tab, data, setter) => {
    ctx.setIsSaving(true)
    
    console.log('======= SAVE DIAGNOSTICS START =======')
    console.log('1. Tab:', tab)
    console.log('2. Full Raw Data:', JSON.stringify(data, null, 2))
 
    const processedData = { ...data }
    if (!processedData.id || !ctx.isValidUUID(processedData.id)) {
      processedData.id = ctx.generateUUID()
      console.log('3. Generated new UUID:', processedData.id)
    } else {
      console.log('3. Using existing UUID:', processedData.id)
    }
 
    let validationErrors = []
    if (tab === 'ItemMaster') {
      if (!processedData.name || processedData.name.trim() === '') {
        validationErrors.push('Item Name is required')
      }
      if (!processedData.main_category && !processedData.mainCategory) {
        validationErrors.push('Main Category is required')
      }
    }
 
    if (validationErrors.length > 0) {
      console.warn('4. VALIDATION ERRORS:', validationErrors)
      validationErrors.forEach(err => ctx.addToast(err, 'error'))
      ctx.setIsSaving(false)
      console.log('======= SAVE DIAGNOSTICS END (VALIDATION FAILED) =======')
      return
    } else {
      console.log('4. Validation passed!')
    }
 
    setter(prev => {
      const exists = prev.find(i => i.id === processedData.id)
      if (exists) return prev.map(i => i.id === processedData.id ? processedData : i)
      return [processedData, ...prev]
    })
 
    try {
      console.log('5. Starting Supabase operations...')
 
      if (tab === 'ItemMaster') {
        console.log('🔍 Checking foreign keys for item_master:', {
          main_category: processedData.main_category || processedData.mainCategory,
          sub_category: processedData.sub_category || processedData.subCategory,
          brand: processedData.brand,
          unit: processedData.unit,
          item_group: processedData.item_group || processedData.group
        })
 
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
        }
 
        console.log('✅ Clean ItemMaster Data:', JSON.stringify(cleanItem, null, 2))
 
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
        }
 
        console.log('✅ Clean Products Data:', JSON.stringify(cleanProduct, null, 2))
 
        console.log('🚀 Sending data to Supabase (insert with onConflict)...')
 
        console.log('📝 Saving to item_master...')
        const { data: itemData, error: itemError } = await ctx.supabase
          .from('item_master')
          .insert(cleanItem, { onConflict: 'id' })
          .select()
 
        if (itemError) {
          console.error('❌ item_master ERROR:', {
            code: itemError.code,
            message: itemError.message,
            details: itemError.details,
            hint: itemError.hint,
            fullError: itemError
          })
          ctx.addToast(`Item Master Save Failed: ${itemError.message}`, 'error')
          throw itemError
        }
        console.log('✅ item_master SAVED:', itemData)
 
        console.log('📝 Saving to products...')
        const { data: productData, error: productError } = await ctx.supabase
          .from('products')
          .insert(cleanProduct, { onConflict: 'id' })
          .select()
 
        if (productError) {
          console.error('❌ products ERROR:', {
            code: productError.code,
            message: productError.message,
            details: productError.details,
            hint: productError.hint,
            fullError: productError
          })
          ctx.addToast(`Products Save Failed: ${productError.message}`, 'error')
          throw productError
        }
        console.log('✅ products SAVED:', productData)
 
        console.log('🎉 BOTH TABLES SAVED SUCCESSFULLY!')
      } else if (tab === 'BannerMaster') {
        const cleanBanner = {
          id: String(processedData.id),
          title: String(processedData.title || ''),
          image_url: processedData.imageUrl ? String(processedData.imageUrl) : null,
          redirect_path: processedData.redirect ? String(processedData.redirect) : null,
          is_active: Boolean(processedData.active !== undefined ? processedData.active : true)
        }
        const { error } = await ctx.supabase.from('banner_master').upsert(cleanBanner, { onConflict: 'id' })
        if (error) {
          throw error
        }
      } else if (tab === 'PurchaseLog') {
        const cleanPurchase = ctx.masterConfig.PurchaseLog.toDb(processedData)
        const vendor = ctx.vendorMaster.find(v => v.id === cleanPurchase.vendor_id)
        if (vendor) {
          const newPendingDues = parseFloat(vendor.pending_dues || 0) + (cleanPurchase.total_amount - cleanPurchase.paid_amount)
          await ctx.supabase.from('vendor_master').upsert({
            ...vendor,
            pending_dues: newPendingDues
          }, { onConflict: 'id' })
        }
        await ctx.supabase.from('purchase_log').upsert(cleanPurchase, { onConflict: 'id' })
      } else if (ctx.masterConfig[tab]) {
        const config = ctx.masterConfig[tab]
        const cleanData = config.toDb(processedData)
        await ctx.supabase.from(config.table).upsert(cleanData, { onConflict: 'id' })
      }
      
      console.log('======= SAVE DIAGNOSTICS END (SUCCESS) =======')
      ctx.addToast('Record saved successfully!', 'success')
    } catch (error) {
      console.error('======= SAVE DIAGNOSTICS END (ERROR) =======')
      console.error('Final Error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      ctx.logError(error, `Save Failed (${tab})`)
    } finally {
      ctx.setIsSaving(false)
    }
  }
 
  const handleDelete = async (id, setter, tab) => {
    if (ctx.criticalTabs.includes(tab)) {
      const confirmed = window.confirm(`Warning: Deleting this record (${tab}) is permanent and may affect other data. Are you sure you want to continue?`)
      if (!confirmed) return
    }
 
    ctx.setIsDeleting(true)
    try {
      const stateLookup = {
        'ItemMaster': ctx.itemMaster,
        'BannerMaster': ctx.bannerMaster,
        'AccountMaster': ctx.accountMaster,
        'UserPermission': ctx.userMaster,
        'CreditMaster': ctx.creditMaster,
        'WalletMaster': ctx.walletMaster,
        'WalletTransactions': ctx.walletTransactions,
        'PincodeMaster': ctx.pincodeMaster,
        'ItemUnit_View': ctx.unitMaster,
        'ItemGroupMaster': ctx.groupMaster,
        'Item-main-Category': ctx.mainCatMaster,
        'Item-Sub-Category': ctx.subCatMaster,
        'BrandMaster': ctx.brandMaster,
        'StaffMaster': ctx.staffMaster,
        'VendorMaster': ctx.vendorMaster,
        'PurchaseLog': ctx.vendorPurchaseLog,
        'DepartmentMas': ctx.deptMaster,
        'DeliveryBoyMaster': ctx.deliveryBoyMaster,
        'Delivery_cust_Master': ctx.deliveryCustMaster
      }
      const currentData = stateLookup[tab] || []
 
      const itemToDelete = currentData.find(i => i.id === id)
      if (itemToDelete) {
        if (tab === 'ItemMaster') {
          const itemImage = itemToDelete.picture || itemToDelete.image_url
          if (itemImage) await ctx.deleteMediaFromSupabase(itemImage)
        } else if (tab === 'BannerMaster') {
          const bannerImage = itemToDelete.imageUrl || itemToDelete.image_url
          if (bannerImage) await ctx.deleteMediaFromSupabase(bannerImage)
        }
      }
 
      setter(prev => prev.filter(i => i.id !== id))
 
      if (tab === 'ItemMaster') {
        await Promise.all([
          ctx.supabase.from('item_master').delete().eq('id', String(id)),
          ctx.supabase.from('products').delete().eq('id', String(id))
        ])
      } else if (tab === 'PurchaseLog') {
        const purchase = ctx.vendorPurchaseLog.find(p => p.id === id)
        if (purchase) {
          const vendor = ctx.vendorMaster.find(v => v.id === purchase.vendor_id)
          if (vendor) {
            const newPendingDues = parseFloat(vendor.pending_dues || 0) - (purchase.total_amount - purchase.paid_amount)
            await ctx.supabase.from('vendor_master').upsert({
              ...vendor,
              pending_dues: newPendingDues
            }, { onConflict: 'id' })
          }
        }
        await ctx.supabase.from('purchase_log').delete().eq('id', String(id))
      } else if (ctx.masterConfig[tab]) {
        const config = ctx.masterConfig[tab]
        await ctx.supabase.from(config.table).delete().eq('id', String(id))
      } else if (['BannerMaster', 'AccountMaster', 'UserPermission', 'CreditMaster', 'WalletMaster', 'WalletTransactions', 'PincodeMaster'].includes(tab)) {
        const tableMap = {
          'BannerMaster': 'banner_master',
          'AccountMaster': 'account_master',
          'UserPermission': 'user_master',
          'CreditMaster': 'credit_master',
          'WalletMaster': 'wallet_balances',
          'WalletTransactions': 'wallet_transactions',
          'PincodeMaster': 'pincode_master'
        }
        await ctx.supabase.from(tableMap[tab]).delete().eq('id', String(id))
      }
 
      ctx.addToast('Record deleted successfully!', 'success')
    } catch (error) {
      ctx.logError(error, `Delete Failed (${tab})`)
    } finally {
      ctx.setIsDeleting(false)
    }
  }
 
  const handleLogin = async (e) => {
    e.preventDefault()
    ctx.setLoginError('')
    try {
      const { data, error } = await ctx.supabase.auth.signInWithPassword({
        email: ctx.loginUsername,
        password: ctx.loginPassword,
      })
 
      if (error) throw error
      ctx.setActiveTab('dashboard')
    } catch (error) {
      ctx.setLoginError(error.message || 'Invalid email or password')
      ctx.logError(error, 'Login Failed')
    }
  }
 
  return { handleSave, handleDelete, handleLogin }
}

