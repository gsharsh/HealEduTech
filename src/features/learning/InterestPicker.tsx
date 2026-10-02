import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { listMyInterests, replaceMyInterests, type InterestTopic } from './reading';
import { readingTranslations } from './readingTranslations';

const topics: InterestTopic[] = ['nature', 'stories', 'science'];

export function InterestPicker() {
  const { user } = useAccount();
  return user ? <InterestPickerForUser key={user.id} userId={user.id} /> : null;
}

function InterestPickerForUser({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const copy = readingTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  const [selected, setSelected] = useState<InterestTopic[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const saveRequest = useRef(0);

  useEffect(() => () => { saveRequest.current += 1; }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void listMyInterests(userId, controller.signal)
      .then(value => { if (active) { setSelected(value); setFailed(false); setLoaded(true); } })
      .catch(() => { if (active) { setFailed(true); setLoaded(true); } })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; controller.abort(); };
  }, [attempt, userId]);

  function toggle(topic: InterestTopic) {
    if (saving) return;
    setSelected(value => value.includes(topic) ? value.filter(item => item !== topic) : [...value, topic]);
    setSaved(false);
  }

  async function save() {
    if (saving) return;
    const requestId = ++saveRequest.current;
    setSaving(true); setSaveFailed(false); setSaved(false);
    try {
      const next = await replaceMyInterests(selected);
      if (requestId === saveRequest.current) { setSelected(next); setSaved(true); }
    }
    catch {
      if (requestId === saveRequest.current) setSaveFailed(true);
    }
    finally {
      if (requestId === saveRequest.current) setSaving(false);
    }
  }

  return <section className="interests-panel reading-interests">
    <h2>{copy.interests}</h2><p>{copy.interestsBody}</p>
    {!loaded ? <p role="status">{copy.interestsLoading}</p> : failed ? <div role="alert"><p>{copy.interestsError}</p><button type="button" className="secondary" onClick={() => { setLoaded(false); setFailed(false); setAttempt(value => value + 1); }}>{copy.retry}</button></div> : <>
      <div className="interest-options">{topics.map(topic => <button key={topic} type="button" disabled={saving} className={selected.includes(topic) ? 'selected' : ''} aria-pressed={selected.includes(topic)} onClick={() => toggle(topic)}>{selected.includes(topic) ? '✓ ' : '+ '}{t(`topics.${topic}`)}</button>)}</div>
      <div className="reading-interest-actions"><button type="button" className="primary" disabled={saving} onClick={() => void save()}>{saving ? copy.savingInterests : copy.saveInterests}</button><button type="button" className="secondary" disabled={saving} onClick={() => { setSelected([]); setSaved(false); }}>{copy.clearInterests}</button>{saved && <span className="reading-saved" role="status">{copy.interestsSaved}</span>}</div>
      {saveFailed && <p role="alert">{copy.interestsError}</p>}
    </>}
  </section>;
}
