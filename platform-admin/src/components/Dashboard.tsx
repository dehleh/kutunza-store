import { useState, useEffect } from 'react';
import { Building2, Users, DollarSign, LogOut } from 'lucide-react';

interface Admin {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function Dashboard() {
  const [admin, setAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('platformAdmin');
    if (stored) {
      setAdmin(JSON.parse(stored));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('platformToken');
    localStorage.removeItem('platformAdmin');
    window.location.reload();
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Companies</p>
                <p className="text-3xl font-bold text-gray-900">-</p>
              </div>
              <Building2 className="text-indigo-600" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stores</p>
                <p className="text-3xl font-bold text-gray-900">-</p>
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

        {/* Main content */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Platform Management</h2>
          <p className="text-gray-600">
            Platform admin dashboard is under construction. You can use the API endpoints to:
          </p>
          <ul className="mt-4 space-y-2 text-gray-600">
            <li>• <code className="bg-gray-100 px-2 py-1 rounded">GET /api/companies</code> - List all companies</li>
            <li>• <code className="bg-gray-100 px-2 py-1 rounded">POST /api/companies/register</code> - Register new company</li>
            <li>• <code className="bg-gray-100 px-2 py-1 rounded">GET /api/companies/:id</code> - Get company details</li>
            <li>• <code className="bg-gray-100 px-2 py-1 rounded">PATCH /api/companies/:id/subscription</code> - Update subscription</li>
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            API Base URL: https://kutunza-store-production.up.railway.app
          </p>
        </div>
      </div>
    </div>
  );
}
