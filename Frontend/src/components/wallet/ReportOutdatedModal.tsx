import React, { useState } from 'react';
import { Flag, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AITool, ReportCategory } from '../../types';
import { apiClient } from '../../api/client';

export interface ReportOutdatedModalProps {
  tool: AITool | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_CATEGORIES: Array<{ id: ReportCategory; label: string; description: string }> = [
  {
    id: 'PRICING_OUTDATED',
    label: 'Pricing is Outdated or Changed',
    description: 'Free tier limits, pricing tiers, or currency values have shifted on vendor site.',
  },
  {
    id: 'LINK_BROKEN',
    label: 'Official Website / Broken Link',
    description: 'The vendor domain or product URL is offline, redirected, or unreachable.',
  },
  {
    id: 'TIER_INCORRECT',
    label: 'Market Tier Classification Incorrect',
    description: 'Evidence suggests tool should be in a different market presence tier.',
  },
  {
    id: 'CAPABILITY_CHANGED',
    label: 'Capabilities or Model Changed',
    description: 'Tool has added new multimodal features, models, or dropped existing features.',
  },
  {
    id: 'OTHER',
    label: 'Other Inaccuracy / Quality Issue',
    description: 'Any other inaccurate description or specification in the catalog.',
  },
];

export const ReportOutdatedModal: React.FC<ReportOutdatedModalProps> = ({
  tool,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [category, setCategory] = useState<ReportCategory>('PRICING_OUTDATED');
  const [description, setDescription] = useState<string>('');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!tool) return null;

  const handleClose = () => {
    setDescription('');
    setSourceUrl('');
    setErrorMessage(null);
    setSuccessMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDesc = description.trim();
    if (cleanDesc.length < 5) {
      setErrorMessage('Please provide at least 5 characters describing the outdated information.');
      return;
    }
    if (cleanDesc.length > 2000) {
      setErrorMessage('Description must be 2000 characters or fewer.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await apiClient.reportOutdatedTool(tool.id, {
        reportCategory: category,
        description: cleanDesc,
        sourceUrl: sourceUrl.trim() || undefined,
      });

      if (res.success) {
        setSuccessMessage('Thank you! Your report has been submitted and queued for verification.');
        setTimeout(() => {
          handleClose();
          if (onSuccess) onSuccess();
        }, 1800);
      } else {
        if (res.code === 'DUPLICATE_REPORT' || res.message?.includes('pending report')) {
          setErrorMessage(
            'A pending report for this tool with this category is already under review. Thank you for flagging it!'
          );
        } else {
          setErrorMessage(res.message || res.error || 'Failed to submit report. Please try again.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error while submitting report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="540px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flag size={18} style={{ color: 'var(--aiims-tint-amber-text, #f59e0b)' }} />
          <span>Report Outdated Tool Info</span>
        </div>
      }
      subtitle={
        <span style={{ fontSize: '12.5px', color: 'var(--aiims-text-muted)' }}>
          Help keep the AIIMS Market Catalog accurate for all learners.
        </span>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: 'var(--aiims-bg-card-hover)',
            border: '1px solid var(--aiims-border-subtle)',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--aiims-text-muted)', fontWeight: 600 }}>
            Reporting Tool:
          </span>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--aiims-text-heading)' }}>
            {tool.name}{' '}
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--aiims-text-muted)' }}>
              by {tool.provider}
            </span>
          </div>
        </div>

        {/* Category Selection */}
        <div>
          <label
            htmlFor="report-category"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--aiims-text-primary)',
              marginBottom: '6px',
            }}
          >
            Report Category <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            id="report-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ReportCategory)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--aiims-border-card)',
              backgroundColor: 'var(--aiims-bg-card)',
              color: 'var(--aiims-text-primary)',
              fontSize: '13.5px',
              fontFamily: "'Nunito', sans-serif",
              outline: 'none',
            }}
          >
            {REPORT_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          <div style={{ fontSize: '11.5px', color: 'var(--aiims-text-muted)', marginTop: '4px' }}>
            {REPORT_CATEGORIES.find((c) => c.id === category)?.description}
          </div>
        </div>

        {/* Description Field */}
        <div>
          <label
            htmlFor="report-description"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--aiims-text-primary)',
              marginBottom: '6px',
            }}
          >
            What is outdated or inaccurate? <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            id="report-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. As of November 2026, the free tier now offers 15 queries instead of 10. Pro plan is now $20/month."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--aiims-border-card)',
              backgroundColor: 'var(--aiims-bg-card)',
              color: 'var(--aiims-text-primary)',
              fontSize: '13px',
              fontFamily: "'Nunito', sans-serif",
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--aiims-text-muted)',
              marginTop: '4px',
            }}
          >
            <span>Minimum 5 characters.</span>
            <span>{description.trim().length} / 2000</span>
          </div>
        </div>

        {/* Source URL Field */}
        <div>
          <label
            htmlFor="report-source-url"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--aiims-text-primary)',
              marginBottom: '6px',
            }}
          >
            Official Evidence URL{' '}
            <span style={{ fontSize: '11.5px', color: 'var(--aiims-text-muted)', fontWeight: 500 }}>
              (Optional)
            </span>
          </label>
          <input
            id="report-source-url"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://vendor.com/pricing"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--aiims-border-card)',
              backgroundColor: 'var(--aiims-bg-card)',
              color: 'var(--aiims-text-primary)',
              fontSize: '13px',
              fontFamily: "'Nunito', sans-serif",
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Messages */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--aiims-token-coral-bg, #fff1f2)',
              border: '1px solid var(--aiims-token-coral-border, #fecdd3)',
              color: 'var(--aiims-token-coral-text, #be123c)',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--aiims-token-mint-bg, #ecfdf5)',
              border: '1px solid var(--aiims-token-mint-border, #a7f3d0)',
              color: 'var(--aiims-token-mint-text, #047857)',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={isSubmitting || description.trim().length < 5 || Boolean(successMessage)}
            icon={isSubmitting ? <RefreshCw size={13} className="spin" /> : <Flag size={13} />}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
