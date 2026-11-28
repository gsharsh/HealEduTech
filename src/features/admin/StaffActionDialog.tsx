import { useEffect, useRef, type ReactNode } from 'react';
import './staff-action-dialog.css';

/** A native modal keeps keyboard focus on the decision and restores it on close. */
export function StaffActionDialog({ title, children, confirmLabel, cancelLabel, busy, confirmDisabled = false, tone = 'default', onConfirm, onCancel }: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  busy: boolean;
  confirmDisabled?: boolean;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return <dialog ref={dialog} className={`staff-action-dialog${tone === 'danger' ? ' staff-action-dialog--danger' : ''}`} aria-labelledby="staff-action-title" aria-describedby="staff-action-description"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="staff-action-title">{title}</h2>
    <div id="staff-action-description">{children}</div>
    <div className="staff-action-dialog__actions">
      <button className="secondary" type="button" disabled={busy} onClick={onCancel} autoFocus>{cancelLabel}</button>
      <button className="primary" type="button" disabled={busy || confirmDisabled} onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </dialog>;
}
