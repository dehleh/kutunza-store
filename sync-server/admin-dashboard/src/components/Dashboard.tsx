import { useState } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  FileText,
} from 'lucide-react';
import HealthMonitor from './HealthMonitor';
import AnalyticsDashboard from './AnalyticsDashboard';
import ApiDocs from './ApiDocs';

type View = 'dashboard' | 'analytics' | 'docs';

export default function Dashboard() {
  const [activeView, setActiveView] = useState<View>('dashboard');

  const navigation = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics' as View, label: 'Analytics', icon: BarChart3 },
    { id: 'docs' as View, label: 'API Docs', icon: FileText },
  ];

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">Kutunza Sync</div>
          <div className="sidebar-subtitle">Admin Dashboard</div>
        </div>

        <ul className="nav-menu">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id} className="nav-item">
                <div
                  className={`nav-link ${activeView === item.id ? 'active' : ''}`}
                  onClick={() => setActiveView(item.id)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </div>
              </li>
            );
          })}
        </ul>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <div className="info-item">
            <span className="info-label">Version</span>
            <span className="info-value">1.0.0</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {activeView === 'dashboard' && <HealthMonitor />}
        {activeView === 'analytics' && <AnalyticsDashboard />}
        {activeView === 'docs' && <ApiDocs />}
      </div>
    </div>
  );
}
