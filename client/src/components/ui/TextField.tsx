import { forwardRef, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './TextField.module.css';

type BaseProps = {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  fullWidth?: boolean;
};

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement> & { multiline?: false };
type TextAreaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true };

type Props = InputProps | TextAreaProps;

export const TextField = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(
  ({ label, hint, error, prefix, suffix, className, fullWidth, multiline, ...props }, ref) => (
    <label className={clsx(styles.wrapper, className, { [styles.fullWidth]: fullWidth })}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={clsx(styles.field, { [styles.hasError]: Boolean(error) })}>
        {prefix && <span className={styles.affix}>{prefix}</span>}
        {multiline ? (
          <textarea ref={ref as Ref<HTMLTextAreaElement>} {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
        ) : (
          <input ref={ref as Ref<HTMLInputElement>} {...(props as InputHTMLAttributes<HTMLInputElement>)} />
        )}
        {suffix && <span className={styles.affix}>{suffix}</span>}
      </div>
      {error ? <span className={styles.error}>{error}</span> : hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  )
);

TextField.displayName = 'TextField';
