import { useTranslation } from "react-i18next";
import { FeatureCard } from "../../components/ui/FeatureCard";
import { PageIntro } from "../../components/ui/PageIntro";

export function ExplorePage() {
  const { t } = useTranslation();

  return (
    <section>
      <PageIntro eyebrow={t("explore.eyebrow")} title={t("explore.title")} description={t("explore.description")} />
      <div className="notice" role="note">{t("explore.editorialNotice")}</div>
      <div className="card-grid">
        <FeatureCard icon="🌱" title={t("explore.nature.title")} description={t("explore.nature.description")} badge={t("status.educatorPick")} />
        <FeatureCard icon="🔭" title={t("explore.science.title")} description={t("explore.science.description")} badge={t("status.example")} />
      </div>
    </section>
  );
}
