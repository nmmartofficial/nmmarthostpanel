# NM MART - Java App - Supabase Complete Integration Guide

## 1. SUPABASE CREDENTIALS
```
SUPABASE_URL = https://cpipmysooynedtpreekt.supabase.co
SUPABASE_ANON_KEY = sb_publishable_bmVp0-jv3JLAZaIQpvhYwQ_E6JzdERh
```

---

## 2. JAVA DEPENDENCY (Maven/Gradle)

### Maven (pom.xml)
```xml
<!-- Add these dependencies to your pom.xml:
<dependencies>
    <!-- Supabase Java SDK -->
    <dependency>
        <groupId>io.supabase</groupId>
        <artifactId>supabase-java</artifactId>
        <version>0.2.0</version>
    </dependency>
    <!-- OkHttp for HTTP client (required by Supabase SDK)
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
import io.supabase.data.dto.Session;

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

## 4. JAVA MODEL CLASSES

### Product.java
```java
import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class Product {
    @SerializedName("id")
    private String id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("onlinerate")
    private Double onlineRate;
    
    @SerializedName("sale_rate")
    private Double saleRate;
    
    @SerializedName("opstock")
    private Integer stock;
    
    @SerializedName("category_id")
    private String categoryId;
    
    @SerializedName("brand_id")
    private String brandId;
    
    @SerializedName("is_active")
    private Boolean isActive;
    
    @SerializedName("created_at")
    private Date createdAt;
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public Double getOnlineRate() { return onlineRate; }
    public void setOnlineRate(Double onlineRate) { this.onlineRate = onlineRate; }
    
    public Double getSaleRate() { return saleRate; }
    public void setSaleRate(Double saleRate) { this.saleRate = saleRate; }
    
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    
    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }
    
    public String getBrandId() { return brandId; }
    public void setBrandId(String brandId) { this.brandId = brandId; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    
    // Helper method to get price (compatible with both new/old field names
    public Double getPrice() {
        return onlineRate != null ? onlineRate : (saleRate != null ? saleRate : 0.0);
    }
}
```

### Category.java
```java
import com.google.gson.annotations.SerializedName;

public class Category {
    @SerializedName("id")
    private String id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("image_url")
    private String imageUrl;
    
    @SerializedName("is_active")
    private Boolean isActive;
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
```

### Banner.java
```java
import com.google.gson.annotations.SerializedName;

public class Banner {
    @SerializedName("id")
    private String id;
    
    @SerializedName("title")
    private String title;
    
    @SerializedName("image_url")
    private String imageUrl;
    
    @SerializedName("is_active")
    private Boolean isActive;
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
```

### Coupon.java
```java
import com.google.gson.annotations.SerializedName;

public class Coupon {
    @SerializedName("id")
    private String id;
    
    @SerializedName("code")
    private String code;
    
    @SerializedName("discount_percent")
    private Double discountPercent;
    
    @SerializedName("is_active")
    private Boolean isActive;
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    
    public Double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(Double discountPercent) { this.discountPercent = discountPercent; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
```

---

## 5. JAVA API SERVICE CLASS
```java
import io.supabase.SupabaseClient;
import io.supabase.data.dto.PostgrestResponse;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;

public class NMMartApi {
    
    private final SupabaseClient client;
    
    public NMMartApi() {
        this.client = SupabaseConfig.getClient();
    }
    
    // =============================
    // FETCH PRODUCTS
    public List<Product> fetchProducts() {
        try {
            PostgrestResponse<Product> response = client
                .from("products")
                .select("*")
                .or("is_active.eq.true,is_active.is.null")
                .order("created_at", false)
                .executeAndGetList(Product.class);
            
            if (response.getError() != null) {
                System.err.println("Error fetching products: " + response.getError().getMessage());
                return new ArrayList<>();
            }
            
            return response.getData();
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
                .from("categories")
                .select("*")
                .or("is_active.eq.true,is_active.is.null")
                .order("name", true)
                .executeAndGetList(Category.class);
            
            if (response.getError() != null) {
                System.err.println("Error fetching categories: " + response.getError().getMessage());
                return new ArrayList<>();
            }
            
            return response.getData();
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
                .from("banners")
                .select("*")
                .or("is_active.eq.true,is_active.is.null")
                .order("created_at", false)
                .executeAndGetList(Banner.class);
            
            if (response.getError() != null) {
                System.err.println("Error fetching banners: " + response.getError().getMessage());
                return new ArrayList<>();
            }
            
            return response.getData();
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
                .from("coupons")
                .select("*")
                .or("is_active.eq.true,is_active.is.null")
                .executeAndGetList(Coupon.class);
            
            if (response.getError() != null) {
                System.err.println("Error fetching coupons: " + response.getError().getMessage());
                return new ArrayList<>();
            }
            
            return response.getData();
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
}
```

---

## 6. TABLES & BUCKETS REFERENCE

| Table Name       | Purpose
------------------|----------------
 products        | Product details
 categories      | Product categories
 subcategories   | Product subcategories
 brands          | Product brands
 banners         | App home screen banners
 coupons         | Discount coupons

| Bucket Name      | Purpose
------------------|----------------
 banner-images    | Banner images
 category-images| Category images
 product-images | Product images
 brand-images   | Brand images

---

## 7. REAL-TIME SYNC (Optional for Java (WebSocket)

### Real-time updates ke liye ye code (Optional):
```java
import okhttp3.*;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;
import io.supabase.data.dto.PostgresChangeEvent;

public class RealTimeSync {
    
    public static void subscribeToProducts(final String table, final Runnable onDataChange) {
        // For real-time, you can use WebSocket or polling as per your architecture
        // Alternative: Poll data ko periodic refresh karne ka simple method (every 5-10 seconds mein
        System.out.println("Real-time sync for table: " + table);
    }
}
```

---

## 8. EXAMPLE USAGE
```java
public class MainTest {
    public static void main(String[] args) {
        NMMartApi api = new NMMartApi();
        
        // Fetch Products
        System.out.println("=== Products ===");
        List<Product> products = api.fetchProducts();
        for (Product p : products) {
            System.out.println(p.getName() + " - ₹" + p.getPrice());
        }
        
        // Fetch Categories
        System.out.println("\n=== Categories ===");
        List<Category> categories = api.fetchCategories();
        for (Category c : categories) {
            System.out.println(c.getName());
        }
        
        // Fetch Banners
        System.out.println("\n=== Banners ===");
        List<Banner> banners = api.fetchBanners();
        for (Banner b : banners) {
            System.out.println(b.getTitle());
        }
    }
}
```

---

## 9. IMPORTANT FIELD NAMES (IMPORTANT: Aapke panel mein ye field names ka use karein kyunki ye panel ke database mein hai:

### Products Table:
- `onlinerate` (new field) - use this)
- `opstock` (new field for stock)
- `name` or `itname` (product name)
- `category_id` / `brand_id`
- `is_active`

### All Tables:
- Deleted items permanently removed (not just inactive!)

---

That's all! Aap ye file developer ko de do, wo easily connect kar lega!
