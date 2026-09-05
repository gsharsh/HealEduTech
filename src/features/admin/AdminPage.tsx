import { useTranslation } from "react-i18next";
import { FeatureCard } from "../../components/ui/FeatureCard";
import { PageIntro } from "../../components/ui/PageIntro";

export function AdminPage() {
  const { t } = useTranslation();

  return (
    <section>
      <PageIntro eyebrow={t("admin.eyebrow")} title={t("admin.title")} description={t("admin.description")} />
      <div className="card-grid">
        <FeatureCard icon="👥" title={t("admin.learners.title")} description={t("admin.learners.description")} />
        <FeatureCard icon="📗" title={t("admin.catalogue.title")} description={t("admin.catalogue.description")} />
        <FeatureCard icon="✅" title={t("admin.moderation.title")} description={t("admin.moderation.description")} badge={t("status.nextPhase")} />
      </div>
    </section>
  );
}
