import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      fullWidth = true,
      id,
      disabled,
      style,
      className = '',
      ...restProps
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          width: fullWidth ? '100%' : 'auto',
          boxSizing: 'border-box',
        }}
      >
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--aiims-text-heading, #0f172a)',
              letterSpacing: '-0.1px',
            }}
          >
            {label}
          </label>
        )}

        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {leftIcon && (
            <div
              style={{
                position: 'absolute',
                left: '12px',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                color: 'var(--aiims-text-muted, #64748b)',
              }}
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            style={{
              width: '100%',
              paddingTop: '10px',
              paddingBottom: '10px',
              paddingLeft: leftIcon ? '38px' : '14px',
              paddingRight: rightIcon ? '38px' : '14px',
              fontSize: '14px',
              fontFamily: 'inherit',
              color: 'var(--aiims-text-heading, #0f172a)',
              backgroundColor: disabled
                ? 'var(--aiims-bg-card-hover, #f1f5f9)'
                : 'var(--aiims-bg-card, #ffffff)',
              border: error
                ? '1.5px solid var(--aiims-token-coral-accent, #e11d48)'
                : '1.5px solid var(--aiims-border-card, #ede9fe)',
              borderRadius: '10px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              cursor: disabled ? 'not-allowed' : 'text',
              opacity: disabled ? 0.7 : 1,
              ...style,
            }}
            onFocus={(e) => {
              if (!error) {
                e.currentTarget.style.borderColor = 'var(--aiims-primary, #6366f1)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
              }
            }}
            onBlur={(e) => {
              if (!error) {
                e.currentTarget.style.borderColor = 'var(--aiims-border-card, #ede9fe)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
            {...restProps}
          />

          {rightIcon && (
            <div
              style={{
                position: 'absolute',
                right: '12px',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--aiims-text-muted, #64748b)',
              }}
            >
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <span
            id={`${inputId}-error`}
            role="alert"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--aiims-token-coral-accent, #e11d48)',
            }}
          >
            {error}
          </span>
        ) : helperText ? (
          <span
            id={`${inputId}-helper`}
            style={{
              fontSize: '12px',
              color: 'var(--aiims-text-muted, #64748b)',
            }}
          >
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  options: { label: string; value: string | number }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      fullWidth = true,
      id,
      disabled,
      options,
      style,
      className = '',
      ...restProps
    },
    ref
  ) => {
    const selectId =
      id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          width: fullWidth ? '100%' : 'auto',
          boxSizing: 'border-box',
        }}
      >
        {label && (
          <label
            htmlFor={selectId}
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--aiims-text-heading, #0f172a)',
            }}
          >
            {label}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: '14px',
            fontFamily: 'inherit',
            color: 'var(--aiims-text-heading, #0f172a)',
            backgroundColor: disabled
              ? 'var(--aiims-bg-card-hover, #f1f5f9)'
              : 'var(--aiims-bg-card, #ffffff)',
            border: error
              ? '1.5px solid var(--aiims-token-coral-accent, #e11d48)'
              : '1.5px solid var(--aiims-border-card, #ede9fe)',
            borderRadius: '10px',
            outline: 'none',
            boxSizing: 'border-box',
            cursor: disabled ? 'not-allowed' : 'pointer',
            ...style,
          }}
          {...restProps}
        >
          {options.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {error ? (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--aiims-token-coral-accent, #e11d48)',
            }}
          >
            {error}
          </span>
        ) : helperText ? (
          <span style={{ fontSize: '12px', color: 'var(--aiims-text-secondary, #64748b)' }}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
