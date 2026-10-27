import React from 'react';
import {
  ShieldCheck,
  UserCheck,
  LogOut,
  Sun,
  Moon,
  ArrowLeft,
  ClipboardList,
  LayoutDashboard,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLearner } from '../../context/LearnerContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface StaffHeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({ currentPath, onNavigate }) => {
  const { isDark, toggleTheme } = useTheme();
  const { state, logout } = useLearner();
  const user = state?.profile;
  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/staff/login';
    } catch {
      window.location.href = '/staff/login';
    }
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--aiims-bg-card, #ffffff)',
        borderBottom: '1px solid var(--aiims-border-subtle, #e2e8f0)',
        boxShadow: 'var(--aiims-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
        padding: 'env(safe-area-inset-top, 0px) 20px 0 20px',
        height: 'calc(64px + env(safe-area-inset-top, 0px))',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Brand & Portal Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          onClick={() => onNavigate(isAdmin ? '/staff/admin' : '/staff/queue')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--aiims-sky-subtle, #e0f2fe)',
              color: 'var(--aiims-sky-text, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isAdmin ? <ShieldCheck size={20} /> : <UserCheck size={20} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  letterSpacing: '-0.3px',
                }}
              >
                AIIMS
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--aiims-text-muted, #64748b)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                }}
              >
                Staff Portal
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)' }}>
              {isAdmin
                ? 'System Administration & Quality Auditing'
                : 'Evaluation & Mentoring Queue'}
            </div>
          </div>
        </div>

        {/* Portal Navigation Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: '16px',
          }}
        >
          <button
            onClick={() => onNavigate('/staff/queue')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: currentPath.startsWith('/staff/queue')
                ? 'var(--aiims-sky-subtle, #e0f2fe)'
                : 'transparent',
              color: currentPath.startsWith('/staff/queue')
                ? 'var(--aiims-sky-text, #0369a1)'
                : 'var(--aiims-text-secondary, #64748b)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ClipboardList size={15} />
            Queue
          </button>

          {isAdmin && (
            <button
              onClick={() => onNavigate('/staff/admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: currentPath.startsWith('/staff/admin')
                  ? 'var(--aiims-mint-subtle, #d1fae5)'
                  : 'transparent',
                color: currentPath.startsWith('/staff/admin')
                  ? 'var(--aiims-mint-text, #065f46)'
                  : 'var(--aiims-text-secondary, #64748b)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutDashboard size={15} />
              Admin Console
            </button>
          )}
        </nav>
      </div>

      {/* Right Controls: User, Theme, Sign Out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Badge variant={isAdmin ? 'primary' : 'success'}>{isAdmin ? 'Admin' : 'Evaluator'}</Badge>

        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--aiims-text-heading, #0f172a)',
            display: 'none',
          }}
          className="staff-user-name"
        >
          {user?.name || 'Staff User'}
        </span>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Theme"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
            backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
            color: 'var(--aiims-text-secondary, #64748b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Logout Button */}
        <Button variant="outline" size="sm" onClick={handleLogout} icon={<LogOut size={14} />}>
          Sign Out
        </Button>
      </div>
    </header>
  );
};
