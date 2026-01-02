import { useQuery } from '@tanstack/react-query';
import { checkHealth } from '../config/api';
import { Activity, Database, Server, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function HealthMonitor() {
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: 5000, // Check every 5 seconds
  });

  if (isLoading) {
    return <div className="loading">Loading health status...</div>;
  }

  if (error) {
    return (
      <div className="error">
        Failed to connect to sync server. Please check your configuration.
      </div>
    );
  }

  const isHealthy = health?.status === 'ok' && health?.database.connected;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Server Health</h1>
        <p className="page-subtitle">Real-time monitoring of your sync server</p>
      </div>

      {/* Status Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Server Status</span>
            <div className={`stat-icon ${isHealthy ? 'success' : 'danger'}`}>
              <Server size={20} />
            </div>
          </div>
          <div className={`status-indicator ${isHealthy ? 'healthy' : 'degraded'}`}>
            <span className="status-dot"></span>
            {isHealthy ? 'Healthy' : 'Degraded'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Database</span>
            <div className={`stat-icon ${health?.database.connected ? 'success' : 'danger'}`}>
              <Database size={20} />
            </div>
          </div>
          <div className={`status-indicator ${health?.database.connected ? 'healthy' : 'degraded'}`}>
            <span className="status-dot"></span>
            {health?.database.connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Latency</span>
            <div className="stat-icon primary">
              <Activity size={20} />
            </div>
          </div>
          <div className="stat-value">{health?.database.latency || 'N/A'}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Environment</span>
            <div className="stat-icon warning">
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-value">{health?.environment || 'unknown'}</div>
        </div>
      </div>

      {/* Detailed Information */}
      <div className="chart-card">
        <div className="chart-header">
          <h2 className="chart-title">System Information</h2>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Last Check</span>
            <span className="info-value">
              {health?.timestamp 
                ? formatDistanceToNow(new Date(health.timestamp), { addSuffix: true })
                : 'N/A'}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">Status</span>
            <span className="info-value">{health?.status}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Database Connected</span>
            <span className="info-value">
              {health?.database.connected ? 'Yes' : 'No'}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">Database Latency</span>
            <span className="info-value">{health?.database.latency}</span>
          </div>

          {health?.database.error && (
            <div className="info-item">
              <span className="info-label">Database Error</span>
              <span className="info-value" style={{ color: '#ef4444' }}>
                {health.database.error}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Connection Instructions */}
      <div className="chart-card">
        <div className="chart-header">
          <h2 className="chart-title">Connection Details</h2>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">API URL</span>
            <span className="info-value">{import.meta.env.VITE_API_URL || 'Not configured'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">API Key</span>
            <span className="info-value">
              {import.meta.env.VITE_API_KEY ? '••••••••' : 'Not configured'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
