import styles from './Loader.module.css';

interface LoaderProps {
  label?: string;
  fullscreen?: boolean;
}

export const Loader = ({ label = 'Loading…', fullscreen }: LoaderProps) => (
  <div className={fullscreen ? styles.fullscreen : styles.inline}>
    <span className={styles.spinner} />
    <span>{label}</span>
  </div>
);
