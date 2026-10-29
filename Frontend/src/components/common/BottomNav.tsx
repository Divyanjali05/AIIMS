import React from 'react';
import { Home, Route, ClipboardCheck, Wallet, Settings } from 'lucide-react';

export interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'journey', label: 'Journey', icon: Route },
    { id: 'assessment', label: 'Assessment', icon: ClipboardCheck },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'settings', label: 'Profile', icon: Settings },
  ];

  return (
    <nav className="aiims-mobile-bottom-nav" aria-label="Mobile Navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            className={`aiims-bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: isActive ? 'var(--aiims-primary-light, #eef2ff)' : 'transparent',
                transition: 'background-color 0.15s ease',
              }}
            >
              <Icon
                size={18}
                color={
                  isActive ? 'var(--aiims-primary, #6366f1)' : 'var(--aiims-text-muted, #94a3b8)'
                }
              />
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: isActive ? 800 : 600,
                color: isActive
                  ? 'var(--aiims-primary, #6366f1)'
                  : 'var(--aiims-text-muted, #94a3b8)',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
