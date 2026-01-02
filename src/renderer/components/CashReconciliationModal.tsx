import React, { useState } from 'react';
import { Modal, Button, Input } from '../components';
import { DollarSign, Calculator } from 'lucide-react';

interface CashReconciliationProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  openingCash: number;
  expectedCash: number;
  onSubmit: (closingCash: number, variance: number) => Promise<void>;
}

interface Denomination {
  value: number;
  count: number;
}

export const CashReconciliationModal: React.FC<CashReconciliationProps> = ({
  isOpen,
  onClose,
  sessionId: _sessionId,
  openingCash,
  expectedCash,
  onSubmit,
}) => {
  const [denominations, setDenominations] = useState<Denomination[]>([
    { value: 1000, count: 0 },
    { value: 500, count: 0 },
    { value: 200, count: 0 },
    { value: 100, count: 0 },
    { value: 50, count: 0 },
    { value: 20, count: 0 },
    { value: 10, count: 0 },
    { value: 5, count: 0 },
  ]);
  
  const [manualEntry, setManualEntry] = useState('');
  const [useManual, setUseManual] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculatedTotal = denominations.reduce((sum, d) => sum + (d.value * d.count), 0);
  const actualClosing = useManual ? parseFloat(manualEntry) || 0 : calculatedTotal;
  const variance = actualClosing - expectedCash;

  const updateCount = (index: number, count: number) => {
    const newDenoms = [...denominations];
    newDenoms[index].count = Math.max(0, count);
    setDenominations(newDenoms);
  };

  const handleSubmit = async () => {
    if (actualClosing === 0) {
      alert('Please count cash or enter manual amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(actualClosing, variance);
      onClose();
    } catch (error) {
      console.error('Failed to close session:', error);
      alert('Failed to close session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cash Reconciliation" size="lg">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Opening Cash</p>
            <p className="text-lg font-semibold">{formatCurrency(openingCash)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Expected Cash</p>
            <p className="text-lg font-semibold">{formatCurrency(expectedCash)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Variance</p>
            <p className={`text-lg font-semibold ${variance === 0 ? 'text-pos-success' : variance > 0 ? 'text-pos-info' : 'text-pos-danger'}`}>
              {formatCurrency(Math.abs(variance))} {variance > 0 ? 'Over' : variance < 0 ? 'Short' : ''}
            </p>
          </div>
        </div>

        {/* Method Toggle */}
        <div className="flex gap-2">
          <Button
            variant={!useManual ? 'primary' : 'secondary'}
            onClick={() => setUseManual(false)}
            icon={Calculator}
            size="sm"
          >
            Count Denominations
          </Button>
          <Button
            variant={useManual ? 'primary' : 'secondary'}
            onClick={() => setUseManual(true)}
            icon={DollarSign}
            size="sm"
          >
            Manual Entry
          </Button>
        </div>

        {/* Denomination Counter */}
        {!useManual && (
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Count Cash by Denomination</h3>
            <div className="grid grid-cols-2 gap-3">
              {denominations.map((denom, index) => (
                <div key={denom.value} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{formatCurrency(denom.value)}</p>
                    <p className="text-xs text-gray-500">x {denom.count} = {formatCurrency(denom.value * denom.count)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateCount(index, denom.count - 1)}
                      className="w-8 h-8 flex items-center justify-center border rounded hover:bg-gray-100"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={denom.count}
                      onChange={(e) => updateCount(index, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 text-center border rounded"
                      min="0"
                    />
                    <button
                      onClick={() => updateCount(index, denom.count + 1)}
                      className="w-8 h-8 flex items-center justify-center border rounded hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-kutunza-burgundy text-white rounded-lg flex justify-between items-center">
              <span className="font-medium">Total Counted:</span>
              <span className="text-2xl font-bold">{formatCurrency(calculatedTotal)}</span>
            </div>
          </div>
        )}

        {/* Manual Entry */}
        {useManual && (
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Enter Total Cash Amount</h3>
            <Input
              type="number"
              value={manualEntry}
              onChange={(e) => setManualEntry(e.target.value)}
              placeholder="Enter closing cash amount"
              icon={DollarSign}
              fullWidth
            />
            {parseFloat(manualEntry) > 0 && (
              <div className="p-4 bg-kutunza-burgundy text-white rounded-lg flex justify-between items-center">
                <span className="font-medium">Closing Cash:</span>
                <span className="text-2xl font-bold">{formatCurrency(parseFloat(manualEntry) || 0)}</span>
              </div>
            )}
          </div>
        )}

        {/* Variance Alert */}
        {Math.abs(variance) > 0 && actualClosing > 0 && (
          <div className={`p-4 rounded-lg ${Math.abs(variance) > 100 ? 'bg-pos-danger/10 border border-pos-danger' : 'bg-pos-warning/10 border border-pos-warning'}`}>
            <p className="font-medium">
              {variance > 0 ? '💰 Cash Over' : '⚠️ Cash Short'}
            </p>
            <p className="text-sm mt-1">
              The counted cash is {formatCurrency(Math.abs(variance))} {variance > 0 ? 'more' : 'less'} than expected.
              {Math.abs(variance) > 100 && ' Please recount and verify.'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button
            variant={Math.abs(variance) > 100 ? 'danger' : 'success'}
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={actualClosing === 0}
            fullWidth
          >
            {Math.abs(variance) > 100 ? 'Close with Variance' : 'Close Session'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
