import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalytics } from '../config/api';
import type { AnalyticsResponse } from '../config/api';
import { TrendingUp, Users, DollarSign, ShoppingCart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type TopProduct = AnalyticsResponse['topProducts'][number];

export default function AnalyticsDashboard() {
  const [storeId, setStoreId] = useState('');
  const dateRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  };

  const { data: analytics, isLoading, error } = useQuery<AnalyticsResponse>({
    queryKey: ['analytics', storeId, dateRange],
    queryFn: () => getAnalytics(storeId, dateRange.start, dateRange.end),
    enabled: !!storeId,
  });


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-MW', {
      style: 'currency',
      currency: 'MWK',
    }).format(value);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Sales and performance metrics</p>
      </div>

      {/* Store ID Input */}
      <div className="chart-card">
        <input
          type="text"
          placeholder="Enter Store ID (UUID)"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
            color: '#f8fafc',
            fontSize: '1rem',
          }}
        />
      </div>

      {!storeId && (
        <div className="chart-card">
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>
            Enter a store ID to view analytics
          </p>
        </div>
      )}

      {error && (
        <div className="error">
          Failed to load analytics. Please check the store ID and try again.
        </div>
      )}

      {isLoading && storeId && (
        <div className="loading">Loading analytics...</div>
      )}

      {analytics && (
        <>
          {/* Stats Overview */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Total Sales</span>
                <div className="stat-icon success">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="stat-value">
                {formatCurrency(analytics.summary.totalSales)}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Transactions</span>
                <div className="stat-icon primary">
                  <ShoppingCart size={20} />
                </div>
              </div>
              <div className="stat-value">{analytics.summary.totalTransactions}</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Average Sale</span>
                <div className="stat-icon warning">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="stat-value">
                {formatCurrency(analytics.summary.averageSale)}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Top Products</span>
                <div className="stat-icon primary">
                  <Users size={20} />
                </div>
              </div>
              <div className="stat-value">{analytics.topProducts.length}</div>
            </div>
          </div>

          {/* Top Products Chart */}
          {analytics.topProducts.length > 0 && (
            <div className="chart-card">
              <div className="chart-header">
                <h2 className="chart-title">Top Selling Products</h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topProducts.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="productId" 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                    tickFormatter={(value: string) => value.substring(0, 8)}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '0.5rem',
                      color: '#f8fafc',
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number | string | undefined) => 
                      value !== undefined ? formatCurrency(Number(value)) : ''
                    }
                  />
                  <Bar dataKey="_sum.total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Products Table */}
          <div className="chart-card">
            <div className="chart-header">
              <h2 className="chart-title">Product Details</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>
                      Product ID
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8', fontWeight: 500 }}>
                      Quantity Sold
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8', fontWeight: 500 }}>
                      Total Sales
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topProducts.map((product: TopProduct) => (
                    <tr key={product.productId} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '0.75rem', color: '#f8fafc' }}>
                        {product.productId.substring(0, 24)}...
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#f8fafc' }}>
                        {product._sum.quantity}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                        {formatCurrency(product._sum.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
