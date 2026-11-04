import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, AlertCircle, RefreshCw, Radio } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { getApiBaseUrl, setCustomApiBaseUrl, testApiConnection } from '../../api/client';

export interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (newUrl: string) => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setCurrentUrl(getApiBaseUrl());
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [isOpen]);

  const handleTest = async (urlToTest?: string) => {
    const target = (urlToTest || currentUrl).trim();
    if (!target) return;
    setTestStatus('testing');
    setTestMessage('Connecting to AIIMS backend...');

    const result = await testApiConnection(target);
    if (result.ok) {
      const dbMode = result.data?.database?.mode || 'active';
      setTestStatus('success');
      setTestMessage(`Connected successfully! Server is live (DB: ${dbMode}).`);
    } else {
      setTestStatus('error');
      setTestMessage(`Failed to connect: ${result.error || 'Server unreachable'}`);
    }
  };

  const handleApplyPreset = (presetUrl: string) => {
    setCurrentUrl(presetUrl);
    handleTest(presetUrl);
  };

  const handleSave = () => {
    const trimmed = currentUrl.trim();
    if (trimmed) {
      setCustomApiBaseUrl(trimmed);
      if (onSaved) onSaved(trimmed);
    }
    onClose();
  };

  const handleReset = () => {
    setCustomApiBaseUrl(null);
    const defaultUrl = getApiBaseUrl();
    setCurrentUrl(defaultUrl);
    if (onSaved) onSaved(defaultUrl);
    setTestStatus('idle');
    setTestMessage('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={20} color="var(--aiims-accent-primary, #5B4BFF)" />
          <span>Server Connection Settings</span>
        </div>
      }
      subtitle="Configure backend API target for Android Emulator, Physical Mobile Device, or Web."
      maxWidth="480px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset Default
          </Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              Save & Apply
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
        <div>
          <label
            style={{
              display: 'block',
              fontWeight: 600,
              marginBottom: '6px',
              color: 'var(--aiims-text-heading, #0F172A)',
            }}
          >
            Backend API URL
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={currentUrl}
              onChange={(e) => {
                setCurrentUrl(e.target.value);
                setTestStatus('idle');
              }}
              placeholder="e.g. http://10.0.2.2:5001/api"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--aiims-border-subtle, #CBD5E1)',
                background: 'var(--aiims-bg-card, #FFFFFF)',
                color: 'var(--aiims-text-heading, #0F172A)',
                fontSize: '13px',
                fontFamily: 'monospace',
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTest()}
              disabled={testStatus === 'testing' || !currentUrl.trim()}
            >
              {testStatus === 'testing' ? <RefreshCw size={14} className="spin" /> : 'Test'}
            </Button>
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <label
            style={{
              display: 'block',
              fontWeight: 600,
              fontSize: '12px',
              color: 'var(--aiims-text-muted, #64748B)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Quick Select Presets
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleApplyPreset('http://10.0.2.2:5001/api')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                border: currentUrl.includes('10.0.2.2')
                  ? '1.5px solid var(--aiims-accent-primary, #5B4BFF)'
                  : '1px solid var(--aiims-border-subtle, #E2E8F0)',
                background: currentUrl.includes('10.0.2.2')
                  ? 'var(--aiims-accent-glow, rgba(91,75,255,0.06))'
                  : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--aiims-text-heading, #0F172A)' }}>
                  Android Studio Emulator
                </div>
                <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted, #64748B)' }}>
                  http://10.0.2.2:5001/api (Host machine bridge)
                </div>
              </div>
              <Radio size={16} color={currentUrl.includes('10.0.2.2') ? '#5B4BFF' : '#94A3B8'} />
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('http://192.168.1.5:5001/api')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                border: currentUrl.includes('192.168.1.5')
                  ? '1.5px solid var(--aiims-accent-primary, #5B4BFF)'
                  : '1px solid var(--aiims-border-subtle, #E2E8F0)',
                background: currentUrl.includes('192.168.1.5')
                  ? 'var(--aiims-accent-glow, rgba(91,75,255,0.06))'
                  : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--aiims-text-heading, #0F172A)' }}>
                  Physical Android Device (Wi-Fi)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted, #64748B)' }}>
                  http://192.168.1.5:5001/api (Local Wi-Fi IP)
                </div>
              </div>
              <Radio size={16} color={currentUrl.includes('192.168.1.5') ? '#5B4BFF' : '#94A3B8'} />
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('/api')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                border:
                  currentUrl === '/api'
                    ? '1.5px solid var(--aiims-accent-primary, #5B4BFF)'
                    : '1px solid var(--aiims-border-subtle, #E2E8F0)',
                background:
                  currentUrl === '/api'
                    ? 'var(--aiims-accent-glow, rgba(91,75,255,0.06))'
                    : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--aiims-text-heading, #0F172A)' }}>
                  Web Browser / Local Proxy
                </div>
                <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted, #64748B)' }}>
                  /api (Vite dev server proxy)
                </div>
              </div>
              <Radio size={16} color={currentUrl === '/api' ? '#5B4BFF' : '#94A3B8'} />
            </button>
          </div>
        </div>

        {/* Live Test Status Banner */}
        {testStatus !== 'idle' && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background:
                testStatus === 'testing'
                  ? 'rgba(91,75,255,0.08)'
                  : testStatus === 'success'
                    ? 'rgba(16,185,129,0.1)'
                    : 'rgba(239,68,68,0.1)',
              border: `1px solid ${
                testStatus === 'testing'
                  ? 'rgba(91,75,255,0.2)'
                  : testStatus === 'success'
                    ? '#10B981'
                    : '#EF4444'
              }`,
              color:
                testStatus === 'testing'
                  ? 'var(--aiims-accent-primary, #5B4BFF)'
                  : testStatus === 'success'
                    ? '#065F46'
                    : '#991B1B',
            }}
          >
            {testStatus === 'testing' && <RefreshCw size={16} className="spin" />}
            {testStatus === 'success' && <CheckCircle2 size={16} color="#10B981" />}
            {testStatus === 'error' && <AlertCircle size={16} color="#EF4444" />}
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{testMessage}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
