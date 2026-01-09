import { useState, useEffect } from 'react';
import { Building2, Users, DollarSign, LogOut, List, LayoutDashboard } from 'lucide-react';
import CompanyList from './CompanyList';
import { fetchWithAuth, logoutRequest, clearSession } from '../lib/api';
import type { PlatformAdmin } from '../lib/api';

type View = 'overview' | 'companies';

export default function Dashboard() {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [activeView, setActiveView] = useState<View>('overview');
  const [stats, setStats] = useState({ companies: 0, stores: 0 });

  useEffect(() => {
    const stored = localStorage.getItem('platformAdmin');
    if (stored) {
      setAdmin(JSON.parse(stored));
    }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth('/api/companies');
      const data = await response.json();
      if (data.data) {
        const companies = data.data.length;
        const stores = data.data.reduce((sum: number, c: any) => sum + (c._count?.stores || 0), 0);
        setStats({ companies, stores });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleLogout = () => {
    logoutRequest()
      .catch((error) => {
        console.error('Logout failed', error);
        clearSession();
      })
      .finally(() => {
        window.location.reload();
      });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Admin</h1>
            <p className="text-sm text-gray-600">
              Welcome, {admin?.firstName} {admin?.lastName}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-md min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveView('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeView === 'overview'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard size={20} />
              Overview
            </button>
            <button
              onClick={() => setActiveView('companies')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeView === 'companies'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <List size={20} />
              Companies
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-8">
          {activeView === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Companies</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.companies}</p>
                    </div>
                    <Building2 className="text-indigo-600" size={40} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Stores</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.stores}</p>
                    </div>
                    <Users className="text-green-600" size={40} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Revenue</p>
                      <p className="text-3xl font-bold text-gray-900">-</p>
                    </div>
                    <DollarSign className="text-blue-600" size={40} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setActiveView('companies')}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
                  >
                    <Building2 className="text-indigo-600 mb-2" size={24} />
                    <h3 className="font-semibold text-gray-900">Manage Companies</h3>
                    <p className="text-sm text-gray-600">View and manage all companies</p>
                  </button>
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg opacity-50">
                    <DollarSign className="text-gray-400 mb-2" size={24} />
                    <h3 className="font-semibold text-gray-600">Billing Reports</h3>
                    <p className="text-sm text-gray-500">Coming soon</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeView === 'companies' && <CompanyList />}
        </div>
      </div>
    </div>
  );
}
