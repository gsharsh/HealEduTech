import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AccountState } from '../auth/context';

type StaffRole = AccountState['staffRole'];

export function WorkspaceNavigation({ staffRole, current }: { staffRole: StaffRole; current: 'catalogue' | 'circulation' | 'administration' }) {
  const { t } = useTranslation();
  const links = [
    { key: 'catalogue', to: '/staff/catalogue', label: t('workspaces.catalogue') },
    { key: 'circulation', to: '/staff/circulation', label: t('workspaces.circulation') },
    ...(staffRole === 'administrator'
      ? [{ key: 'administration', to: '/admin/settings', label: t('workspaces.administration') }]
      : []),
  ];

  return <nav className="workspace-tabs" aria-label={t('workspaces.navigation')}>
    {links.map(link => <Link
      className={link.key === current ? 'workspace-tab workspace-tab--active' : 'workspace-tab'}
      key={link.key}
      to={link.to}
      aria-current={link.key === current ? 'page' : undefined}
    >{link.label}</Link>)}
    <Link className="workspace-tab workspace-tab--public" to="/library">{t('workspaces.publicCatalogue')}</Link>
  </nav>;
}
