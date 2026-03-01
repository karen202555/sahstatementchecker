import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import FeedbackButton from "@/components/feedback-kit/FeedbackButton";
import AppFooter from "@/components/AppFooter";
import Index from "./pages/Index";
import Results from "./pages/Results";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import SettingsPage from "./pages/Settings";
import Install from "./pages/Install";
import AdminFeedback from "./pages/AdminFeedback";
import ProductStatus from "./pages/ProductStatus";
import AdminFeatures from "./pages/AdminFeatures";
import AdminVersion from "./pages/AdminVersion";
import About from "./pages/About";
import Beta from "./pages/Beta";
import Features from "./pages/Features";
import MyFeedback from "./pages/MyFeedback";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <>
    <Routes>
      <Route path="/auth" element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>} />
      {/* Reset password must be public — user arrives from email link, not logged in */}
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/admin-feedback" element={<ProtectedRoute><AdminFeedback /></ProtectedRoute>} />
      <Route path="/product-status" element={<ProtectedRoute><ProductStatus /></ProtectedRoute>} />
      <Route path="/admin-features" element={<ProtectedRoute><AdminFeatures /></ProtectedRoute>} />
      <Route path="/admin-version" element={<ProtectedRoute><AdminVersion /></ProtectedRoute>} />
      {/* Results is accessible without auth (shared links) */}
      <Route path="/results" element={<Results />} />
      <Route path="/install" element={<Install />} />
      <Route path="/about" element={<About />} />
      <Route path="/beta" element={<Beta />} />
      <Route path="/features" element={<Features />} />
      <Route path="/my-feedback" element={<ProtectedRoute><MyFeedback /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <AppFooter />
    <FeedbackButton />
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
