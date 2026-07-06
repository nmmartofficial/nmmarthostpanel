# NM MART - Java App - Supabase Complete Integration Guide
Last Updated: 2026-07-06

---

## 1. SUPABASE CREDENTIALS
```
SUPABASE_URL = https://cpipmysooynedtpreekt.supabase.co
SUPABASE_ANON_KEY = sb_publishable_bmVp0-jv3JLAZaIQpvhYwQ_E6JzdERh
```

---

## 2. JAVA DEPENDENCY (Maven/Gradle)

### Maven (pom.xml)
```xml
<!-- Add these dependencies to your pom.xml: -->
<dependencies>
    <!-- Supabase Java SDK -->
    <dependency>
        <groupId>io.supabase</groupId>
        <artifactId>supabase-java</artifactId>
        <version>0.2.0</version>
    </dependency>
    <!-- OkHttp for HTTP client (required by Supabase SDK) -->
    <dependency>
        <groupId>com.squareup.okhttp3</groupId>
        <artifactId>okhttp</artifactId>
        <version>4.12.0</version>
    </dependency>
    <!-- Gson for JSON handling -->
    <dependency>
        <groupId>com.google.code.gson</groupId>
        <artifactId>gson</artifactId>
        <version>2.10.1</version>
    </dependency>
</dependencies>
```

### Gradle (build.gradle)
```gradle
dependencies {
    implementation 'io.supabase:supabase-java:0.2.0'
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
}
```

---

## 3. SUPABASE CLIENT SETUP (Java)
```java
import io.supabase.SupabaseClient;
import io.supabase.SupabaseClientBuilder;

public class SupabaseConfig {
    
    private static final String SUPABASE_URL = "https://cpipmysooynedtpreekt.supabase.co";
    private static final String SUPABASE_ANON_KEY = "sb_publishable_bmVp0-jv3JLAZaIQpvhYwQ_E6JzdERh";
    
    private static SupabaseClient client;
    
    public static SupabaseClient getClient() {
        if (client == null) {
            client = SupabaseClientBuilder
                .builder(SUPABASE_URL, SUPABASE_ANON_KEY)
                .build();
        }
        return client;
    }
}
```

---

## 4. COMPLETE JAVA MODEL CLASSES

### Product.java (COMPLETE)
```java
import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class Product {
    @SerializedName("id")
    private String id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("itname")
    private String itName;
    
    @SerializedName("barcode")
    private String barcode;
    
    @SerializedName("onlinerate")
    private Double onlineRate;
    
    @SerializedName("online_rate")
    private Double onlineRate2;
    
    @SerializedName("sale_rate")
    private Double saleRate;
    
    @SerializedName("mrp")
    private Double mrp;
    
    @SerializedName("opstock")
    private Integer openingStock;
    
    @SerializedName("stock")
    private Integer stock;
    
    @SerializedName("category_id")
    private String categoryId;
    
    @SerializedName("category_name")
    private String categoryName;
    
    @SerializedName("brand_id")
    private String brandId;
    
    @SerializedName("brand_name")
    private String brandName;
    
    @SerializedName("image_url")
    private String imageUrl;
    
    @SerializedName("description")
    private String description;
    
    @SerializedName("hsn_code")
    private String hsnCode;
    
    @SerializedName("is_active")
    private Boolean isActive;
    
    @SerializedName("is_live_on_app")
    private Boolean isLiveOnApp;
    
    @SerializedName("created_at")
    private Date createdAt;
    
    @SerializedName("updated_at")
    private Date updatedAt;
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getItName() { return itName; }
    public void setItName(String itName) { this.itName = itName; }
    
    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }
    
    public Double getOnlineRate() { 
        return onlineRate != null ? onlineRate : (onlineRate2 != null ? onlineRate2 : 0.0); 
    }
    public void setOnlineRate(Double onlineRate) { this.onlineRate = onlineRate; }
    
    public Double getSaleRate() { return saleRate; }
    public void setSaleRate(Double saleRate) { this.saleRate = saleRate; }
    
    public Double getMrp() { return mrp; }
    public void setMrp(Double mrp) { this.mrp = mrp; }
    
    public Integer getOpeningStock() { return openingStock; }
    public void setOpeningStock(Integer openingStock) { this.openingStock = openingStock; }
    
    public Integer getStock() { return stock != null ? stock : 0; }
    public void setStock(Integer stock) { this.stock = stock; }
    
    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }
    
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    
    public String getBrandId() { return brandId; }
    public void setBrandId(String brandId) { this.brandId = brandId; }
    
    public String getBrandName() { return brandName; }
    public void setBrandName(String brandName) { this.brandName = brandName; }
    
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getHsnCode() { return hsnCode; }
    public void setHsnCode(String hsnCode) { this.hsnCode = hsnCode; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    public Boolean getIsLiveOnApp() { return isLiveOnApp; }
    public void setIsLiveOnApp(Boolean isLiveOnApp) { this.isLiveOnApp = isLiveOnApp; }
    
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    
    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
    
    // Helper method to get price for app display
    public Double getPrice() {
        Double rate = getOnlineRate();
        if (rate == null || rate == 0) {
            rate = saleRate != null ? saleRate : mrp;
        }
        return rate != null ? rate : 0.0;
    }
}
```

