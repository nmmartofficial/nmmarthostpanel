import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import SelfCheckoutKiosk from './pages/SelfCheckoutKiosk.jsx'
import LandingPage from './pages/LandingPage.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { GlobalProvider } from './context/GlobalContext'
import './index.css'

/**
 * NM MART - HIDDEN GATEWAY SYSTEM
 * यह यूआरएल आप अपने क्लाइंट्स को देंगे।
 * आप "secure-client-login" को कुछ भी बदल सकते हैं।
 */
const SECRET_CLIENT_PATH = "nm-mart";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GlobalProvider>
        <BrowserRouter>
          <Routes>
            {/* सार्वजनिक लैंडिंग पेज - कोई लॉगिन बटन नहीं */}
            <Route path="/" element={<LandingPage />} />

            {/* केवल गुप्त लिंक से ही एडमिन/क्लाइंट लॉगिन खुलेगा */}
            <Route path={`/${SECRET_CLIENT_PATH}/*`} element={<App />} />

            {/* अन्य सभी रास्तों को होम पेज पर भेजें */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </GlobalProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
