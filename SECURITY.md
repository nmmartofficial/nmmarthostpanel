# 🔐 NM MART Admin Panel - Security Documentation

## 📋 **Version: 2.0.0  
**Last Updated:** 2026-06-11  
**Purpose:** Comprehensive security overview for the NM MART Ultra Retail ERP Admin Panel.

---

## ✅ **Security Checklist (Completed)

| Category | Status | Details |
|----------|--------|---------|
| 🔒 **Row Level Security (RLS)** | ✅ | All tables protected with fine-grained access control policies |
| 📝 **Audit Logging** | ✅ | All critical operations logged with triggers and audit trail system |
| 🔐 **PIN Verification** | ✅ | Server-side PIN validation using Supabase RPC functions |
| 🚫 **Brute Force Protection** | ✅ | Rate limiting and account lockout (5 attempts → 5 min lockout) |
| 🛡️ **XSS Protection** | ✅ | Input sanitization and HTML encoding |
| 🔐 **HTTPS Enforcement** | ✅ | Auto-redirect to HTTPS in production environments |
| 🕒 **Session Timeout** | ✅ | Auto-logout after 30 minutes of inactivity |
| 💾 **Secure Storage** | ✅ | Sensitive data stored with base64 encoding |
| 🛡️ **Clickjacking Prevention** | ✅ | Frame-busting protection |
| ✅ **Data Integrity Constraints** | ✅ | Database-level constraints (price, stock, etc. |
| 📊 **System Logs** | ✅ | All changes tracked in system_logs table |

---

## 🔒 **Supabase Security Setup (Deploying the SQL Script**

1. **Open your Supabase project SQL Editor**

2. **Copy and paste the entire `COMPREHENSIVE_SECURITY_UPGRADE.sql` file contents**

3. **Execute the SQL script** (this will enable RLS, create policies, and set up audit triggers)

---

## 🚨 **Critical Post-Deployment Steps**

### 1️⃣ **Change Default PINs
Update the default PINs immediately!
- **In `app_config` table:** Change `security_pin`
- **In `admin_users` table:** Change `pin` for all admin users

### 2️⃣ **Enable Supabase Auth (Recommended)**
For even better security, enable Supabase Auth (email/password or OAuth) instead of PIN-only:

1. Go to Supabase → Authentication → Providers
2. Enable Email provider
3. Update the app to use Supabase Auth instead of just PIN

### 3️⃣ **Configure Storage Buckets Security**
Make sure all storage buckets have proper RLS policies:

For admin-only uploads and public reads (if needed)

---

## 🛠️ **Security Utilities Reference (`security.js`)

Located at: `src/utils/security.js`

### Available Functions:
| Function | Purpose |
|----------|---------|
| `sanitizeHTML(input)` | Sanitizes input to prevent XSS attacks |
| `sanitizeText(text)` | Trims and sanitizes text inputs |
| `validatePIN(pin)` | Validates PIN format (4-8 digits) |
| `validateEmail(email)` | Validates email format |
| `validatePhone(phone)` | Validates 10-digit Indian phone numbers |
| `validatePositiveNumber(num)` | Ensures number is >= 0 |
| `validatePasswordStrength(password)` | Checks password strength (min 8 chars, letter, number, special character) |
| `generateSecurePIN()` | Generates a random 6-digit PIN |
| `secureStorage.setItem/getItem/removeItem/clear()` | Secure wrapper around localStorage |
| `isSecureConnection()` | Checks if protocol is HTTPS |
| `forceHTTPS()` | Auto-redirects to HTTPS in production |
| `preventClickjacking()` | Prevents clickjacking attacks |
| `sanitizeFormData(data)` | Recursively sanitizes form data |
| `validateProduct(product)` | Validates product data integrity |

---

## 🔐 **RLS Policy Summary**

### **Admin-Only Tables (Read/Write Only by Authenticated Users
- `app_config`
- `admin_users`
- `system_logs`
- `inventory_logs`

### **Public Read + Admin Write Tables
- `products`
- `categories`
- `brands`
- `banners`
- `offers_master`
- `coupons`
- `pincode_master`
- `subcategories`

### **User-Specific Tables (Users Can Only Access Their Own Data)
- `cart`
- `wishlist`
- `wallet_master`
- `wallet_transactions`
- `addresses`

---

## 🔄 **Session Security Best Practices**

1. **Never use weak PINs like 1234, 0000, 1111, birthdays, etc.

2. **Always use HTTPS for admin panel

3. **Enable 2FA (Two-Factor Authentication) if available**

4. **Regularly review system logs for suspicious activity

5. **Limit admin panel access to trusted IP addresses only**

6. **Use strong, unique passwords for Supabase account**

7. **Regularly backup your database**

8. **Keep all dependencies updated**

---

## 🚧 **Production Deployment Checklist**
1. [ ] Disable the offline fallback PIN in `handleLogin` function
2. [ ] Enable RLS on all tables
3. [ ] Set up proper backup policies
4. [ ] Enable HTTPS on your domain
5. [ ] Use environment variables for all secrets
6. [ ] Set up IP restrictions
7. [ ] Review all RLS policies thoroughly
8. [ ] Test all security measures
9. [ ] Train admin users on security best practices
10. [ ] Set up monitoring and alerting for suspicious activity

---

## 📞 **If You Find a Security Vulnerability**
Please report any security issues immediately!

---

## 📚 **Additional Resources**
- [Supabase Security Guide](https://supabase.com/docs/guides/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://react.dev/learn/security)
