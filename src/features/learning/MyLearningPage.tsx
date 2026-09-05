import { useTranslation } from "react-i18next";
import { FeatureCard } from "../../components/ui/FeatureCard";
import { PageIntro } from "../../components/ui/PageIntro";

export function MyLearningPage() {
  const { t } = useTranslation();

  return (
    <section>
      <PageIntro
        eyebrow={t("learning.eyebrow")}
        title={t("learning.title")}
        description={t("learning.description")}
        action={<button className="primary-button" type="button">{t("learning.addBook")}</button>}
      />
      <div className="card-grid">
        <FeatureCard icon="📚" title={t("learning.books.title")} description={t("learning.books.description")} />
        <FeatureCard icon="🎯" title={t("learning.goals.title")} description={t("learning.goals.description")} badge={t("status.nextPhase")} />
        <FeatureCard icon="🏅" title={t("learning.badges.title")} description={t("learning.badges.description")} badge={t("status.preview")} />
      </div>
    </section>
  );
}
