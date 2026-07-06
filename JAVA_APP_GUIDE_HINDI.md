# NM MART - JAVA APP - COMPLETE GUIDE HINDI

---

## 1. SUPABASE CREDENTIALS
```
SUPABASE_URL = https://cpipmysooynedtpreekt.supabase.co
SUPABASE_ANON_KEY = sb_publishable_bmVp0-jv3JLAZaIQpvhYwQ_E6JzdERh
```

---

## 2. JAVA MEIN SUPABASE SDK ADD KARO
### Maven (pom.xml)
```xml
<dependency>
    <groupId>io.supabase</groupId>
    <artifactId>supabase-java</artifactId>
    <version>0.2.0</version>
</dependency>
```

### Gradle (build.gradle)
```gradle
dependencies {
    implementation 'io.supabase:supabase-java:0.2.0'
}
```

---

## 3. JAVA CLIENT SETUP KARO
```java
import io.supabase.SupabaseClient;
import io.supabase.SupabaseClientBuilder;

public class SupabaseConfig {
    private static final String URL = "https://cpipmysooynedtpreekt.supabase.co";
    private static final String ANON_KEY = "sb_publishable_bmVp0-jv3JLAZaIQpvhYwQ_E6JzdERh";
    
    public static SupabaseClient getClient() {
        return SupabaseClientBuilder.builder(URL, ANON_KEY).build();
    }
}
```

---

## 4. PRODUCTS LENE KA CODE
```java
import io.supabase.SupabaseClient;
import io.supabase.data.dto.PostgrestResponse;
import java.util.List;
import java.util.ArrayList;

public class ProductService {
    private final SupabaseClient client = SupabaseConfig.getClient();
    
    public List<Product> getProducts() {
        try {
            PostgrestResponse<Product> response = client
                .from("products")
                .select("*")
                .or("is_active.eq.true,is_active.is.null")
                .order("created_at", false)
                .executeAndGetList(Product.class);
            
            return response.getData() != null ? response.getData() : new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    public List<Product> getProductsByCategory(String categoryId) {
        try {
            PostgrestResponse<Product> response = client
                .from("products")
                .select("*")
                .eq("category_id", categoryId)
                .executeAndGetList(Product.class);
            
            return response.getData() != null ? response.getData() : new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
}
```

---

## 5. PRODUCT MODEL CLASS
```java
import com.google.gson.annotations.SerializedName;

public class Product {
    @SerializedName("id")
    private String id;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("onlinerate")
    private Double onlineRate; // App mein yahi rate use karo
    
    @SerializedName("stock")
    private Integer stock;
    
    @SerializedName("opstock")
    private Integer opStock;
    
    @SerializedName("category_id")
    private String categoryId;
    
    @SerializedName("is_active")
    private Boolean isActive;
    
    // Getters aur Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    // IMPORTANT: App mein Rate ke liye onlinerate use karo
    public Double getRate() {
        return onlineRate != null ? onlineRate : 0.0;
    }
    
    public Integer getStock() { return stock != null ? stock : 0; }
    public void setStock(Integer stock) { this.stock = stock; }
}
```

---

## 6. CATEGORIES, BANNERS, COUPONS LENE KA CODE
```java
public class HomeService {
    private final SupabaseClient client = SupabaseConfig.getClient();
    
    public List<Category> getCategories() {
        try {
            PostgrestResponse<Category> response = client
                .from("categories")
                .select("*")
                .or("is_active.eq.true,is_active.is.null")
                .executeAndGetList(Category.class);
            
            return response.getData() != null ? response.getData() : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
    
    public List<Banner> getBanners() {
        try {
            PostgrestResponse<Banner> response = client
                .from("banners")
                .select("*")
                .or("is_active.eq.true,is_active.is.null")
                .order("created_at", false)
                .executeAndGetList(Banner.class);
            
            return response.getData() != null ? response.getData() : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}

// Category Model
public class Category {
    @SerializedName("id")
    private String id;
    @SerializedName("name")
    private String name;
    @SerializedName("image_url")
    private String imageUrl;
    // Getters Setters
}

// Banner Model
public class Banner {
    @SerializedName("id")
    private String id;
    @SerializedName("title")
    private String title;
    @SerializedName("image_url")
    private String imageUrl;
    // Getters Setters
}
```

---

## 7. STORAGE SE IMAGE URL NIKALNA
```java
public String getImageUrl(String bucket, String filePath) {
    if (filePath == null || filePath.isEmpty()) {
        return null;
    }
    if (filePath.startsWith("http")) {
        return filePath;
    }
    return "https://cpipmysooynedtpreekt.supabase.co/storage/v1/object/public/" + bucket + "/" + filePath;
}

// Example: Product Image
String productImage = getImageUrl("product-images", product.getImageUrl());
// Category Image
String catImage = getImageUrl("category-images", category.getImageUrl());
// Banner Image
String bannerImage = getImageUrl("banner-images", banner.getImageUrl());
```

---

## 8. ZAROORI TABLES LIST
| Table Name | Kiske liye |
|-------------|--------------|
| products | Products list lene ke liye |
| categories | Categories ke liye |
| subcategories | Subcategories ke liye |
| brands | Brands ke liye |
| banners | Banners ke liye |
| coupons | Coupons ke liye |
| offers | Offers ke liye |
| orders | Orders ke liye |
| users | Users ke liye |
| wallet_master | Wallet ke liye |

---

## 9. STORAGE BUCKETS LIST
| Bucket Name | Kiske liye |
|-------------|------------|
| product-images | Product images |
| category-images | Category images |
| banner-images | Banner images |
| brand-images | Brand images |

---

## 10. IMPORTANT POINTS
- **App mein Price ke liye onlinerate column use karo**
- **Stock ke liye stock column ya opstock use karo
- **Delete karte waqt: Banners, Categories, Subcategories, Brands permanently delete honge (soft delete nahi)
- **Real-time sync ke liye supabase channel use kar sakte ho (optional
- **Sabhi tables mein created_at aur updated_at columns hote hain timestamp ke liye
- **is_active true hone par dikhao, false hone par mat dikhao (products, categories etc.

---

## 11. EXTRA HELPFUL LINKS
- Admin Panel Code: already setup ho chuka hai
- App Guide: APP_SUPABASE_CONNECTION_GUIDE_JAVA.md (detailed)
- Schema: SUPABASE_SCHEMA_HINDI.sql
