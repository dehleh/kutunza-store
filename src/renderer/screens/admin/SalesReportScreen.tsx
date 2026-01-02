import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Calendar, Download, TrendingUp, DollarSign,
  ShoppingCart, CreditCard, Banknote, ArrowRightLeft, Eye, X
} from 'lucide-react';

interface Sale {
  id: string;
  receipt_no: string;
  cashier_name: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  items?: any[];
}

interface SalesSummary {
  total_transactions: number;
  total_sales: number;
  total_tax: number;
  total_discounts: number;
  average_sale: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
}

const SalesReportScreen: React.FC = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    loadSalesData();
  }, [dateRange]);

  const loadSalesData = async () => {
    setIsLoading(true);
    try {
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);

      const [salesData, summaryData] = await Promise.all([
        window.api.sales.getByDateRange(startDate.toISOString(), endDate.toISOString()),
        window.api.reports.salesSummary(startDate.toISOString(), endDate.toISOString()),
      ]);

      setSales(salesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load sales data:', error);
      toast.error('Failed to load sales data');
    } finally {
      setIsLoading(false);
    }
  };

  const viewSaleDetails = async (sale: Sale) => {
    try {
      const fullSale = await window.api.sales.getById(sale.id);
      setSelectedSale(fullSale);
    } catch (error) {
      console.error('Failed to load sale details:', error);
      toast.error('Failed to load sale details');
    }
  };

  const setQuickDate = (range: 'today' | 'week' | 'month') => {
    const today = new Date();
    let start = new Date();

    if (range === 'today') {
      start = today;
    } else if (range === 'week') {
      start.setDate(today.getDate() - 7);
    } else if (range === 'month') {
      start.setMonth(today.getMonth() - 1);
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    });
  };

  const formatCurrency = (amount: number) =>
    `₦${(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote size={16} className="text-green-500" />;
      case 'card': return <CreditCard size={16} className="text-blue-500" />;
      case 'transfer': return <ArrowRightLeft size={16} className="text-purple-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-kutunza-burgundy text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-white/10 rounded-lg"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold">Sales Reports</h1>
              <p className="text-sm text-kutunza-gold">Transaction History & Analytics</p>
            </div>
          </div>
        </div>
      </header>

      {/* Date Filters */}
      <div className="p-6 bg-white border-b">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="pos-input"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="pos-input"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setQuickDate('today')}
              className="pos-btn-secondary text-sm"
            >
              Today
            </button>
            <button
              onClick={() => setQuickDate('week')}
              className="pos-btn-secondary text-sm"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setQuickDate('month')}
              className="pos-btn-secondary text-sm"
            >
              Last 30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="pos-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Total Sales</span>
            <DollarSign className="text-green-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-kutunza-burgundy">
            {isLoading ? '...' : formatCurrency(summary?.total_sales || 0)}
          </p>
        </div>

        <div className="pos-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Transactions</span>
            <ShoppingCart className="text-blue-500" size={20} />
          </div>
          <p className="text-2xl font-bold">
            {isLoading ? '...' : summary?.total_transactions || 0}
          </p>
        </div>

        <div className="pos-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Average Sale</span>
            <TrendingUp className="text-purple-500" size={20} />
          </div>
          <p className="text-2xl font-bold">
            {isLoading ? '...' : formatCurrency(summary?.average_sale || 0)}
          </p>
        </div>

        <div className="pos-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Discounts Given</span>
            <span className="text-red-500 text-lg">%</span>
          </div>
          <p className="text-2xl font-bold text-red-500">
            {isLoading ? '...' : formatCurrency(summary?.total_discounts || 0)}
          </p>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="px-6 pb-4">
        <div className="pos-card p-6">
          <h3 className="font-bold mb-4">Payment Methods</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="text-green-500" size={20} />
                <span className="text-green-700">Cash</span>
              </div>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(summary?.cash_sales || 0)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="text-blue-500" size={20} />
                <span className="text-blue-700">Card</span>
              </div>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(summary?.card_sales || 0)}
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRightLeft className="text-purple-500" size={20} />
                <span className="text-purple-700">Transfer</span>
              </div>
              <p className="text-xl font-bold text-purple-700">
                {formatCurrency(summary?.transfer_sales || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="px-6 pb-6">
        <div className="pos-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-bold">Transactions</h3>
            <span className="text-gray-500 text-sm">{sales.length} records</span>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-10 h-10 border-4 border-kutunza-burgundy border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <ShoppingCart size={40} className="mx-auto mb-2 opacity-50" />
              <p>No sales in this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600">Receipt #</th>
                    <th className="text-left p-4 font-medium text-gray-600">Date & Time</th>
                    <th className="text-left p-4 font-medium text-gray-600">Cashier</th>
                    <th className="text-left p-4 font-medium text-gray-600">Payment</th>
                    <th className="text-right p-4 font-medium text-gray-600">Amount</th>
                    <th className="text-center p-4 font-medium text-gray-600">Status</th>
                    <th className="text-center p-4 font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-mono text-sm">{sale.receipt_no}</td>
                      <td className="p-4 text-gray-600 text-sm">{formatDate(sale.created_at)}</td>
                      <td className="p-4">{sale.cashier_name}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(sale.payment_method)}
                          <span className="capitalize">{sale.payment_method}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-kutunza-burgundy">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sale.status === 'completed' ? 'bg-green-100 text-green-700' :
                          sale.status === 'voided' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => viewSaleDetails(sale)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="View Details"
                        >
                          <Eye size={18} className="text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Receipt Details</h2>
                <p className="text-gray-500 font-mono">{selectedSale.receipt_no}</p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Date & Time</p>
                  <p className="font-medium">{formatDate(selectedSale.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Cashier</p>
                  <p className="font-medium">{selectedSale.cashier_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Payment Method</p>
                  <p className="font-medium capitalize">{selectedSale.payment_method}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedSale.status === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedSale.status}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedSale.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-gray-500">
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span className="text-kutunza-burgundy">{formatCurrency(selectedSale.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReportScreen;
