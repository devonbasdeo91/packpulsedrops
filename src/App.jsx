import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { WalletProvider } from '@/components/WalletProvider';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import Shop from '@/pages/Shop';
import Collection from '@/pages/Collection';
import Rip from '@/pages/Rip';
import Marketplace from '@/pages/Marketplace';
import SalesDashboard from '@/pages/SalesDashboard';
import Wallet from '@/pages/Wallet';
import AdminCards from '@/pages/AdminCards';
import AdminDashboard from '@/pages/AdminDashboard';
import PullAnalytics from '@/pages/PullAnalytics';
import TradeAnalytics from '@/pages/TradeAnalytics';
import Assistant from '@/pages/Assistant';
import MyTrades from '@/pages/MyTrades';
import TradeHistoryPage from '@/pages/TradeHistoryPage';
import TransactionHistory from '@/pages/TransactionHistory';
import Leaderboard from '@/pages/Leaderboard';
import Friends from '@/pages/Friends';
import Chat from '@/pages/Chat';
import PriceReview from '@/pages/PriceReview';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import OAuthConsent from '@/pages/OAuthConsent';
import Connect from '@/pages/Connect';
import Account from '@/pages/Account';
import Profile from '@/pages/Profile';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import Refund from '@/pages/Refund';
import AdminRoute from '@/components/AdminRoute';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import WelcomeMusic from '@/components/WelcomeMusic';
import CategoryScreenshotTemplate from '@/components/CategoryScreenshotTemplate';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // For a public app, never force-redirect to login — let guests browse
    // freely. Individual buy/sell/trade/withdraw actions check auth themselves.
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* All pages accessible without login — auth only needed for transactions */}
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rip/:id" element={<Rip />} />
        <Route path="/sales-dashboard" element={<SalesDashboard />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/trades" element={<MyTrades />} />
        <Route path="/trade-history" element={<TradeHistoryPage />} />
        <Route path="/transactions" element={<TransactionHistory />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/chat/:friendId" element={<Chat />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/price-review" element={<PriceReview />} />
        <Route path="/account" element={<Account />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin/cards" element={<AdminCards />} />
          <Route path="/admin/analytics" element={<AdminDashboard />} />
          <Route path="/admin/pull-analytics" element={<PullAnalytics />} />
          <Route path="/admin/trade-analytics" element={<TradeAnalytics />} />
          <Route path="/admin/assistant" element={<Assistant />} />
        </Route>
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/refund" element={<Refund />} />
      <Route path="/template/categories" element={<CategoryScreenshotTemplate />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <ErrorBoundary>
            <WalletProvider>
              <AuthenticatedApp />
              <WelcomeMusic />
            </WalletProvider>
          </ErrorBoundary>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App