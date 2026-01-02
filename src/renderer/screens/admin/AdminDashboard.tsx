import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Settings, ArrowLeft,
  TrendingUp, DollarSign, ShoppingCart, AlertTriangle, Clock,
  BarChart3, PieChart
} from 'lucide-react';

interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  averageSale: number;
  topProducts: { product_name: string; total_quantity: number; total_revenue: number }[];
  lowStockCount: number;
  hourlyData: { hour: string; transactions: number; sales: number }[];
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      const todayStr = new Date().toISOString().split('T')[0];

      const [summary, topProducts, lowStock, hourly] = await Promise.all([
        window.api.reports.salesSummary(startOfDay, endOfDay),
        window.api.reports.topProducts(startOfDay, endOfDay, 5),
        window.api.stock.getLowStock(),
        window.api.reports.hourlyBreakdown(todayStr),
      ]);

      setStats({
        todaySales: summary?.total_sales || 0,
        todayTransactions: summary?.total_transactions || 0,
        averageSale: summary?.average_sale || 0,
        topProducts: topProducts || [],
        lowStockCount: lowStock?.length || 0,
        hourlyData: hourly || [],
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    `₦${(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const menuItems = [
    { icon: Package, label: 'Products', path: '/admin/products', color: 'bg-blue-500' },
    { icon: ShoppingBag, label: 'Inventory', path: '/admin/inventory', color: 'bg-green-500' },
    { icon: BarChart3, label: 'Sales Reports', path: '/admin/sales', color: 'bg-purple-500' },
    { icon: Users, label: 'Users', path: '/admin/users', color: 'bg-orange-500' },
    { icon: Settings, label: 'Settings', path: '/admin/settings', color: 'bg-gray-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-kutunza-burgundy text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/pos')}
              className="p-2 hover:bg-white/10 rounded-lg"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold">Back Office</h1>
              <p className="text-sm text-kutunza-gold">Welcome, {user?.firstName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LayoutDashboard size={24} />
            <span className="font-medium">Dashboard</span>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="pos-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Today's Sales</p>
                <p className="text-2xl font-bold text-kutunza-burgundy">
                  {isLoading ? '...' : formatCurrency(stats?.todaySales || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="pos-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Transactions</p>
                <p className="text-2xl font-bold text-kutunza-burgundy">
                  {isLoading ? '...' : stats?.todayTransactions || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="pos-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Average Sale</p>
                <p className="text-2xl font-bold text-kutunza-burgundy">
                  {isLoading ? '...' : formatCurrency(stats?.averageSale || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="text-purple-600" size={24} />
              </div>
            </div>
          </div>

          <div className="pos-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Low Stock Items</p>
                <p className="text-2xl font-bold text-kutunza-burgundy">
                  {isLoading ? '...' : stats?.lowStockCount || 0}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                (stats?.lowStockCount || 0) > 0 ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <AlertTriangle className={
                  (stats?.lowStockCount || 0) > 0 ? 'text-red-600' : 'text-gray-400'
                } size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Navigation */}
          <div className="lg:col-span-1">
            <div className="pos-card p-6">
              <h2 className="text-lg font-bold mb-4">Quick Access</h2>
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center`}>
                      <item.icon size={20} className="text-white" />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="lg:col-span-1">
            <div className="pos-card p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Top Products Today</h2>
                <PieChart size={20} className="text-gray-400" />
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 border-4 border-kutunza-burgundy border-t-transparent rounded-full animate-spin" />
                </div>
              ) : stats?.topProducts.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <ShoppingBag size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No sales yet today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats?.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? 'bg-kutunza-gold text-kutunza-dark' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.product_name}</p>
                        <p className="text-sm text-gray-500">{product.total_quantity} sold</p>
                      </div>
                      <p className="font-bold text-kutunza-burgundy">
                        {formatCurrency(product.total_revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hourly Sales */}
          <div className="lg:col-span-1">
            <div className="pos-card p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Hourly Breakdown</h2>
                <Clock size={20} className="text-gray-400" />
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 border-4 border-kutunza-burgundy border-t-transparent rounded-full animate-spin" />
                </div>
              ) : stats?.hourlyData.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <Clock size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No data yet today</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats?.hourlyData.map((hour, index) => {
                    const maxSales = Math.max(...(stats?.hourlyData.map(h => h.sales) || [1]));
                    const percentage = (hour.sales / maxSales) * 100;
                    
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 w-12">
                          {hour.hour}:00
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full bg-kutunza-burgundy rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(percentage, 10)}%` }}
                          >
                            <span className="text-xs text-white font-medium">
                              {hour.transactions}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-medium w-24 text-right">
                          {formatCurrency(hour.sales)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
