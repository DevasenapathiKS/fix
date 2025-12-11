import { Fragment, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { useCustomerSession } from '../../hooks/useCustomerSession';
import styles from './AppShell.module.css';

export type NavLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  external?: boolean;
};

interface AppShellProps {
  links: NavLink[];
  footerLinks?: NavLink[];
  children: ReactNode;
  onLogout?: () => void;
}

export const AppShell = ({ links, footerLinks = [], children, onLogout }: AppShellProps) => {
  const location = useLocation();
  const { user } = useCustomerSession();

  const renderLink = (link: NavLink) => {
    const IconComponent = link.icon;
    const isActive = location.pathname === link.href || location.pathname.startsWith(`${link.href}/`);

    if (link.external) {
      return (
        <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className={isActive ? styles.linkActive : styles.link}>
          <IconComponent size={18} />
          <span>{link.label}</span>
          {link.badge && <span className={styles.badge}>{link.badge}</span>}
        </a>
      );
    }

    return (
      <Link key={link.href} to={link.href} className={isActive ? styles.linkActive : styles.link}>
        <IconComponent size={18} />
        <span>{link.label}</span>
        {link.badge && <span className={styles.badge}>{link.badge}</span>}
      </Link>
    );
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <div className={styles.logoMark}>FZ</div>
          <div>
            <p className={styles.brandLabel}>Fixzep</p>
            <p className={styles.brandSub}>Client Portal</p>
          </div>
        </div>

        <div className={styles.userCard}>
          <p className={styles.userName}>{user?.name}</p>
          <p className={styles.userMeta}>{user?.phone || user?.email}</p>
        </div>

        <nav className={styles.nav}>{links.map((link) => renderLink(link))}</nav>

        {footerLinks.length > 0 && (
          <Fragment>
            <div className={styles.divider} />
            <nav className={styles.nav}>{footerLinks.map((link) => renderLink(link))}</nav>
          </Fragment>
        )}

        {onLogout && (
          <button type="button" className={styles.logoutBtn} onClick={onLogout}>
            Logout
          </button>
        )}
      </aside>

      <div className={styles.main}>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
};
