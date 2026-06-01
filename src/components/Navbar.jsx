import React from 'react'
import {
  Home,
  ShoppingCart,
  Wallet,
  Eye,
  FileText,
  Store,
  Repeat,
  Settings,
  ChevronDown,
  Maximize,
  Bell,
} from 'lucide-react'

const NavItem = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${active ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
  >
    {icon} {label}
  </button>
)

export default function Navbar({
  activeTab,
  setActiveTab,
  getAllowedTabs,
  masters,
  viewRoutes,
  reportRoutes,
  storeRoutes,
  toolRoutes,
  isMasterOpen,
  setIsMasterOpen,
  isViewOpen,
  setIsViewOpen,
  isReportOpen,
  setIsReportOpen,
  isStoreOpen,
  setIsStoreOpen,
  isToolOpen,
  setIsToolOpen,
  currentStaff,
  handleLogout,
}) {
  return (
    <nav className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[80] flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`p-2 rounded-lg transition-all ${activeTab === 'dashboard' ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Home size={20} />
        </button>

        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <img
            src="https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=NM%20MART%20logo,%20red%20gold%20colors,%20shopping%20cart,%20gift,%20elegant%20retail%20design%20with%203D%20style,%20clean%20background,%20professional%20logo&image_size=square_hd"
            alt="NM MART Logo"
            className="h-10 object-contain"
          />
        </div>

        <div className="hidden lg:flex items-center gap-1">
          {masters.filter(m => getAllowedTabs().includes(m.id)).length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setIsMasterOpen(!isMasterOpen); setIsViewOpen(false); setIsReportOpen(false); setIsStoreOpen(false); setIsToolOpen(false) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${masters.some(m => m.id === activeTab) ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Master <ChevronDown size={14} className={`transition-transform ${isMasterOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMasterOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 overflow-hidden z-[90]">
                  {masters.filter(m => getAllowedTabs().includes(m.id)).map(master => (
                    <button
                      key={master.id}
                      onClick={() => { setActiveTab(master.id); setIsMasterOpen(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all ${activeTab === master.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {master.icon} {master.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {getAllowedTabs().includes('sale') && (
            <NavItem active={activeTab === 'sale'} onClick={() => { setActiveTab('sale'); setIsMasterOpen(false); setIsViewOpen(false); setIsReportOpen(false); setIsStoreOpen(false); setIsToolOpen(false) }} icon={<ShoppingCart size={18} />} label="Sale Entry" />
          )}
          {getAllowedTabs().includes('purchase') && (
            <NavItem active={activeTab === 'purchase'} onClick={() => { setActiveTab('purchase'); setIsMasterOpen(false); setIsViewOpen(false); setIsReportOpen(false); setIsStoreOpen(false); setIsToolOpen(false) }} icon={<Wallet size={18} />} label="Purchase" />
          )}

          {viewRoutes.filter(r => getAllowedTabs().includes(r.id)).length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setIsMasterOpen(false); setIsViewOpen(!isViewOpen); setIsReportOpen(false); setIsStoreOpen(false); setIsToolOpen(false) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${viewRoutes.some(r => r.id === activeTab) ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Eye size={18} /> View <ChevronDown size={14} className={`transition-transform ${isViewOpen ? 'rotate-180' : ''}`} />
              </button>

              {isViewOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 overflow-hidden z-[90]">
                  {viewRoutes.filter(r => getAllowedTabs().includes(r.id)).map(route => (
                    <button
                      key={route.id}
                      onClick={() => { setActiveTab(route.id); setIsViewOpen(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all ${activeTab === route.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {route.icon} {route.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {reportRoutes.filter(r => getAllowedTabs().includes(r.id)).length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setIsMasterOpen(false); setIsViewOpen(false); setIsReportOpen(!isReportOpen); setIsStoreOpen(false); setIsToolOpen(false) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${reportRoutes.some(r => r.id === activeTab) ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <FileText size={18} /> Report <ChevronDown size={14} className={`transition-transform ${isReportOpen ? 'rotate-180' : ''}`} />
              </button>

              {isReportOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-[90] scrollbar-hide">
                  {reportRoutes.filter(r => getAllowedTabs().includes(r.id)).map(route => (
                    <button
                      key={route.id}
                      onClick={() => { setActiveTab(route.id); setIsReportOpen(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all ${activeTab === route.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {route.icon} {route.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {storeRoutes.filter(r => getAllowedTabs().includes(r.id)).length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setIsMasterOpen(false); setIsViewOpen(false); setIsReportOpen(false); setIsStoreOpen(!isStoreOpen); setIsToolOpen(false) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${storeRoutes.some(r => r.id === activeTab) ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Store size={18} /> Store <ChevronDown size={14} className={`transition-transform ${isStoreOpen ? 'rotate-180' : ''}`} />
              </button>

              {isStoreOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-[90] scrollbar-hide">
                  {storeRoutes.filter(r => getAllowedTabs().includes(r.id)).map(route => (
                    <button
                      key={route.id}
                      onClick={() => { setActiveTab(route.id); setIsStoreOpen(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all ${activeTab === route.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {route.icon} {route.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {getAllowedTabs().includes('transaction') && (
            <NavItem active={activeTab === 'transaction'} onClick={() => { setActiveTab('transaction'); setIsMasterOpen(false); setIsViewOpen(false); setIsReportOpen(false); setIsStoreOpen(false); setIsToolOpen(false) }} icon={<Repeat size={18} />} label="Transaction" />
          )}

          {toolRoutes.filter(r => getAllowedTabs().includes(r.id)).length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setIsMasterOpen(false); setIsViewOpen(false); setIsReportOpen(false); setIsStoreOpen(false); setIsToolOpen(!isToolOpen) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${toolRoutes.some(r => r.id === activeTab) ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Settings size={18} /> Tools <ChevronDown size={14} className={`transition-transform ${isToolOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-[90] overflow-hidden">
                  {toolRoutes.filter(r => getAllowedTabs().includes(r.id)).map(route => (
                    <button
                      key={route.id}
                      onClick={() => { setActiveTab(route.id); setIsToolOpen(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all ${activeTab === route.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {route.icon} {route.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-none">Hi, {currentStaff.staff_name}</p>
            <p className="text-[10px] font-bold uppercase text-slate-400">{currentStaff.role.replace('_', ' ')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[20px] text-xs font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
          >
            Logout
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://pqmgfxntxhnvknrvdyub.supabase.co/storage/v1/object/public/NMMart%20apk/app-releases/NMMart.apk"
            target="_blank"
            rel="noopener noreferrer"
            download="nm-mart-app-release.apk"
            className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
          >
            📥 Download NM App
          </a>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"><Maximize size={20} /></button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
        </div>
      </div>
    </nav>
  )
}

