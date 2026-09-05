import type { ReactNode } from "react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  badge?: string;
  action?: ReactNode;
}

export function FeatureCard({ title, description, icon, badge, action }: FeatureCardProps) {
  return (
    <article className="feature-card">
      <div className="feature-icon" aria-hidden="true">{icon}</div>
      <div className="feature-copy">
        <div className="feature-heading">
          <h2>{title}</h2>
          {badge ? <span className="badge">{badge}</span> : null}
        </div>
        <p>{description}</p>
        {action}
      </div>
    </article>
  );
}
