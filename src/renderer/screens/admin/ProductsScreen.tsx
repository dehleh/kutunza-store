import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Search, Edit2, Trash2, Package,
  X, Save, BarcodeScan
} from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category_id: string;
  category_name: string;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  track_stock: number;
  stock_quantity: number;
  low_stock_alert: number;
  unit: string;
  is_active: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const ProductsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    categoryId: '',
    costPrice: '',
    sellingPrice: '',
    taxRate: '0',
    trackStock: true,
    stockQuantity: '0',
    lowStockAlert: '10',
    unit: 'pcs',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        window.api.products.getAll(),
        window.api.categories.getAll(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSKU = () => {
    const category = categories.find(c => c.id === formData.categoryId);
    const prefix = category ? category.name.substring(0, 3).toUpperCase() : 'GEN';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setFormData(prev => ({ ...prev, sku: `KG-${prefix}-${random}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.sellingPrice || !formData.categoryId) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const productData = {
        sku: formData.sku || `KG-${Date.now()}`,
        barcode: formData.barcode || null,
        name: formData.name,
        description: formData.description || null,
        categoryId: formData.categoryId,
        costPrice: parseFloat(formData.costPrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice),
        taxRate: parseFloat(formData.taxRate) || 0,
        trackStock: formData.trackStock,
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        lowStockAlert: parseInt(formData.lowStockAlert) || 10,
        unit: formData.unit,
      };

      if (editingProduct) {
        await window.api.products.update(editingProduct.id, productData);
        toast.success('Product updated successfully');
      } else {
        await window.api.products.create(productData);
        toast.success('Product created successfully');
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error('Failed to save product');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      barcode: product.barcode || '',
      name: product.name,
      description: product.description || '',
      categoryId: product.category_id,
      costPrice: product.cost_price.toString(),
      sellingPrice: product.selling_price.toString(),
      taxRate: product.tax_rate.toString(),
      trackStock: !!product.track_stock,
      stockQuantity: product.stock_quantity.toString(),
      lowStockAlert: product.low_stock_alert.toString(),
      unit: product.unit,
    });
    setShowModal(true);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"?`)) return;

    try {
      await window.api.products.delete(product.id);
      toast.success('Product deleted');
      loadData();
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      barcode: '',
      name: '',
      description: '',
      categoryId: '',
      costPrice: '',
      sellingPrice: '',
      taxRate: '0',
      trackStock: true,
      stockQuantity: '0',
      lowStockAlert: '10',
      unit: 'pcs',
    });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
              <h1 className="text-2xl font-display font-bold">Products</h1>
              <p className="text-sm text-kutunza-gold">{products.length} products</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-kutunza-gold text-kutunza-dark px-4 py-2 rounded-lg font-medium hover:bg-yellow-400"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="p-6 bg-white border-b">
        <div className="flex gap-4">
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
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl min-w-[200px]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products List */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-kutunza-burgundy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p>No products found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">Product</th>
                  <th className="text-left p-4 font-medium text-gray-600">SKU</th>
                  <th className="text-left p-4 font-medium text-gray-600">Category</th>
                  <th className="text-right p-4 font-medium text-gray-600">Cost</th>
                  <th className="text-right p-4 font-medium text-gray-600">Price</th>
                  <th className="text-right p-4 font-medium text-gray-600">Stock</th>
                  <th className="text-center p-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg">🍽️</span>
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.barcode && (
                            <p className="text-xs text-gray-400">{product.barcode}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{product.sku}</td>
                    <td className="p-4">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${categories.find(c => c.id === product.category_id)?.color}20`,
                          color: categories.find(c => c.id === product.category_id)?.color 
                        }}
                      >
                        {product.category_name}
                      </span>
                    </td>
                    <td className="p-4 text-right text-gray-600">{formatCurrency(product.cost_price)}</td>
                    <td className="p-4 text-right font-medium text-kutunza-burgundy">
                      {formatCurrency(product.selling_price)}
                    </td>
                    <td className="p-4 text-right">
                      {product.track_stock ? (
                        <span className={`font-medium ${
                          product.stock_quantity <= product.low_stock_alert ? 'text-red-500' : 'text-gray-600'
                        }`}>
                          {product.stock_quantity} {product.unit}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingProduct ? 'Edit Product' : 'New Product'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      className="flex-1 pos-input"
                      placeholder="Auto-generated"
                    />
                    <button
                      type="button"
                      onClick={generateSKU}
                      className="pos-btn-secondary"
                    >
                      Generate
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barcode
                  </label>
                  <div className="relative">
                    <BarcodeScan className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                      className="pos-input pl-10"
                      placeholder="Scan or enter barcode"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="pos-input"
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="pos-input"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="pos-input"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Price (₦)
                  </label>
                  <input
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                    className="pos-input"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price (₦) *
                  </label>
                  <input
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, sellingPrice: e.target.value }))}
                    className="pos-input"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={formData.taxRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxRate: e.target.value }))}
                    className="pos-input"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.trackStock}
                    onChange={(e) => setFormData(prev => ({ ...prev, trackStock: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-kutunza-burgundy focus:ring-kutunza-burgundy"
                  />
                  <span className="font-medium">Track Stock</span>
                </label>

                {formData.trackStock && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Initial Stock
                      </label>
                      <input
                        type="number"
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: e.target.value }))}
                        className="pos-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Low Stock Alert
                      </label>
                      <input
                        type="number"
                        value={formData.lowStockAlert}
                        onChange={(e) => setFormData(prev => ({ ...prev, lowStockAlert: e.target.value }))}
                        className="pos-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                        className="pos-input"
                      >
                        <option value="pcs">Pieces</option>
                        <option value="kg">Kilograms</option>
                        <option value="g">Grams</option>
                        <option value="L">Liters</option>
                        <option value="ml">Milliliters</option>
                        <option value="box">Box</option>
                        <option value="pack">Pack</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 pos-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 pos-btn-primary flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsScreen;
