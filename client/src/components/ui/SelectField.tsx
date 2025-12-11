import type { SelectHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './SelectField.module.css';

interface Option {
  label: string;
  value: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: Option[];
  fullWidth?: boolean;
}

export const SelectField = ({ label, hint, error, options = [], fullWidth, className, children, ...props }: SelectFieldProps) => (
  <label className={clsx(styles.wrapper, className, { [styles.fullWidth]: fullWidth })}>
    {label && <span className={styles.label}>{label}</span>}
    <div className={clsx(styles.field, { [styles.hasError]: Boolean(error) })}>
      <select {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    </div>
    {error ? <span className={styles.error}>{error}</span> : hint ? <span className={styles.hint}>{hint}</span> : null}
  </label>
);
