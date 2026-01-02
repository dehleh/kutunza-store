import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, Building2, Printer, Cloud, Palette,
  DollarSign, Database, Upload, Download, RefreshCw
} from 'lucide-react';

interface Settings {
  [key: string]: string;
}

const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('business');

  useEffect(() => {
    loadSettings();
    loadSyncStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const allSettings = await window.api.settings.getAll();
      const settingsMap: Settings = {};
      allSettings.forEach((s: any) => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const status = await window.api.sync.status();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await window.api.settings.set(key, value);
      }
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const path = await window.api.app.selectDirectory();
      if (path) {
        await window.api.app.exportData(path);
        toast.success('Data exported successfully');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
  };

  const handleSyncNow = async () => {
    try {
      const result = await window.api.sync.now();
      if (result.success) {
        toast.success(`Synced ${result.synced} items`);
      } else {
        toast.error('Sync failed');
      }
      loadSyncStatus();
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Sync failed');
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'hardware', label: 'Hardware', icon: Printer },
    { id: 'tax', label: 'Tax & Currency', icon: DollarSign },
    { id: 'sync', label: 'Cloud Sync', icon: Cloud },
    { id: 'data', label: 'Data', icon: Database },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-kutunza-burgundy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
              <h1 className="text-2xl font-display font-bold">Settings</h1>
              <p className="text-sm text-kutunza-gold">System Configuration</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-kutunza-gold text-kutunza-dark px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-kutunza-dark border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            Save Changes
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-[calc(100vh-72px)] p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-kutunza-burgundy text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {activeTab === 'business' && (
            <div className="pos-card p-6 space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Building2 size={20} />
                Business Information
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={settings.businessName || ''}
                  onChange={(e) => updateSetting('businessName', e.target.value)}
                  className="pos-input"
                  placeholder="Your business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={settings.businessAddress || ''}
                  onChange={(e) => updateSetting('businessAddress', e.target.value)}
                  className="pos-input"
                  rows={2}
                  placeholder="Business address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={settings.businessPhone || ''}
                  onChange={(e) => updateSetting('businessPhone', e.target.value)}
                  className="pos-input"
                  placeholder="+234..."
                />
              </div>
            </div>
          )}

          {activeTab === 'hardware' && (
            <div className="pos-card p-6 space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Printer size={20} />
                Hardware Settings
              </h2>

              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.printReceipt === 'true'}
                    onChange={(e) => updateSetting('printReceipt', e.target.checked ? 'true' : 'false')}
                    className="w-5 h-5 rounded border-gray-300 text-kutunza-burgundy focus:ring-kutunza-burgundy"
                  />
                  <div>
                    <span className="font-medium">Auto-print Receipt</span>
                    <p className="text-sm text-gray-500">Automatically print receipt after each sale</p>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.openDrawerOnSale === 'true'}
                    onChange={(e) => updateSetting('openDrawerOnSale', e.target.checked ? 'true' : 'false')}
                    className="w-5 h-5 rounded border-gray-300 text-kutunza-burgundy focus:ring-kutunza-burgundy"
                  />
                  <div>
                    <span className="font-medium">Open Cash Drawer on Sale</span>
                    <p className="text-sm text-gray-500">Automatically open cash drawer after cash sales</p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt Printer Port
                </label>
                <input
                  type="text"
                  value={settings.receiptPrinterPort || ''}
                  onChange={(e) => updateSetting('receiptPrinterPort', e.target.value)}
                  className="pos-input"
                  placeholder="e.g., USB001, COM1, or IP address"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank for auto-detection
                </p>
              </div>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="pos-card p-6 space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <DollarSign size={20} />
                Tax & Currency Settings
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={settings.currency || 'NGN'}
                    onChange={(e) => updateSetting('currency', e.target.value)}
                    className="pos-input"
                  >
                    <option value="NGN">Nigerian Naira (NGN)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="GBP">British Pound (GBP)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={settings.currencySymbol || '₦'}
                    onChange={(e) => updateSetting('currencySymbol', e.target.value)}
                    className="pos-input"
                    maxLength={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.taxEnabled === 'true'}
                    onChange={(e) => updateSetting('taxEnabled', e.target.checked ? 'true' : 'false')}
                    className="w-5 h-5 rounded border-gray-300 text-kutunza-burgundy focus:ring-kutunza-burgundy"
                  />
                  <div>
                    <span className="font-medium">Enable Tax</span>
                    <p className="text-sm text-gray-500">Apply tax to sales</p>
                  </div>
                </label>

                {settings.taxEnabled === 'true' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      value={settings.taxRate || '7.5'}
                      onChange={(e) => updateSetting('taxRate', e.target.value)}
                      className="pos-input"
                      step="0.1"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="pos-card p-6 space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Cloud size={20} />
                Cloud Sync Settings
              </h2>

              {/* Sync Status */}
              {syncStatus && (
                <div className={`rounded-xl p-4 ${
                  syncStatus.isOnline ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        syncStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium">
                        {syncStatus.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {syncStatus.pendingCount} pending items
                    </div>
                  </div>
                  {syncStatus.lastSyncTime && (
                    <p className="text-sm text-gray-500 mt-2">
                      Last sync: {new Date(syncStatus.lastSyncTime).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.cloudSyncEnabled === 'true'}
                    onChange={(e) => updateSetting('cloudSyncEnabled', e.target.checked ? 'true' : 'false')}
                    className="w-5 h-5 rounded border-gray-300 text-kutunza-burgundy focus:ring-kutunza-burgundy"
                  />
                  <div>
                    <span className="font-medium">Enable Cloud Sync</span>
                    <p className="text-sm text-gray-500">Sync data with cloud server when online</p>
                  </div>
                </label>

                {settings.cloudSyncEnabled === 'true' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sync Server URL
                      </label>
                      <input
                        type="url"
                        value={settings.cloudSyncUrl || ''}
                        onChange={(e) => updateSetting('cloudSyncUrl', e.target.value)}
                        className="pos-input"
                        placeholder="https://your-server.railway.app"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Auto-sync Interval (seconds)
                      </label>
                      <input
                        type="number"
                        value={settings.autoSyncInterval || '300'}
                        onChange={(e) => updateSetting('autoSyncInterval', e.target.value)}
                        className="pos-input"
                        min="60"
                      />
                    </div>

                    <button
                      onClick={handleSyncNow}
                      className="pos-btn-secondary flex items-center gap-2"
                    >
                      <RefreshCw size={18} />
                      Sync Now
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="pos-card p-6 space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Database size={20} />
                Data Management
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-xl p-6 text-center">
                  <Download size={32} className="mx-auto mb-3 text-blue-500" />
                  <h3 className="font-medium mb-2">Export Data</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Download a backup of your products, categories, and settings
                  </p>
                  <button
                    onClick={handleExport}
                    className="pos-btn-secondary w-full"
                  >
                    Export Backup
                  </button>
                </div>

                <div className="border rounded-xl p-6 text-center">
                  <Upload size={32} className="mx-auto mb-3 text-green-500" />
                  <h3 className="font-medium mb-2">Import Data</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Restore data from a previous backup file
                  </p>
                  <button className="pos-btn-secondary w-full">
                    Import Backup
                  </button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium text-red-600 mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-500 mb-4">
                  These actions are irreversible. Please proceed with caution.
                </p>
                <button className="pos-btn-danger">
                  Reset All Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
