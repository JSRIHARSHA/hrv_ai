import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { OrderProvider } from './contexts/OrderContext';
import { FreightHandlerProvider } from './contexts/FreightHandlerContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrderSummaryPage from './pages/OrderSummaryPage';
import SupplierMasterDataPage from './pages/SupplierMasterDataPage';
import ProductMasterDataPage from './pages/ProductMasterDataPage';
import OrdersPage from './pages/OrdersPage';
import FreightHandlersPage from './pages/FreightHandlersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProtectedRoute from './components/ProtectedRoute';
import { syncDataWithNotification } from './utils/syncDataToSupabase';

function App() {
  // Expose sync function globally for console access
  useEffect(() => {
    (window as any).syncDataToSupabase = syncDataWithNotification;
    console.log('💡 Tip: Run syncDataToSupabase() in the console to sync all data to Supabase');
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <OrderProvider>
          <FreightHandlerProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order/:orderId"
              element={
                <ProtectedRoute>
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order-summary/:orderId"
              element={
                <ProtectedRoute>
                  <OrderSummaryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <SupplierMasterDataPage />
                </ProtectedRoute>
              }
            />
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <ProductMasterDataPage />
                  </ProtectedRoute>
                }
              />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
              <Route
                path="/freight-handlers"
                element={
                  <ProtectedRoute>
                    <FreightHandlersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </FreightHandlerProvider>
        </OrderProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