### Category.java
```java
import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class Category {
    @SerializedName("id")
    private String id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("image_url")
    private String imageUrl;
    
    @SerializedName("position")
    private Integer position;
    
    @SerializedName("is_active")
    private Boolean isActive;
    
    @SerializedName("created_at")
    private Date createdAt;
    
    @SerializedName("updated_at")
    private Date updatedAt;
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    
    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    
    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
}
```

### Brand.java
```java
import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class Brand {
    @SerializedName("id")
    private String id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("code")
    private String code;
    
    @SerializedName("image_url")
    private String imageUrl;
    
    @SerializedName("is_active")
    private Boolean isActive;
    
    @SerializedName("created_at")
    private Date createdAt;
    
    @SerializedName("updated_at")
    private Date updatedAt;
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    
    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
}
```

### Banner.java
```java
import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class Banner {
    @SerializedName("id")
    private String id;
    
    @SerializedName("title")
    private String title;
    
    @SerializedName("image_url")
    private String imageUrl;
    
    @SerializedName("linked_category_id")
    private String linkedCategoryId;
    
    @SerializedName("linked_product_id")
    private String linkedProductId;
    
    @SerializedName("position")
    private Integer position;
    
    @SerializedName("is_active")
    private Boolean isActive;
    
    @SerializedName("created_at")
    private Date createdAt;
    
    @SerializedName("updated_at")
    private Date updatedAt;
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    
    public String getLinkedCategoryId() { return linkedCategoryId; }
    public void setLinkedCategoryId(String linkedCategoryId) { this.linkedCategoryId = linkedCategoryId; }
    
    public String getLinkedProductId() { return linkedProductId; }
    public void setLinkedProductId(String linkedProductId) { this.linkedProductId = linkedProductId; }
    
    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    
    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
}
```

### Coupon.java
```java
import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class Coupon {
    @SerializedName("id")
    private String id;
    
    @SerializedName("code")
    private String code;
    
    @SerializedName("discount_type")
    private String discountType;
    
    @SerializedName("discount_value")
    private Double discountValue;
    
    @SerializedName("min_order_value")
    private Double minOrderValue;
    
    @SerializedName("max_discount")
    private Double maxDiscount;
    
    @SerializedName("usage_limit")
    private Integer usageLimit;
    
    @SerializedName("used_count")
    private Integer usedCount;
    
    @SerializedName("valid_from")
    private Date validFrom;
    
    @SerializedName("valid_to")
    private Date validTo;
    
    @SerializedName("is_active")
    private Boolean isActive;
    
    @SerializedName("created_at")
    private Date createdAt;
    
    @SerializedName("updated_at")
    private Date updatedAt;
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    
    public String getDiscountType() { return discountType; }
    public void setDiscountType(String discountType) { this.discountType = discountType; }
    
    public Double getDiscountValue() { return discountValue; }
    public void setDiscountValue(Double discountValue) { this.discountValue = discountValue; }
    
    public Double getMinOrderValue() { return minOrderValue; }
    public void setMinOrderValue(Double minOrderValue) { this.minOrderValue = minOrderValue; }
    
    public Double getMaxDiscount() { return maxDiscount; }
    public void setMaxDiscount(Double maxDiscount) { this.maxDiscount = maxDiscount; }
    
    public Integer getUsageLimit() { return usageLimit; }
    public void setUsageLimit(Integer usageLimit) { this.usageLimit = usageLimit; }
    
    public Integer getUsedCount() { return usedCount; }
    public void setUsedCount(Integer usedCount) { this.usedCount = usedCount; }
    
    public Date getValidFrom() { return validFrom; }
    public void setValidFrom(Date validFrom) { this.validFrom = validFrom; }
    
    public Date getValidTo() { return validTo; }
    public void setValidTo(Date validTo) { this.validTo = validTo; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    
    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
    
    public boolean isValid() {
        if (isActive == null || !isActive) {
            return false;
        }
        
        Date now = new Date();
        if (validFrom != null && now.before(validFrom)) {
            return false;
        }
        
        if (validTo != null && now.after(validTo)) {
            return false;
        }
        
        if (usageLimit != null && usedCount != null && usedCount >= usageLimit) {
            return false;
        }
        
        return true;
    }
}
```

