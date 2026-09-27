import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function PublicCatalogueLink() {
  const { t } = useTranslation();
  return <Link className="workspace-public-link" to="/library">{t('workspaces.publicCatalogue')}</Link>;
}
