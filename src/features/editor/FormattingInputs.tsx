import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Highlighter, Minus, Palette, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CompactSelect } from '@/components/ui/CompactSelect';
import { FONT_FAMILIES, FONT_SIZE_PRESETS } from './formatting';
import styles from './FormattingInputs.module.css';

export function FontFamilyControl({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <CompactSelect
      className={`${styles.select} ${styles.fontFamilySelect}`}
      value={value}
      ariaLabel={label}
      options={FONT_FAMILIES.map((family) => ({
        value: family.value,
        label: family.label,
      }))}
      onChange={onChange}
    />
  );
}

export function FontSizeControl({
  value,
  label,
  decreaseLabel,
  increaseLabel,
  decreaseToolbarLabel,
  increaseToolbarLabel,
  onChange,
  showSteps = false,
}: {
  value: number;
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  decreaseToolbarLabel?: string;
  increaseToolbarLabel?: string;
  onChange: (value: number) => void;
  showSteps?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft(String(value));
    }
  }, [value]);

  const applyDraft = () => {
    const size = Number(draft);
    if (Number.isInteger(size) && size >= 8 && size <= 96) {
      onChange(size);
      setDraft(String(size));
    } else {
      setDraft(String(value));
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyDraft();
      inputRef.current?.blur();
    }
  };

  const applySize = (size: number) => {
    onChange(size);
    setDraft(String(size));
  };
  const sizeOptions = FONT_SIZE_PRESETS.map((size) => ({
    value: String(size),
    label: String(size),
  }));
  if (!sizeOptions.some((option) => option.value === String(value))) {
    sizeOptions.unshift({ value: String(value), label: String(value) });
  }

  return (
    <div className={styles.fontSizeControl}>
      {showSteps ? (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          {...(showSteps ? { toolbarLabel: decreaseToolbarLabel ?? decreaseLabel } : {})}
          onClick={() => applySize(Math.max(8, value - 1))}
          aria-label={decreaseLabel}
          title={decreaseLabel}
          disabled={value <= 8}
        >
          <Minus size={15} aria-hidden="true" />
        </Button>
      ) : null}
      <CompactSelect
        className={`${styles.select} ${styles.sizeSelect}`}
        value={String(value)}
        ariaLabel={label}
        options={sizeOptions}
        onChange={(size) => applySize(Number(size))}
      />
      <input
        ref={inputRef}
        className={styles.sizeInput}
        type="number"
        min={8}
        max={96}
        step={1}
        value={draft}
        aria-label={label}
        title={label}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={applyDraft}
        onKeyDown={handleKeyDown}
      />
      {showSteps ? (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          {...(showSteps ? { toolbarLabel: increaseToolbarLabel ?? increaseLabel } : {})}
          onClick={() => applySize(Math.min(96, value + 1))}
          aria-label={increaseLabel}
          title={increaseLabel}
          disabled={value >= 96}
        >
          <Plus size={15} aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}

export function ColorControl({
  value,
  label,
  onChange,
  highlight = false,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
  highlight?: boolean;
}) {
  return (
    <label className={styles.colorControl} title={label}>
      <span className={styles.colorIcon} style={{ backgroundColor: value }}>
        {highlight ? (
          <Highlighter size={15} aria-hidden="true" />
        ) : (
          <Palette size={15} aria-hidden="true" />
        )}
      </span>
      <input
        type="color"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
