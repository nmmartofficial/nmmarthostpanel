# 🔗 NM MART - Cross Project Sync Guide
## Admin Panel ↔ NMMart App (Android) Complete Sync

---

## 📋 OVERVIEW
Ye guide batati hai ki kaise **Admin Panel** aur **NMMart App** ko sync kiya jaye taaki dono projects same Supabase database use kar sakein.

---

## 🎯 SYNC OBJECTIVES

1. **Same Supabase Configuration** - URL, Anon Key, Auth
2. **Same Table Names** - Products, Categories, Brands, etc.
3. **Same Column Names** - Exact Excel column structure
4. **Same Auth System** - User authentication alignment

---

## 📁 STEP 1: SUPABASE CONFIGURATION SYNC

### Admin Panel (Current Config)
```env
VITE_SUPABASE_URL=https://cpipmysooynedtpreekt.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_bmVp0-jv3JLAZaIQpvhYwQ_E6JzdERh
```

### NMMart App (Update Required)
File: `gradle.properties`

```properties
# Supabase Configuration - SAME AS ADMIN PANEL
supabase.url=https://cpipmysooynedtpreekt.supabase.co
supabase.anon.key=sb_publishable_bmVp0-jv3JLAZaIQpvhYwQ_E6JzdERh
supabase.project.ref=cpipmysooynedtpreekt
```

### Java Config File Update
File: `app/src/main/java/com/nmmart/retailos/data/SupabaseConfig.java`

```java
package com.nmmart.retailos.data;

public class SupabaseConfig {
    // SAME AS ADMIN PANEL
    public static final String SUPABASE_URL = "https://cpipmysooynedtpreekt.supabase.co";
    public static final String SUPABASE_ANON_KEY = "sb_publishable_bmVp0-jv3JLAZaIQpvhYwQ_E6JzdERh";
    public static final String PROJECT_REF = "cpipmysooynedtpreekt";
}
```

---

## 📁 STEP 2: TABLE STRUCTURE SYNC

### Products Table - EXACT EXCEL COLUMNS

**Admin Panel Schema (Updated):**
```sql
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    itname TEXT NOT NULL,
    itnameprint TEXT,
    barcode TEXT UNIQUE,
    imagename TEXT,
    itemdescription TEXT,
    hsncode TEXT,
    picture TEXT,
    takerate NUMERIC DEFAULT 0.00,
    restrate NUMERIC DEFAULT 0.00,
    dlvrate NUMERIC DEFAULT 0.00,
    onlinerate NUMERIC DEFAULT 0.00,
    purcrate NUMERIC DEFAULT 0.00,
    mrp NUMERIC DEFAULT 0.00,
    opstock NUMERIC DEFAULT 0.00,
    discperc NUMERIC DEFAULT 0.00,
    isfav TEXT DEFAULT 'No',
    unitcode TEXT,
    itg TEXT,
    itc TEXT,
    dtcode TEXT,
    kcode TEXT,
    brandcode TEXT REFERENCES brands(code),
    isdiscountable TEXT DEFAULT 'Yes',
    gst NUMERIC DEFAULT 0.00,
    cess NUMERIC DEFAULT 0.00,
    shopid TEXT,
    ispackage TEXT DEFAULT 'No',
    narration TEXT,
    narration2 TEXT,
    itemstatus TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### NMMart App - Product Model Update
File: `app/src/main/java/com/nmmart/retailos/models/Product.java`

```java
package com.nmmart.retailos.models;

import com.google.gson.annotations.SerializedName;

public class Product {
    @SerializedName("id")
    private String id;
    
    @SerializedName("itname")
    private String itname;
    
    @SerializedName("itnameprint")
    private String itnameprint;
    
    @SerializedName("barcode")
    private String barcode;
    
    @SerializedName("imagename")
    private String imagename;
    
    @SerializedName("itemdescription")
    private String itemdescription;
    
    @SerializedName("hsncode")
    private String hsncode;
    
    @SerializedName("picture")
    private String picture;
    
    @SerializedName("takerate")
    private double takerate;
    
    @SerializedName("restrate")
    private double restrate;
    
    @SerializedName("dlvrate")
    private double dlvrate;
    
    @SerializedName("onlinerate")
    private double onlinerate;
    
    @SerializedName("purcrate")
    private double purcrate;
    
