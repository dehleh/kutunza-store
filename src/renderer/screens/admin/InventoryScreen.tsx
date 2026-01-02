import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Search, Package, AlertTriangle, TrendingUp,
  TrendingDown, Plus, Minus, History, X
} from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  category_name: string;
  stock_quantity: number;
  low_stock_alert: number;
  unit: string;
  cost_price: number;
}

const InventoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'low'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allProducts, lowStock] = await Promise.all([
        window.api.products.getAll(),
        window.api.stock.getLowStock(),
      ]);
      setProducts(allProducts);
      setLowStockProducts(lowStock);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedProduct || !adjustmentQty || !adjustmentReason) {
      toast.error('Please fill in all fields');
      return;
    }

    const quantity = parseInt(adjustmentQty);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const finalQty = adjustmentType === 'add' ? quantity : -quantity;

    try {
      await window.api.stock.adjust(
        selectedProduct.id,
        finalQty,
        adjustmentReason,
        user!.id
      );
      
      toast.success(`Stock ${adjustmentType === 'add' ? 'added' : 'removed'} successfully`);
      setShowAdjustModal(false);
      resetAdjustmentForm();
      loadData();
    } catch (error) {
      console.error('Stock adjustment failed:', error);
      toast.error('Failed to adjust stock');
    }
  };

  const resetAdjustmentForm = () => {
    setSelectedProduct(null);
    setAdjustmentQty('');
    setAdjustmentReason('');
    setAdjustmentType('add');
  };

  const openAdjustModal = (product: Product, type: 'add' | 'remove') => {
    setSelectedProduct(product);
    setAdjustmentType(type);
    setShowAdjustModal(true);
  };

  const filteredProducts = (viewMode === 'low' ? lowStockProducts : products).filter(p =>
    !searchQuery ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStockValue = products.reduce(
    (sum, p) => sum + p.stock_quantity * p.cost_price, 0
  );

  const formatCurrency = (amount: number) =>
    `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

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
              <h1 className="text-2xl font-display font-bold">Inventory</h1>
              <p className="text-sm text-kutunza-gold">Stock Management</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="pos-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Products</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
            <Package className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="pos-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-500">{lowStockProducts.length}</p>
            </div>
            <AlertTriangle className="text-red-500" size={32} />
          </div>
        </div>
        <div className="pos-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Stock Value</p>
              <p className="text-2xl font-bold text-kutunza-burgundy">
                {formatCurrency(totalStockValue)}
              </p>
            </div>
            <TrendingUp className="text-green-500" size={32} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4">
        <div className="bg-white rounded-xl p-4 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl"
              placeholder="Search products..."
            />
          </div>
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'all' ? 'bg-white shadow text-kutunza-burgundy' : 'text-gray-500'
              }`}
            >
              All Products
            </button>
            <button
              onClick={() => setViewMode('low')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'low' ? 'bg-white shadow text-red-500' : 'text-gray-500'
              }`}
            >
              <AlertTriangle size={16} />
              Low Stock ({lowStockProducts.length})
            </button>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-kutunza-burgundy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center text-gray-400 py-12 bg-white rounded-xl">
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p>{viewMode === 'low' ? 'No low stock items' : 'No products found'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">Product</th>
                  <th className="text-left p-4 font-medium text-gray-600">SKU</th>
                  <th className="text-left p-4 font-medium text-gray-600">Category</th>
                  <th className="text-right p-4 font-medium text-gray-600">Stock</th>
                  <th className="text-right p-4 font-medium text-gray-600">Alert Level</th>
                  <th className="text-right p-4 font-medium text-gray-600">Value</th>
                  <th className="text-center p-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const isLow = product.stock_quantity <= product.low_stock_alert;
                  return (
                    <tr key={product.id} className={`border-b hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {isLow && (
                            <AlertTriangle className="text-red-500" size={18} />
                          )}
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{product.sku}</td>
                      <td className="p-4 text-gray-600">{product.category_name}</td>
                      <td className="p-4 text-right">
                        <span className={`font-bold ${isLow ? 'text-red-500' : 'text-gray-800'}`}>
                          {product.stock_quantity} {product.unit}
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-500">
                        {product.low_stock_alert} {product.unit}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency(product.stock_quantity * product.cost_price)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openAdjustModal(product, 'add')}
                            className="p-2 bg-green-100 hover:bg-green-200 rounded-lg text-green-600"
                            title="Add Stock"
                          >
                            <Plus size={18} />
                          </button>
                          <button
                            onClick={() => openAdjustModal(product, 'remove')}
                            className="p-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-600"
                            title="Remove Stock"
                          >
                            <Minus size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="border-b p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
              </h2>
              <button
                onClick={() => {
                  setShowAdjustModal(false);
                  resetAdjustmentForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-gray-500">
                  Current Stock: {selectedProduct.stock_quantity} {selectedProduct.unit}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  className="pos-input"
                  placeholder="Enter quantity"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="pos-input"
                >
                  <option value="">Select reason</option>
                  {adjustmentType === 'add' ? (
                    <>
                      <option value="Purchase/Restock">Purchase/Restock</option>
                      <option value="Return from customer">Return from customer</option>
                      <option value="Inventory correction">Inventory correction</option>
                      <option value="Transfer in">Transfer in</option>
                    </>
                  ) : (
                    <>
                      <option value="Damaged/Expired">Damaged/Expired</option>
                      <option value="Theft/Loss">Theft/Loss</option>
                      <option value="Inventory correction">Inventory correction</option>
                      <option value="Transfer out">Transfer out</option>
                      <option value="Internal use">Internal use</option>
                    </>
                  )}
                </select>
              </div>

              {adjustmentQty && (
                <div className={`rounded-xl p-4 ${adjustmentType === 'add' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-sm text-gray-600">New Stock Level:</p>
                  <p className={`text-2xl font-bold ${adjustmentType === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                    {adjustmentType === 'add'
                      ? selectedProduct.stock_quantity + parseInt(adjustmentQty || '0')
                      : Math.max(0, selectedProduct.stock_quantity - parseInt(adjustmentQty || '0'))
                    } {selectedProduct.unit}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAdjustModal(false);
                    resetAdjustmentForm();
                  }}
                  className="flex-1 pos-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustStock}
                  className={`flex-1 pos-btn flex items-center justify-center gap-2 text-white ${
                    adjustmentType === 'add' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {adjustmentType === 'add' ? <Plus size={18} /> : <Minus size={18} />}
                  {adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryScreen;
