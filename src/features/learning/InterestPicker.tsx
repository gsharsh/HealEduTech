import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { listMyInterests, replaceMyInterests, type InterestTopic } from './reading';
import { readingTranslations } from './readingTranslations';
import { requestFailureMessage } from '../../lib/requestFeedback';

const topics: InterestTopic[] = ['nature', 'stories', 'science'];

type InterestPickerCallbacks = {
  onLoaded?: (topics: InterestTopic[] | null) => void;
  onSaved?: (topics: InterestTopic[]) => void;
};

export function InterestPicker({ onLoaded, onSaved }: InterestPickerCallbacks = {}) {
  const { user } = useAccount();
  return user ? <InterestPickerForUser key={user.id} userId={user.id} onLoaded={onLoaded} onSaved={onSaved} /> : null;
}

function InterestPickerForUser({ userId, onLoaded, onSaved }: { userId: string } & InterestPickerCallbacks) {
  const { t, i18n } = useTranslation();
  const copy = readingTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  const [selected, setSelected] = useState<InterestTopic[]>([]);
  const [original, setOriginal] = useState<InterestTopic[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saveFailure, setSaveFailure] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const saveRequest = useRef(0);

  useEffect(() => () => { saveRequest.current += 1; }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void listMyInterests(userId, controller.signal)
      .then(value => { if (active) { setSelected(value); setOriginal(value); setFailed(false); setLoaded(true); onLoaded?.(value); } })
      .catch(() => { if (active) { setFailed(true); setLoaded(true); onLoaded?.(null); } })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; controller.abort(); };
  }, [attempt, userId, onLoaded]);

  function toggle(topic: InterestTopic) {
    if (saving) return;
    setSelected(value => value.includes(topic) ? value.filter(item => item !== topic) : [...value, topic]);
    setSaved(false); setSaveFailure(null);
  }

  async function save() {
    if (saving) return;
    const requestId = ++saveRequest.current;
    setSaving(true); setSaveFailure(null); setSaved(false);
    try {
      const next = await replaceMyInterests(selected);
      if (requestId === saveRequest.current) { setSelected(next); setOriginal(next); setSaved(true); onSaved?.(next); }
    }
    catch (failure) {
      if (requestId === saveRequest.current) setSaveFailure(failure);
    }
    finally {
      if (requestId === saveRequest.current) setSaving(false);
    }
  }

  const clean = selected.length === original.length && selected.every(topic => original.includes(topic));

  return <section className="interests-panel reading-interests">
    <h2>{copy.interests}</h2><p>{copy.interestsBody}</p>
    {!loaded ? <p role="status">{copy.interestsLoading}</p> : failed ? <div role="alert"><p>{copy.interestsLoadError}</p><button type="button" className="secondary" onClick={() => { setLoaded(false); setFailed(false); setAttempt(value => value + 1); }}>{copy.retry}</button></div> : <>
      <div className="interest-options" role="group" aria-label={copy.interests}>{topics.map(topic => <button key={topic} type="button" disabled={saving} className={selected.includes(topic) ? 'selected' : ''} aria-pressed={selected.includes(topic)} onClick={() => toggle(topic)}>{selected.includes(topic) ? '✓ ' : '+ '}{t(`topics.${topic}`)}</button>)}</div>
      <div className="reading-interest-actions"><button type="button" className="primary" disabled={saving || clean} onClick={() => void save()}>{saving ? copy.savingInterests : copy.saveInterests}</button><button type="button" className="secondary" disabled={saving || selected.length === 0} onClick={() => { setSelected([]); setSaved(false); setSaveFailure(null); }}>{copy.clearInterests}</button>{!clean && <span className="reading-save-state" role="status">{copy.unsaved}</span>}{saved && <span className="reading-saved" role="status">{copy.interestsSaved}</span>}</div>
      {saveFailure !== null && <p role="alert">{requestFailureMessage(saveFailure, i18n.language, copy.interestsError)}</p>}
    </>}
  </section>;
}
