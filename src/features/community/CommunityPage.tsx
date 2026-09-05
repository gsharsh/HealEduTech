import { useTranslation } from "react-i18next";
import { FeatureCard } from "../../components/ui/FeatureCard";
import { PageIntro } from "../../components/ui/PageIntro";

export function CommunityPage() {
  const { t } = useTranslation();

  return (
    <section>
      <PageIntro eyebrow={t("community.eyebrow")} title={t("community.title")} description={t("community.description")} />
      <div className="card-grid">
        <FeatureCard icon="🛠️" title={t("community.projects.title")} description={t("community.projects.description")} badge={t("status.preview")} />
        <FeatureCard icon="❓" title={t("community.questions.title")} description={t("community.questions.description")} badge={t("status.moderated")} />
      </div>
    </section>
  );
}
