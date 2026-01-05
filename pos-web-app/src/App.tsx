import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Screens
import LoginScreen from './screens/LoginScreen';
import POSScreen from './screens/POSScreen';
import AdminDashboard from './screens/admin/AdminDashboard';
import InventoryScreen from './screens/admin/InventoryScreen';
import ProductsScreen from './screens/admin/ProductsScreen';
import SalesReportScreen from './screens/admin/SalesReportScreen';
import SettingsScreen from './screens/admin/SettingsScreen';
import UsersScreen from './screens/admin/UsersScreen';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user.role !== 'admin' && user.role !== 'manager') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <POSScreen />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
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
          path="/admin/products" 
          element={
            <ProtectedRoute adminOnly>
              <ProductsScreen />
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
      </Routes>
    </BrowserRouter>
  );
}
