import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SaveState } from './EditorPanel';
import styles from './SaveStatusIndicator.module.css';

/**
 * Compact persistence indicator. It mirrors the autosave lifecycle reported by
 * the editor: saving while a change is pending or in flight, saved only after
 * the write succeeded, and error when persistence failed.
 */
export function SaveStatusIndicator({ state }: { state: SaveState }) {
  const { t } = useTranslation();
  const label =
    state === 'error'
      ? t('workspace.saveError')
      : state === 'saving'
        ? t('workspace.saving')
        : t('workspace.saved');

  return (
    <span
      className={styles.indicator}
      data-state={state}
      role="status"
      title={label}
      aria-label={label}
    >
      {state === 'saving' ? (
        <Loader2 className={styles.spinner} size={14} aria-hidden="true" />
      ) : state === 'error' ? (
        <AlertCircle size={14} aria-hidden="true" />
      ) : (
        <CheckCircle2 size={14} aria-hidden="true" />
      )}
    </span>
  );
}