### Order.java
```java
import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class Order {
    @SerializedName("id")
    private String id;
    
    @SerializedName("order_number")
    private String orderNumber;
    
    @SerializedName("customer_name")
    private String customerName;
    
    @SerializedName("user_mobile")
    private String userMobile;
    
    @SerializedName("address")
    private String address;
    
    @SerializedName("pincode")
    private String pincode;
    
    @SerializedName("subtotal")
    private Double subtotal;
    
    @SerializedName("delivery_charge")
    private Double deliveryCharge;
    
    @SerializedName("discount")
    private Double discount;
    
    @SerializedName("total_amount")
    private Double totalAmount;
    
    @SerializedName("payment_mode")
    private String paymentMode;
    
    @SerializedName("payment_status")
    private String paymentStatus;
    
    @SerializedName("order_status")
    private String orderStatus;
    
    @SerializedName("is_active")
    private Boolean isActive;
    
    @SerializedName("created_at")
    private Date createdAt;
    
    @SerializedName("updated_at")
    private Date updatedAt;
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
    
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    
    public String getUserMobile() { return userMobile; }
    public void setUserMobile(String userMobile) { this.userMobile = userMobile; }
    
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    
    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }
    
    public Double getSubtotal() { return subtotal; }
    public void setSubtotal(Double subtotal) { this.subtotal = subtotal; }
    
    public Double getDeliveryCharge() { return deliveryCharge; }
    public void setDeliveryCharge(Double deliveryCharge) { this.deliveryCharge = deliveryCharge; }
    
    public Double getDiscount() { return discount; }
    public void setDiscount(Double discount) { this.discount = discount; }
    
    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }
    
    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }
    
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    
    public String getOrderStatus() { return orderStatus; }
    public void setOrderStatus(String orderStatus) { this.orderStatus = orderStatus; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    
    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
}
```

### User.java
```java
import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class User {
    @SerializedName("id")
    private String id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("email")
    private String email;
    
    @SerializedName("mobile")
    private String mobile;
    
    @SerializedName("is_active")
    private Boolean isActive;
    
    @SerializedName("created_at")
    private Date createdAt;
    
    @SerializedName("updated_at")
    private Date updatedAt;
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    
    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
}
```

---