    @SerializedName("mrp")
    private double mrp;
    
    @SerializedName("opstock")
    private double opstock;
    
    @SerializedName("discperc")
    private double discperc;
    
    @SerializedName("isfav")
    private String isfav;
    
    @SerializedName("unitcode")
    private String unitcode;
    
    @SerializedName("itg")
    private String itg;
    
    @SerializedName("itc")
    private String itc;
    
    @SerializedName("dtcode")
    private String dtcode;
    
    @SerializedName("kcode")
    private String kcode;
    
    @SerializedName("brandcode")
    private String brandcode;
    
    @SerializedName("isdiscountable")
    private String isdiscountable;
    
    @SerializedName("gst")
    private double gst;
    
    @SerializedName("cess")
    private double cess;
    
    @SerializedName("shopid")
    private String shopid;
    
    @SerializedName("ispackage")
    private String ispackage;
    
    @SerializedName("narration")
    private String narration;
    
    @SerializedName("narration2")
    private String narration2;
    
    @SerializedName("itemstatus")
    private String itemstatus;
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getItname() { return itname; }
    public void setItname(String itname) { this.itname = itname; }
    
    public String getItnameprint() { return itnameprint; }
    public void setItnameprint(String itnameprint) { this.itnameprint = itnameprint; }
    
    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }
    
    public String getImagename() { return imagename; }
    public void setImagename(String imagename) { this.imagename = imagename; }
    
    public String getItemdescription() { return itemdescription; }
    public void setItemdescription(String itemdescription) { this.itemdescription = itemdescription; }
    
    public String getHsncode() { return hsncode; }
    public void setHsncode(String hsncode) { this.hsncode = hsncode; }
    
    public String getPicture() { return picture; }
    public void setPicture(String picture) { this.picture = picture; }
    
    public double getTakerate() { return takerate; }
    public void setTakerate(double takerate) { this.takerate = takerate; }
    
    public double getRestrate() { return restrate; }
    public void setRestrate(double restrate) { this.restrate = restrate; }
    
    public double getDlvrate() { return dlvrate; }
    public void setDlvrate(double dlvrate) { this.dlvrate = dlvrate; }
    
    public double getOnlinerate() { return onlinerate; }
    public void setOnlinerate(double onlinerate) { this.onlinerate = onlinerate; }
    
    public double getPurcrate() { return purcrate; }
    public void setPurcrate(double purcrate) { this.purcrate = purcrate; }
    
    public double getMrp() { return mrp; }
    public void setMrp(double mrp) { this.mrp = mrp; }
    
    public double getOpstock() { return opstock; }
    public void setOpstock(double opstock) { this.opstock = opstock; }
    
    public double getDiscperc() { return discperc; }
    public void setDiscperc(double discperc) { this.discperc = discperc; }
    
    public String getIsfav() { return isfav; }
    public void setIsfav(String isfav) { this.isfav = isfav; }
    
    public String getUnitcode() { return unitcode; }
    public void setUnitcode(String unitcode) { this.unitcode = unitcode; }
    
    public String getItg() { return itg; }
    public void setItg(String itg) { this.itg = itg; }
    
    public String getItc() { return itc; }
    public void setItc(String itc) { this.itc = itc; }
    
    public String getDtcode() { return dtcode; }
    public void setDtcode(String dtcode) { this.dtcode = dtcode; }
    
    public String getKcode() { return kcode; }
    public void setKcode(String kcode) { this.kcode = kcode; }
    
    public String getBrandcode() { return brandcode; }
    public void setBrandcode(String brandcode) { this.brandcode = brandcode; }
    
    public String getIsdiscountable() { return isdiscountable; }
    public void setIsdiscountable(String isdiscountable) { this.isdiscountable = isdiscountable; }
    
    public double getGst() { return gst; }
    public void setGst(double gst) { this.gst = gst; }
    
    public double getCess() { return cess; }
    public void setCess(double cess) { this.cess = cess; }
    
    public String getShopid() { return shopid; }
    public void setShopid(String shopid) { this.shopid = shopid; }
    
    public String getIspackage() { return ispackage; }
    public void setIspackage(String ispackage) { this.ispackage = ispackage; }
    
    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }
    
    public String getNarration2() { return narration2; }
    public void setNarration2(String narration2) { this.narration2 = narration2; }
    
    public String getItemstatus() { return itemstatus; }
    public void setItemstatus(String itemstatus) { this.itemstatus = itemstatus; }
    
    // Helper method for display name
    public String getDisplayName() {
        return itname != null ? itname : "Unknown Product";
    }
    
    // Helper method for price calculation
    public double getSalePrice() {
        return restrate > 0 ? restrate : mrp;
    }
    
    // Helper method for discount calculation
    public double getDiscountedPrice() {
        if (discperc > 0 && restrate > 0) {
            return restrate - (restrate * discperc / 100);
        }
        return restrate;
    }
}
```

---

## 📁 STEP 3: CATEGORIES & BRANDS - CODE BASED SYSTEM

### Categories Table (No UUID)
```sql
CREATE TABLE IF NOT EXISTS categories (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### NMMart App - Category Model Update
File: `app/src/main/java/com/nmmart/retailos/models/Category.java`

```java
package com.nmmart.retailos.models;

import com.google.gson.annotations.SerializedName;

public class Category {
    @SerializedName("code")
    private String code;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("image_url")
    private String imageUrl;
    
    @SerializedName("position")
    private int position;
    
    @SerializedName("is_active")
    private boolean isActive;
    
    // Getters and Setters
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
}
```

### Brands Table (No UUID)
```sql
CREATE TABLE IF NOT EXISTS brands (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### NMMart App - Brand Model Update
File: `app/src/main/java/com/nmmart/retailos/models/Brand.java`

```java
package com.nmmart.retailos.models;

import com.google.gson.annotations.SerializedName;

public class Brand {
    @SerializedName("code")
    private String code;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("image_url")
    private String imageUrl;
    
    @SerializedName("is_active")
    private boolean isActive;
    
    // Getters and Setters
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
}
```

---

## 📁 STEP 4: AUTH SYSTEM SYNC

### Admin Panel Auth Config
File: `src/supabase.js` (Already configured)

### NMMart App - Auth Config Update
File: `app/src/main/java/com/nmmart/retailos/data/SupabaseAuthConfig.java`

```java
package com.nmmart.retailos.data;

public class SupabaseAuthConfig {
    // SAME AS ADMIN PANEL
    public static final String SUPABASE_URL = "https://cpipmysooynedtpreekt.supabase.co";
    public static final String SUPABASE_ANON_KEY = "sb_publishable_bmVp0-jv3JLAZaIQpvhYwQ_E6JzdERh";
    
    // Auth Configuration
    public static final boolean AUTO_REFRESH_TOKEN = true;
    public static final boolean DETECT_SESSION_IN_URL = true;
    public static final boolean PERSIST_SESSION = true;
}
```

---

## 📁 STEP 5: DATABASE QUERY SYNC

### NMMart App - Repository Update
File: `app/src/main/java/com/nmmart/retailos/data/SupabaseRepository.java`

```java
package com.nmmart.retailos.data;

import com.nmmart.retailos.models.Product;
import com.nmmart.retailos.models.Category;
import com.nmmart.retailos.models.Brand;
import java.util.List;

public class SupabaseRepository {
    private static final String SUPABASE_URL = SupabaseConfig.SUPABASE_URL;
    private static final String SUPABASE_ANON_KEY = SupabaseConfig.SUPABASE_ANON_KEY;
    
    // PRODUCTS TABLE - EXACT COLUMN NAMES
    public static final String PRODUCTS_TABLE = "products";
    public static final String CATEGORIES_TABLE = "categories";
    public static final String BRANDS_TABLE = "brands";
    
    // Product Columns
    public static final String COL_ID = "id";
    public static final String COL_ITNAME = "itname";
    public static final String COL_ITNAMEPRINT = "itnameprint";
    public static final String COL_BARCODE = "barcode";
    public static final String COL_IMAGENAME = "imagename";
    public static final String COL_ITEMDESCRIPTION = "itemdescription";
    public static final String COL_HSNCODE = "hsncode";
    public static final String COL_PICTURE = "picture";
    public static final String COL_TAKERATE = "takerate";
    public static final String COL_RESTRATE = "restrate";
    public static final String COL_DLVRATE = "dlvrate";
    public static final String COL_ONLINERATE = "onlinerate";
    public static final String COL_PURCRATE = "purcrate";
    public static final String COL_MRP = "mrp";
    public static final String COL_OPSTOCK = "opstock";
    public static final String COL_DISCPERC = "discperc";
    public static final String COL_ISFAV = "isfav";
    public static final String COL_UNITCODE = "unitcode";
    public static final String COL_ITG = "itg";
    public static final String COL_ITC = "itc";
    public static final String COL_DTCODE = "dtcode";
    public static final String COL_KCODE = "kcode";
    public static final String COL_BRANDCODE = "brandcode";
    public static final String COL_ISDISCOUNTABLE = "isdiscountable";
    public static final String COL_GST = "gst";
    public static final String COL_CESS = "cess";
    public static final String COL_SHOPID = "shopid";
    public static final String COL_ISPACKAGE = "ispackage";
    public static final String COL_NARRATION = "narration";
    public static final String COL_NARRATION2 = "narration2";
    public static final String COL_ITEMSTATUS = "itemstatus";
    
    // Category Columns
    public static final String CAT_CODE = "code";
    public static final String CAT_NAME = "name";
    public static final String CAT_IMAGE_URL = "image_url";
    
    // Brand Columns
    public static final String BRAND_CODE = "code";
    public static final String BRAND_NAME = "name";
    public static final String BRAND_IMAGE_URL = "image_url";
    
    // Sample Query Methods
    public static List<Product> getAllProducts() {
        // Query: SELECT * FROM products WHERE itemstatus = 'Active'
        // Implementation using your HTTP client
        return null;
    }
    
    public static List<Category> getAllCategories() {
        // Query: SELECT * FROM categories WHERE is_active = true
        return null;
    }
    
    public static List<Brand> getAllBrands() {
        // Query: SELECT * FROM brands WHERE is_active = true
        return null;
    }
}
```

---

## 📁 STEP 6: API ENDPOINTS SYNC

### Common API Endpoints (Both Projects Use Same)

```
# Products
GET /rest/v1/products?select=*
POST /rest/v1/products
PATCH /rest/v1/products?id=eq.{id}
DELETE /rest/v1/products?id=eq.{id}

# Categories
GET /rest/v1/categories?select=*
POST /rest/v1/categories
PATCH /rest/v1/categories?code=eq.{code}

# Brands
GET /rest/v1/brands?select=*
POST /rest/v1/brands
PATCH /rest/v1/brands?code=eq.{code}

# Auth
POST /auth/v1/token?grant_type=password
POST /auth/v1/token?grant_type=refresh_token
POST /auth/v1/logout
```

---

## ✅ CHECKLIST

### Admin Panel (Already Done ✅)
- [x] Supabase schema updated with exact Excel columns
- [x] Categories/Brands using code instead of UUID
- [x] Excel upload mapping updated
- [x] dbSchema.js updated

### NMMart App (Manual Update Required)
- [ ] Update `gradle.properties` with Supabase credentials
- [ ] Update `SupabaseConfig.java` with same credentials
- [ ] Update `Product.java` model with exact column names
- [ ] Update `Category.java` model with code-based system
- [ ] Update `Brand.java` model with code-based system
- [ ] Update `SupabaseAuthConfig.java` with auth configuration
- [ ] Update `SupabaseRepository.java` with table/column constants
- [ ] Update all API calls to use new column names
- [ ] Test product fetching from Supabase
- [ ] Test category/brand fetching from Supabase

---

## 🚀 TESTING STEPS

### 1. Test Supabase Connection
```bash
# In Admin Panel
npm run dev
# Check browser console for Supabase connection

# In NMMart App
./gradlew assembleDebug
# Install and test on device/emulator
```

### 2. Test Data Sync
1. Upload Excel file in Admin Panel
2. Check data in Supabase dashboard
3. Open NMMart App
4. Verify products appear with correct data

### 3. Test Auth
1. Create user in Admin Panel
2. Login in NMMart App with same credentials
3. Verify session works

---

## 📞 SUPPORT

Agar koi issue aaye to:
1. Check Supabase dashboard for table structure
2. Verify column names match exactly
3. Check network connectivity
4. Review error logs in both projects

---

**Last Updated:** July 2026  
**Projects:** Admin Panel (React) + NMMart App (Android)  
**Database:** Supabase (PostgreSQL)
