import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from './index';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProductModifier } from '@shared/types';

interface ProductModifiersManagerProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductModifiersManager: React.FC<ProductModifiersManagerProps> = ({
  productId,
  productName,
  isOpen,
  onClose,
}) => {
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingModifier, setEditingModifier] = useState<ProductModifier | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    priceAdjustment: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadModifiers();
    }
  }, [isOpen, productId]);

  const loadModifiers = async () => {
    setIsLoading(true);
    try {
      const data = await window.api.modifiers.getByProduct(productId);
      setModifiers(data);
    } catch (error) {
      console.error('Failed to load modifiers:', error);
      toast.error('Failed to load modifiers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter modifier name');
      return;
    }

    try {
      if (editingModifier) {
        await window.api.modifiers.update(editingModifier.id, {
          name: formData.name,
          priceAdjustment: parseFloat(formData.priceAdjustment) || 0,
        });
        toast.success('Modifier updated');
      } else {
        await window.api.modifiers.create({
          productId,
          name: formData.name,
          priceAdjustment: parseFloat(formData.priceAdjustment) || 0,
        });
        toast.success('Modifier added');
      }

      setShowForm(false);
      setEditingModifier(null);
      setFormData({ name: '', priceAdjustment: '' });
      loadModifiers();
    } catch (error) {
      console.error('Failed to save modifier:', error);
      toast.error('Failed to save modifier');
    }
  };

  const handleEdit = (modifier: ProductModifier) => {
    setEditingModifier(modifier);
    setFormData({
      name: modifier.name,
      priceAdjustment: modifier.priceAdjustment.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this modifier?')) {
      return;
    }

    try {
      await window.api.modifiers.delete(id);
      toast.success('Modifier deleted');
      loadModifiers();
    } catch (error) {
      console.error('Failed to delete modifier:', error);
      toast.error('Failed to delete modifier');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingModifier(null);
    setFormData({ name: '', priceAdjustment: '' });
  };

  const formatCurrency = (amount: number) =>
    `₦${Math.abs(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Modifiers - ${productName}`} size="md">
      <div className="space-y-4">
        {/* Add Button */}
        {!showForm && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setShowForm(true)}
            fullWidth
          >
            Add Modifier
          </Button>
        )}

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium">{editingModifier ? 'Edit' : 'New'} Modifier</h4>
            
            <Input
              label="Modifier Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Extra Spicy, Large Size"
              required
              fullWidth
            />

            <Input
              label="Price Adjustment"
              type="number"
              step="0.01"
              value={formData.priceAdjustment}
              onChange={(e) => setFormData({ ...formData, priceAdjustment: e.target.value })}
              placeholder="0.00 (use negative for discount)"
              fullWidth
            />

            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={resetForm} fullWidth>
                Cancel
              </Button>
              <Button type="submit" variant="success" fullWidth>
                {editingModifier ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>
        )}

        {/* Modifiers List */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">
            Modifiers ({modifiers.length})
          </h4>

          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Loading...</p>
          ) : modifiers.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No modifiers added yet
            </p>
          ) : (
            <div className="space-y-2">
              {modifiers.map((modifier) => (
                <div
                  key={modifier.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Tag size={20} className="text-gray-400" />
                    <div>
                      <p className="font-medium">{modifier.name}</p>
                      <p className={`text-sm ${modifier.priceAdjustment >= 0 ? 'text-pos-success' : 'text-orange-600'}`}>
                        {modifier.priceAdjustment >= 0 ? '+' : '-'}{formatCurrency(modifier.priceAdjustment)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(modifier)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(modifier.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
