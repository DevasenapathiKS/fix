import type { TimelineEntry } from '../../types/customer';
import { formatDateTime } from '../../utils/formatters';
import styles from './Timeline.module.css';

interface TimelineProps {
  items: TimelineEntry[];
}

export const Timeline = ({ items }: TimelineProps) => (
  <ul className={styles.timeline}>
    {items.map((item, index) => (
      <li key={`${item.action}-${index}`} className={styles.item}>
        <span className={styles.dot} />
        <div>
          <p className={styles.label}>{item.message}</p>
          <p className={styles.meta}>{formatDateTime(item.createdAt)}</p>
        </div>
      </li>
    ))}
  </ul>
);
