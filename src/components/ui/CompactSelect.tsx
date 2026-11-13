import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';
import styles from './CompactSelect.module.css';

export interface CompactSelectOption {
  value: string;
  label: string;
}

interface PopupPosition {
  left: number;
  top: number;
  width: number;
  side: 'above' | 'below';
}

interface CompactSelectProps {
  ariaLabel: string;
  value: string;
  options: readonly CompactSelectOption[];
  onChange: (value: string) => void;
  className?: string | undefined;
}

const VIEWPORT_GUTTER = 8;
const MENU_MIN_WIDTH = 176;
const MENU_MAX_HEIGHT = 256;

function getPopupPosition(trigger: HTMLButtonElement, optionCount: number): PopupPosition {
  const bounds = trigger.getBoundingClientRect();
  const width = Math.min(
    Math.max(bounds.width, MENU_MIN_WIDTH),
    Math.max(0, window.innerWidth - VIEWPORT_GUTTER * 2),
  );
  const height = Math.min(
    optionCount * 36 + 8,
    MENU_MAX_HEIGHT,
    Math.max(0, window.innerHeight - VIEWPORT_GUTTER * 2),
  );
  const left = Math.max(
    VIEWPORT_GUTTER,
    Math.min(bounds.left, window.innerWidth - width - VIEWPORT_GUTTER),
  );
  const spaceBelow = window.innerHeight - bounds.bottom;
  const side = spaceBelow < height + VIEWPORT_GUTTER && bounds.top > height ? 'above' : 'below';
  const top =
    side === 'above'
      ? Math.max(VIEWPORT_GUTTER, bounds.top - height - 4)
      : Math.min(bounds.bottom + 4, window.innerHeight - height - VIEWPORT_GUTTER);
  return { left, top, width, side };
}

export function CompactSelect({
  ariaLabel,
  value,
  options,
  onChange,
  className,
}: CompactSelectProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<PopupPosition | null>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const activeOption = options[activeIndex];
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (trigger) {
      setPosition(getPopupPosition(trigger, options.length));
    }
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const menu = menuRef.current;
    const activeOption = menu?.querySelector<HTMLElement>(`[id="${id}-option-${activeIndex}"]`);
    activeOption?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, id, open]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const openMenu = (index = selectedIndex >= 0 ? selectedIndex : 0) => {
    setActiveIndex(Math.max(0, Math.min(index, options.length - 1)));
    setPosition(triggerRef.current ? getPopupPosition(triggerRef.current, options.length) : null);
    setOpen(true);
  };

  const closeMenu = (restoreFocus: boolean) => {
    setOpen(false);
    setPosition(null);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  const chooseOption = (index: number) => {
    const option = options[index];
    if (!option) {
      return;
    }
    onChange(option.value);
    closeMenu(true);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openMenu(
          selectedIndex >= 0 ? selectedIndex : event.key === 'ArrowDown' ? 0 : options.length - 1,
        );
        return;
      }
      setActiveIndex((index) =>
        event.key === 'ArrowDown'
          ? Math.min(options.length - 1, index + 1)
          : Math.max(0, index - 1),
      );
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (!open) {
        openMenu(event.key === 'Home' ? 0 : options.length - 1);
      } else {
        setActiveIndex(event.key === 'Home' ? 0 : options.length - 1);
      }
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) {
        chooseOption(activeIndex);
      } else {
        openMenu();
      }
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === 'Tab' && open) {
      closeMenu(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        className={clsx(styles.trigger, className)}
        data-compact-select-trigger=""
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-listbox` : undefined}
        aria-activedescendant={open && activeOption ? `${id}-option-${activeIndex}` : undefined}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.value}>{selectedOption?.label ?? value}</span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={clsx(styles.chevron, open && styles.chevronOpen)}
        />
      </button>
      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              id={`${id}-listbox`}
              role="listbox"
              aria-label={ariaLabel}
              className={styles.menu}
              data-compact-select-menu=""
              data-side={position.side}
              style={{
                left: position.left,
                top: position.top,
                width: position.width,
              }}
            >
              {options.map((option, index) => {
                const selected = option.value === value;
                return (
                  <div
                    key={option.value}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={selected}
                    className={styles.option}
                    data-active={index === activeIndex}
                    onClick={() => chooseOption(index)}
                  >
                    <span className={styles.optionLabel}>{option.label}</span>
                    {selected ? <Check size={15} aria-hidden="true" /> : null}
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
