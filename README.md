# NM MART - Ultra Retail ERP Admin Panel

A comprehensive, modern admin panel for NM MART's retail ERP system, built with React, Vite, Tailwind CSS, and Supabase!

## ✨ Features

### Core Features
- 📦 **Inventory Management**: Products, categories, brands, suppliers
- 🛒 **Point of Sale (POS)**: Fast, modern POS interface with barcode scanning
- 📋 **Orders Management**: Track and manage customer orders
- 💰 **Finance**: Expense tracking, profit & loss statements
- 👥 **Customers**: Customer management, loyalty program
- 📊 **Analytics**: Beautiful charts and insights
- 🎨 **Themes**: Dark mode, automatic festival themes (Diwali, Holi, Christmas, etc.)

### Security Features
- 🔐 PIN-based authentication
- 🛡️ XSS protection and input sanitization
- ⏱️ Login rate limiting
- 🔒 Secure local storage

### Utilities
- 📄 Thermal receipt printing
- 📊 Excel/CSV export & import
- 📱 Fully responsive design
- 🔄 Real-time updates via Supabase

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Supabase account and project

### 1. Clone the Repository
```bash
git clone https://github.com/nmmartofficial/nmmarthostpanel.git
cd nmmarthostpanel
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Copy the example env file and fill in your details:
```bash
cp .env.example .env
```

Now edit `.env` with your Supabase credentials:
```env
# Supabase Configuration
# Get these from your Supabase Dashboard → Project Settings → API
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Admin Security PIN (replace with a strong PIN!)
VITE_ADMIN_SECURITY_PIN=1234
```

### 4. Start the Development Server
```bash
npm run dev
```
The app will start on http://localhost:5200 (or next available port)

## 📁 Project Structure

```
nmmarthostpanel/
├─ public/              # Static assets
├─ src/
│  ├─ components/       # Reusable UI components
│  ├─ pages/            # Page components
│  │  ├─ Inventory/     # Inventory management pages
│  │  └─ Orders/        # Orders management pages
│  ├─ utils/            # Helper functions
│  ├─ App.jsx           # Main app component
│  ├─ dbSchema.js       # Database schema definitions
│  ├─ dbSync.js         # Database sync utilities
│  ├─ erpController.js  # ERP action handlers
│  └─ supabase.js       # Supabase client setup
├─ index.html
├─ package.json
├─ vite.config.js
└─ tailwind.config.js
```

## 🛠️ Supabase Setup

1. Create a new project at https://supabase.com
2. Go to **Project Settings → API** to get your URL and anon key
3. Set up your database tables (refer to `dbSchema.js` for schema)
4. (Optional) Enable Storage for file uploads

## 📜 Scripts

| Script           | Description                                  |
|-------------------|----------------------------------------------|
| `npm run dev`     | Start development server                     |
| `npm run build`   | Build for production                         |
| `npm run preview` | Preview production build                     |
| `npm run lint`    | Check for linting errors                     |

## 🎨 Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Supabase**: @supabase/supabase-js
- **Charts**: Recharts
- **PDF**: jsPDF + jsPDF-AutoTable
- **Excel**: xlsx
- **QR/Barcodes**: @yudiel/react-qr-scanner, jsbarcode

## 📝 License

Proprietary - NM MART

## 🤝 Support

For support, contact the NM MART development team.

