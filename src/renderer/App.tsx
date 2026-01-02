import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Screens
import LoginScreen from './screens/LoginScreen';
import POSScreen from './screens/POSScreen';
import CustomerDisplayScreen from './screens/CustomerDisplayScreen';
import AdminDashboard from './screens/admin/AdminDashboard';
import ProductsScreen from './screens/admin/ProductsScreen';
import InventoryScreen from './screens/admin/InventoryScreen';
import SalesReportScreen from './screens/admin/SalesReportScreen';
import SettingsScreen from './screens/admin/SettingsScreen';
import UsersScreen from './screens/admin/UsersScreen';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin' && user?.role !== 'manager') {
    return <Navigate to="/pos" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/customer-display" element={<CustomerDisplayScreen />} />

      {/* POS Screen */}
      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <POSScreen />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute adminOnly>
            <ProductsScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/inventory"
        element={
          <ProtectedRoute adminOnly>
            <InventoryScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/sales"
        element={
          <ProtectedRoute adminOnly>
            <SalesReportScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute adminOnly>
            <UsersScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute adminOnly>
            <SettingsScreen />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
