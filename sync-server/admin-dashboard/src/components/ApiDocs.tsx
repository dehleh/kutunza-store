import { Code, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export default function ApiDocs() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const copyToClipboard = (text: string, endpoint: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const apiKey = import.meta.env.VITE_API_KEY || 'your-api-key';

  const endpoints = [
    {
      name: 'Health Check',
      method: 'GET',
      path: '/health',
      auth: false,
      description: 'Check server and database health status',
      example: `curl ${apiUrl}/health`,
    },
    {
      name: 'Sync Push',
      method: 'POST',
      path: '/api/sync/push',
      auth: true,
      description: 'Push local changes to the cloud',
      example: `curl -X POST ${apiUrl}/api/sync/push \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "storeId": "your-store-uuid",
    "changes": [
      {
        "tableName": "Product",
        "recordId": "product-uuid",
        "operation": "create",
        "syncId": "sync-uuid",
        "data": {}
      }
    ]
  }'`,
    },
    {
      name: 'Sync Pull',
      method: 'POST',
      path: '/api/sync/pull',
      auth: true,
      description: 'Pull remote changes from the cloud',
      example: `curl -X POST ${apiUrl}/api/sync/pull \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "storeId": "your-store-uuid",
    "lastSyncTime": "2026-01-01T00:00:00.000Z"
  }'`,
    },
    {
      name: 'Analytics',
      method: 'GET',
      path: '/api/analytics/:storeId',
      auth: true,
      description: 'Get store analytics and sales data',
      example: `curl "${apiUrl}/api/analytics/your-store-uuid?startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T23:59:59.000Z" \\
  -H "x-api-key: ${apiKey}"`,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">API Documentation</h1>
        <p className="page-subtitle">Quick reference for all available endpoints</p>
      </div>

      {/* Configuration */}
      <div className="chart-card">
        <div className="chart-header">
          <h2 className="chart-title">Configuration</h2>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Base URL</span>
            <span className="info-value">{apiUrl}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Authentication</span>
            <span className="info-value">API Key (x-api-key header)</span>
          </div>
          <div className="info-item">
            <span className="info-label">Content Type</span>
            <span className="info-value">application/json</span>
          </div>
        </div>
      </div>

      {/* Endpoints */}
      {endpoints.map((endpoint, index) => (
        <div key={index} className="chart-card">
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="chart-title">{endpoint.name}</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {endpoint.description}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: endpoint.method === 'GET' ? '#3b82f620' : '#10b98120',
                  color: endpoint.method === 'GET' ? '#3b82f6' : '#10b981',
                }}
              >
                {endpoint.method}
              </span>
              {endpoint.auth && (
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: '#f59e0b20',
                    color: '#f59e0b',
                  }}
                >
                  Auth Required
                </span>
              )}
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>Endpoint</span>
            </div>
            <div
              style={{
                padding: '0.75rem',
                background: '#0f172a',
                borderRadius: '0.5rem',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: '#f8fafc',
              }}
            >
              {endpoint.path}
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>
                <Code size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Example Request
              </span>
              <button
                onClick={() => copyToClipboard(endpoint.example, endpoint.name)}
                style={{
                  padding: '0.5rem',
                  background: 'transparent',
                  border: '1px solid #334155',
                  borderRadius: '0.375rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                {copiedEndpoint === endpoint.name ? (
                  <>
                    <CheckCircle size={16} />
                    <span style={{ fontSize: '0.75rem' }}>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span style={{ fontSize: '0.75rem' }}>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre
              style={{
                padding: '1rem',
                background: '#0f172a',
                borderRadius: '0.5rem',
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                color: '#f8fafc',
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {endpoint.example}
            </pre>
          </div>
        </div>
      ))}

      {/* Rate Limits */}
      <div className="chart-card">
        <div className="chart-header">
          <h2 className="chart-title">Rate Limits</h2>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Limit</span>
            <span className="info-value">100 requests per 15 minutes per IP</span>
          </div>
          <div className="info-item">
            <span className="info-label">Applies To</span>
            <span className="info-value">All /api/* endpoints</span>
          </div>
        </div>
      </div>
    </div>
  );
}