## 5. COMPLETE JAVA API SERVICE CLASS
```java
import io.supabase.SupabaseClient;
import io.supabase.data.dto.PostgrestResponse;
import java.util.List;
import java.util.ArrayList;

public class NMMartApi {
    
    private static final String SUPABASE_URL = "https://cpipmysooynedtpreekt.supabase.co";
    private final SupabaseClient client;
    
    public NMMartApi() {
        this.client = SupabaseConfig.getClient();
    }
    
    // =============================
    // FETCH PRODUCTS (Using readable view for cleaner data)
    public List<Product> fetchProducts() {
        try {
            PostgrestResponse<Product> response = client
                .from("readable_products")  // Using the readable view (no UUIDs)
                .select("*")
                .or("is_active.eq.true,is_active.is.null")
                .order("created_at", false)
                .executeAndGetList(Product.class);
            
            if (response.getError() != null) {
                System.err.println("Error fetching products: " + response.getError().getMessage());
                return new ArrayList<>();
            }
            
            return response.getData() != null ? response.getData() : new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    // Fetch Products by Category
    public List<Product> fetchProductsByCategory(String categoryId) {
        try {
            PostgrestResponse<Product> response = client
                .from("products")
                .select("*")
                .eq("category_id", categoryId)
                .or("is_active.eq.true,is_active.is.null")
                .executeAndGetList(Product.class);
            
            return response.getData() != null ? response.getData() : new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    // =============================
    // FETCH CATEGORIES
    public List<Category> fetchCategories() {
        try {
            PostgrestResponse<Category> response = client
                .from("readable_categories")  // Readable view
                .select("*")
                .or("is_active.eq.true,is_active.is.null")
                .order("name", true)
                .executeAndGetList(Category.class);
            
            if (response.getError() != null) {
                System.err.println("Error fetching categories: " + response.getError().getMessage());
                return new ArrayList<>();
            }
            
            return response.getData() != null ? response.getData() : new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    // =============================
    // FETCH BRANDS
    public List<Brand> fetchBrands() {
        try {
            PostgrestResponse<Brand> response = client
                .from("readable_brands")  // Readable view
                .select("*")
                .or("is_active.eq.true,is_active.is.null")
                .order("name", true)
                .executeAndGetList(Brand.class);
            
            if (response.getError() != null) {
                System.err.println("Error fetching brands: " + response.getError().getMessage());
                return new ArrayList<>();
            }
            
            return response.getData() != null ? response.getData() : new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    // =============================
    // FETCH BANNERS
    public List<Banner> fetchBanners() {
        try {
            PostgrestResponse<Banner> response = client
                .from("readable_banners")  // Readable view
                .select("*")
                .or("is_active.eq.true,is_active.is.null")
                .order("position", true)
                .executeAndGetList(Banner.class);
            
            if (response.getError() != null) {
                System.err.println("Error fetching banners: " + response.getError().getMessage());
                return new ArrayList<>();
            }
            
            return response.getData() != null ? response.getData() : new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    // =============================
    // FETCH COUPONS
    public List<Coupon> fetchCoupons() {
        try {
            PostgrestResponse<Coupon> response = client
                .from("readable_coupons")  // Readable view
                .select("*")
                .or("is_active.eq.true,is_active.is.null")
                .order("created_at", false)
                .executeAndGetList(Coupon.class);
            
            if (response.getError() != null) {
                System.err.println("Error fetching coupons: " + response.getError().getMessage());
                return new ArrayList<>();
            }
            
            return response.getData() != null ? response.getData() : new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    // =============================
    // FETCH ORDERS FOR A USER (by mobile number)
    public List<Order> fetchOrdersByMobile(String mobileNumber) {
        try {
            PostgrestResponse<Order> response = client
                .from("readable_orders")  // Readable view
                .select("*")
                .eq("user_mobile", mobileNumber)
                .order("created_at", false)
                .executeAndGetList(Order.class);
            
            return response.getData() != null ? response.getData() : new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    // =============================
    // GET IMAGE URL FROM STORAGE
    public String getImageUrl(String bucket, String filePath) {
        if (filePath == null || filePath.isEmpty()) {
            return null;
        }
        
        if (filePath.startsWith("http")) {
            return filePath;
        }
        
        return SUPABASE_URL + "/storage/v1/object/public/" + bucket + "/" + filePath;
    }
    
    // Helper methods for common image buckets
    public String getProductImageUrl(String filePath) {
        return getImageUrl("product-images", filePath);
    }
    
    public String getCategoryImageUrl(String filePath) {
        return getImageUrl("category-images", filePath);
    }
    
    public String getBannerImageUrl(String filePath) {
        return getImageUrl("banner-images", filePath);
    }
    
    public String getBrandImageUrl(String filePath) {
        return getImageUrl("brand-images", filePath);
    }
}
```

---

## 6. ALL TABLES & BUCKETS REFERENCE

### Complete Tables List (40+ Tables)
| Table Name               | Purpose
--------------------------|----------------
 account_master           | Customers and suppliers
 addresses                | User addresses
 admin_users              | Admin panel users
 app_config               | App configuration
 banners                  | Home screen banners
 basket                   | Shopping basket (same as cart)
 brands                   | Product brands
 cart                     | Shopping cart
 categories               | Product categories
 credit_master            | Credit records
 credit_notes             | Credit notes for returns
 customer_loyalty         | Loyalty points
 delivery_boy_master      | Delivery boys
 delivery_customer_master | Delivery customers
 department_master        | Departments
 expense_categories       | Expense categories
 expenses                 | Business expenses
 flash_sales              | Flash sale events
 home_config              | Home screen layout config
 inventory_logs           | Stock change audit
 notifications            | Push notifications
 offers_master            | Special offers
 order_items              | Individual order line items
 orders                   | Customer orders
 pincode_master           | Serviceable pincodes
 products                 | Products master (SUPER IMPORTANT!)
 purchase_items           | Purchase line items
 purchases                | Purchase orders
 return_items             | Returned items
 stock_alerts             | Low stock alerts
 subcategories            | Product subcategories
 support_tickets          | Customer support tickets
 system_logs              | Complete audit trail (IMPORTANT!)
 unit_master              | Units of measurement
 users                    | App users
 wallet_master            | User wallet balances
 wallet_transactions      | Wallet transaction history
 wishlist                 | User wishlists

