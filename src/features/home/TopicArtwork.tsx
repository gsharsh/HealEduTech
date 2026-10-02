import type { Topic } from '../../demo/catalogue';

type TopicArtworkProps = {
  topic: Topic;
  className?: string;
};

/** A compact, reusable visual language for the three library paths. */
export function TopicArtwork({ topic, className = '' }: TopicArtworkProps) {
  const classes = `topic-art topic-art--${topic} ${className}`.trim();

  if (topic === 'nature') {
    return (
      <svg className={classes} viewBox="0 0 500 360" fill="none" aria-hidden="true">
        <circle cx="365" cy="92" r="52" fill="currentColor" opacity=".16" />
        <path d="M52 286c58-64 108-83 165-80 64 3 93 42 145 18 38-18 68-49 116-81" stroke="currentColor" strokeWidth="3" opacity=".28" />
        <path d="M40 316c69-69 122-90 181-78 59 12 94 49 151 17 39-22 65-61 111-94" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".55" />
        <path d="M252 297c-4-78 5-126 35-183" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
        <path d="M278 163c-44-8-72-34-84-76 43 2 75 20 91 57M277 195c54-5 86-28 103-73-48-3-83 14-105 56M269 229c-52-3-85-27-102-69 48-3 83 14 105 52" fill="currentColor" opacity=".24" />
        <path d="M278 163c-44-8-72-34-84-76 43 2 75 20 91 57M277 195c54-5 86-28 103-73-48-3-83 14-105 56M269 229c-52-3-85-27-102-69 48-3 83 14 105 52" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="105" cy="104" r="5" fill="currentColor" opacity=".6" />
        <circle cx="417" cy="248" r="7" fill="currentColor" opacity=".35" />
        <path d="M92 154h34M109 137v34M398 143h22M409 132v22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".38" />
      </svg>
    );
  }

  if (topic === 'stories') {
    return (
      <svg className={classes} viewBox="0 0 500 360" fill="none" aria-hidden="true">
        <path d="M250 268c-47-38-97-47-158-29V98c58-18 108-8 158 24v146Z" fill="currentColor" opacity=".14" />
        <path d="M250 268c47-38 97-47 158-29V98c-58-18-108-8-158 24v146Z" fill="currentColor" opacity=".08" />
        <path d="M250 268c-47-38-97-47-158-29V98c58-18 108-8 158 24m0 146c47-38 97-47 158-29V98c-58-18-108-8-158 24m0 0v146" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M125 144h81M125 169h96M125 194h70M294 144h81M294 169h96M294 194h70" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".38" />
        <path d="m389 40 9 23 25 2-19 16 6 24-21-13-21 13 6-24-19-16 25-2 9-23Z" fill="currentColor" opacity=".56" />
        <path d="M76 75c10-21 28-32 52-32-7 23-23 39-47 44M436 273c-20-6-31-20-34-41 22 2 37 14 43 35" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".46" />
        <circle cx="71" cy="259" r="9" fill="currentColor" opacity=".28" />
      </svg>
    );
  }

  return (
    <svg className={classes} viewBox="0 0 500 360" fill="none" aria-hidden="true">
      <circle cx="250" cy="180" r="52" fill="currentColor" opacity=".12" />
      <ellipse cx="250" cy="180" rx="174" ry="70" stroke="currentColor" strokeWidth="4" opacity=".38" transform="rotate(-18 250 180)" />
      <ellipse cx="250" cy="180" rx="174" ry="70" stroke="currentColor" strokeWidth="4" opacity=".24" transform="rotate(42 250 180)" />
      <ellipse cx="250" cy="180" rx="174" ry="70" stroke="currentColor" strokeWidth="2" opacity=".22" transform="rotate(86 250 180)" />
      <circle cx="250" cy="180" r="25" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="5" />
      <circle cx="404" cy="131" r="12" fill="currentColor" />
      <circle cx="105" cy="218" r="9" fill="currentColor" opacity=".72" />
      <circle cx="291" cy="41" r="7" fill="currentColor" opacity=".58" />
      <path d="M247 99V68M247 292v-31M141 123l-25-19M361 240l26 20M141 241l-27 20M360 120l28-21" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".42" />
      <path d="M78 83h31M93 67v32M404 273h34M421 256v34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".3" />
    </svg>
  );
}
