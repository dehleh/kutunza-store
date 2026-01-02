import React, { useState } from 'react';
import { Modal, Button } from './index';
import { CreditCard, Banknote, ArrowRightLeft, Trash2, Plus } from 'lucide-react';

interface Payment {
  id: string;
  method: 'cash' | 'card' | 'transfer';
  amount: number;
}

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onSubmit: (payments: Payment[]) => Promise<void>;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  onSubmit,
}) => {
  const [payments, setPayments] = useState<Payment[]>([
    { id: '1', method: 'cash', amount: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalAmount - totalPaid;
  const overpaid = totalPaid > totalAmount;

  const addPayment = () => {
    const newPayment: Payment = {
      id: Date.now().toString(),
      method: 'cash',
      amount: Math.max(0, remaining),
    };
    setPayments([...payments, newPayment]);
  };

  const removePayment = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter(p => p.id !== id));
    }
  };

  const updatePayment = (id: string, field: keyof Payment, value: any) => {
    setPayments(payments.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleSubmit = async () => {
    if (remaining > 0.01) {
      alert('Payment incomplete. Please enter full amount.');
      return;
    }

    if (overpaid) {
      alert('Total payment exceeds amount due.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payments.filter(p => p.amount > 0));
      onClose();
    } catch (error) {
      console.error('Split payment failed:', error);
      alert('Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: Banknote },
    { value: 'card', label: 'Card', icon: CreditCard },
    { value: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Split Payment" size="md">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Total Due</p>
            <p className="text-lg font-semibold">{formatCurrency(totalAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Paid</p>
            <p className={`text-lg font-semibold ${totalPaid >= totalAmount ? 'text-pos-success' : 'text-orange-600'}`}>
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Remaining</p>
            <p className={`text-lg font-semibold ${remaining <= 0 ? 'text-pos-success' : 'text-pos-danger'}`}>
              {formatCurrency(Math.max(0, remaining))}
            </p>
          </div>
        </div>

        {/* Payment Entries */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">Payment Methods</h3>
            <Button
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={addPayment}
              disabled={payments.length >= 5}
            >
              Add Payment
            </Button>
          </div>

          {payments.map((payment, index) => (
            <div key={payment.id} className="flex items-start gap-3 p-4 border rounded-lg bg-white">
              <div className="flex-1 space-y-3">
                {/* Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Method {index + 1}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.value}
                          onClick={() => updatePayment(payment.id, 'method', method.value)}
                          className={`
                            flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all
                            ${payment.method === method.value
                              ? 'border-kutunza-burgundy bg-kutunza-burgundy/5'
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <Icon size={20} />
                          <span className="text-xs font-medium">{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={payment.amount || ''}
                    onChange={(e) => updatePayment(payment.id, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-kutunza-burgundy"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              {payments.length > 1 && (
                <button
                  onClick={() => removePayment(payment.id)}
                  className="p-2 text-pos-danger hover:bg-pos-danger/10 rounded-lg transition-colors mt-8"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Validation Message */}
        {remaining > 0.01 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
            ⚠️ Please enter payment for remaining {formatCurrency(remaining)}
          </div>
        )}

        {overpaid && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            ⚠️ Total payment exceeds amount due by {formatCurrency(totalPaid - totalAmount)}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={remaining > 0.01 || overpaid}
            fullWidth
          >
            Complete Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
};