### Storage Buckets
| Bucket Name      | Purpose
------------------|----------------
 banner-images    | Banner images
 category-images  | Category images
 product-images   | Product images
 brand-images     | Brand images

---

## 7. IMPORTANT FIELD NAMES FOR APP

### Products Table Fields (MOST IMPORTANT)
| Field Name         | Description
--------------------|----------------
 name / itname      | Product name
 onlinerate         | Price for app display (USE THIS!)
 sale_rate          | Sale price
 mrp                | MRP
 opstock            | Opening stock
 stock              | Current stock
 image_url          | Product image
 category_id        | Category UUID
 brand_id           | Brand UUID
 is_active          | Is product active?
 is_live_on_app     | Show on app?
 hsn_code           | HSN code for GST
 created_at         | Creation timestamp

### IMPORTANT NOTE
- **Use `onlinerate`** for price display in app (this is the main field!)
- **Use `opstock` or `stock`** for stock quantity
- **Deleted items are permanently removed** from banners, categories, subcategories, brands, coupons, offers (not just marked inactive!)

---

## 8. EXAMPLE USAGE
```java
public class MainTest {
    public static void main(String[] args) {
        NMMartApi api = new NMMartApi();
        
        // 1. Fetch Products
        System.out.println("=== Products ===");
        List<Product> products = api.fetchProducts();
        for (Product p : products) {
            System.out.println(p.getName() + " - ₹" + p.getPrice());
        }
        
        // 2. Fetch Categories
        System.out.println("\n=== Categories ===");
        List<Category> categories = api.fetchCategories();
        for (Category c : categories) {
            System.out.println(c.getName());
        }
        
        // 3. Fetch Banners
        System.out.println("\n=== Banners ===");
        List<Banner> banners = api.fetchBanners();
        for (Banner b : banners) {
            System.out.println(b.getTitle());
            System.out.println("Image: " + api.getBannerImageUrl(b.getImageUrl()));
        }
        
        // 4. Fetch Coupons
        System.out.println("\n=== Coupons ===");
        List<Coupon> coupons = api.fetchCoupons();
        for (Coupon c : coupons) {
            if (c.isValid()) {
                System.out.println(c.getCode() + " - " + c.getDiscountValue() + "% OFF");
            }
        }
    }
}
```

---

## 9. REAL-TIME SYNC (Optional)

### Method 1: Polling (Simple)
```java
import java.util.Timer;
import java.util.TimerTask;

public class DataSyncManager {
    private NMMartApi api;
    private Timer timer;
    
    public DataSyncManager() {
        this.api = new NMMartApi();
        this.timer = new Timer();
    }
    
    public void startAutoRefresh(int seconds, Runnable onDataUpdate) {
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                onDataUpdate.run();
            }
        }, 0, seconds * 1000);
    }
    
    public void stopAutoRefresh() {
        timer.cancel();
    }
}
```

---

## 10. ADDITIONAL FILES FOR REFERENCE

- **COMPLETE_AUDITED_SCHEMA_WITH_RLS.sql**: Full database schema with RLS policies
- **SUPABASE_AUDIT_QUERIES_HINDI.sql**: Complete audit queries in Hindi
- **JAVA_APP_GUIDE_HINDI.md**: Quick Hindi guide for developers
- **All files available on GitHub**: https://github.com/nmmartofficial/nmmarthostpanel

---

## 11. RLS (Row Level Security) NOTE

RLS (Row Level Security) is enabled on all tables in Supabase for security.
The current configuration allows full access for admin panel operations (which is perfect for your use case!).

---

## 12. SUPPORT

If you need any help:
1. Check the complete schema file: `COMPLETE_AUDITED_SCHEMA_WITH_RLS.sql`
2. Use the audit queries in `SUPABASE_AUDIT_QUERIES_HINDI.sql`
3. Check the admin panel code for reference

---

That's all! You're now ready to integrate the Java app with NM MART's Supabase backend! 🚀
