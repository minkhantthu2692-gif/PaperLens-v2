import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ClipboardPaste,
  Copy,
  Eraser,
  Italic,
  List,
  ListOrdered,
  MoreHorizontal,
  Pilcrow,
  Scissors,
  Strikethrough,
  TextSelect,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { CompactSelect } from '@/components/ui/CompactSelect';
import { getParagraphAlignment } from '@/domain/paragraphAlignment';
import {
  canReadClipboard,
  copySelection,
  insertPlainText,
  readClipboardText,
  selectContainingBlock,
  shortcutModifier,
} from './clipboard';
import {
  colorInputValue,
  cssFontFamily,
  fontFamilyOption,
  fontSizeInputValue,
  getLineSpacing,
  lineSpacingValue,
  setHighlightColor,
  setLineSpacing,
  setTextStyle,
} from './formatting';
import { ColorControl, FontFamilyControl, FontSizeControl } from './FormattingInputs';
import {
  placeSelectionPopup,
  prefersSelectionToolbarBelow,
  type SelectionPopupPlacement,
} from './nativeSelection';
import styles from './SelectionToolbar.module.css';

type StatusTone = 'info' | 'success' | 'error';

interface StatusMessage {
  message: string;
  tone: StatusTone;
}

function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    setFine(query.matches);
    const update = (event: MediaQueryListEvent) => setFine(event.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return fine;
}

function ActionRow({
  icon,
  label,
  shortcut,
  disabled,
  onSelect,
}: {
  icon: ReactNode;
  label: string;
  shortcut?: string | undefined;
  disabled?: boolean | undefined;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.action}
      onClick={onSelect}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <span className={styles.actionIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.actionLabel}>{label}</span>
      {shortcut ? (
        <kbd className={styles.shortcut} aria-hidden="true">
          {shortcut}
        </kbd>
      ) : null}
    </button>
  );
}

function LabeledRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel} aria-hidden="true">
        {label}
      </span>
      <div className={styles.rowControls}>{children}</div>
    </div>
  );
}

export function SelectionToolbar({
  editor,
  avoidRef,
}: {
  editor: Editor;
  /** Editor chrome (such as the main toolbar) the popup must not cover. */
  avoidRef?: RefObject<HTMLElement>;
}) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const dismissedSelectionRef = useRef('');
  const lastSelectionKeyRef = useRef('');
  const statusTimerRef = useRef<number | null>(null);
  const [placement, setPlacement] = useState<SelectionPopupPlacement | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [pastePending, setPastePending] = useState(false);
  const [, setRevision] = useState(0);
  const showShortcuts = useFinePointer();
  const canPaste = canReadClipboard();
  const modifier = shortcutModifier();

  const updatePosition = useCallback(() => {
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      dismissedSelectionRef.current = '';
      setPlacement(null);
      return;
    }

    const selectionKey = `${from}:${to}`;
    if (lastSelectionKeyRef.current !== selectionKey) {
      lastSelectionKeyRef.current = selectionKey;
      setStatus(null);
      if (dismissedSelectionRef.current) {
        dismissedSelectionRef.current = '';
      }
    }
    if (dismissedSelectionRef.current === selectionKey) {
      setPlacement(null);
      return;
    }

    try {
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const menu = menuRef.current?.getBoundingClientRect();
      const avoid = avoidRef?.current?.getBoundingClientRect();
      setPlacement(
        placeSelectionPopup({
          anchor: { left: start.left, right: start.right, top: start.top, bottom: end.bottom },
          popupWidth: menu?.width || 248,
          popupHeight: menu?.height || 300,
          viewportWidth: window.innerWidth,
          viewportHeight: window.visualViewport?.height ?? window.innerHeight,
          // On touch devices the native selection toolbar sits above the
          // selection, so staying below it keeps our popup reachable.
          preferBelow: prefersSelectionToolbarBelow(),
          topInset: avoid ? avoid.bottom + 4 : 8,
        }),
      );
    } catch {
      setPlacement(null);
    }
  }, [editor, avoidRef]);

  useEffect(() => {
    const syncSelection = () => {
      setRevision((value) => value + 1);
      updatePosition();
    };
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        editor.view.dom.contains(target) ||
        menuRef.current?.contains(target) ||
        (target instanceof Element && target.closest('[data-compact-select-menu]'))
      ) {
        return;
      }
      const { from, to } = editor.state.selection;
      dismissedSelectionRef.current = `${from}:${to}`;
      setPlacement(null);
      setMoreOpen(false);
      setStatus(null);
    };

    editor.on('selectionUpdate', syncSelection);
    editor.on('transaction', syncSelection);
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('scroll', syncSelection, true);
    window.addEventListener('resize', syncSelection);
    window.visualViewport?.addEventListener('resize', syncSelection);
    syncSelection();

    return () => {
      editor.off('selectionUpdate', syncSelection);
      editor.off('transaction', syncSelection);
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('scroll', syncSelection, true);
      window.removeEventListener('resize', syncSelection);
      window.visualViewport?.removeEventListener('resize', syncSelection);
    };
  }, [editor, updatePosition]);

  useEffect(() => {
    if (!placement || !menuRef.current || typeof ResizeObserver !== 'function') {
      return;
    }
    const observer = new ResizeObserver(updatePosition);
    observer.observe(menuRef.current);
    return () => observer.disconnect();
  }, [placement, moreOpen, updatePosition]);

  useEffect(
    () => () => {
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
    },
    [],
  );

  const showStatus = useCallback((message: string, tone: StatusTone) => {
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
    }
    setStatus({ message, tone });
    statusTimerRef.current = window.setTimeout(() => {
      statusTimerRef.current = null;
      setStatus(null);
    }, 2600);
  }, []);

  const dismiss = useCallback(() => {
    const { from, to } = editor.state.selection;
    dismissedSelectionRef.current = `${from}:${to}`;
    setPlacement(null);
    setStatus(null);
  }, [editor]);

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest('input, select')) {
      return;
    }
    event.preventDefault();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      editor.commands.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest('select, input')) {
      return;
    }
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select, input') ?? [],
    );
    if (items.length === 0) {
      return;
    }
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = (current + delta + items.length) % items.length;
    items[next]?.focus();
  };

  const handleCopy = () => {
    void (async () => {
      const copied = await copySelection(editor);
      showStatus(
        copied ? t('editor.clipboardCopied') : t('editor.clipboardCopyFailed'),
        copied ? 'success' : 'error',
      );
    })();
  };

  const handleCut = () => {
    void (async () => {
      const copied = await copySelection(editor);
      if (!copied) {
        showStatus(t('editor.clipboardCopyFailed'), 'error');
        return;
      }
      editor.chain().focus().deleteSelection().run();
      showStatus(t('editor.clipboardCut'), 'success');
    })();
  };

  const handlePaste = () => {
    if (pastePending) {
      return;
    }
    setPastePending(true);
    void (async () => {
      const result = await readClipboardText();
      setPastePending(false);
      if (result.status === 'unavailable') {
        showStatus(t('editor.clipboardPasteBlocked'), 'error');
        return;
      }
      if (result.status === 'empty') {
        showStatus(t('editor.clipboardEmpty'), 'info');
        return;
      }
      if (!insertPlainText(editor, result.text)) {
        showStatus(t('editor.clipboardEmpty'), 'info');
        return;
      }
      showStatus(t('editor.clipboardPasted'), 'success');
    })();
  };

  const handleSelectBlock = () => {
    if (!selectContainingBlock(editor)) {
      showStatus(t('editor.clipboardSelectFailed'), 'info');
    }
  };

  const handleSelectAll = () => {
    editor.chain().focus().selectAll().run();
  };

  if (!placement || typeof document === 'undefined') {
    return null;
  }

  const textStyle = editor.getAttributes('textStyle');
  const fontSize = fontSizeInputValue(textStyle['fontSize']);
  const fontFamily = fontFamilyOption(textStyle['fontFamily']);
  const color = colorInputValue(textStyle['color'], '#1f2937');
  const highlight = editor.getAttributes('highlight');
  const highlightColor = colorInputValue(highlight['color'], '#ffff00');
  const spacing = getLineSpacing(editor);
  const alignmentNode = editor.isActive('heading') ? 'heading' : 'paragraph';
  const alignment = getParagraphAlignment(editor.getAttributes(alignmentNode).textAlign);
  const selectionEmpty = editor.state.selection.empty;

  return createPortal(
    <div
      ref={menuRef}
      className={styles.popup}
      role="toolbar"
      aria-orientation="vertical"
      aria-label={t('editor.selectionMenu')}
      data-side={placement.side}
      style={{ left: placement.left, top: placement.top, maxHeight: placement.maxHeight }}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.group} role="group" aria-label={t('editor.clipboardGroup')}>
        <ActionRow
          icon={<Scissors size={15} />}
          label={t('editor.cut')}
          shortcut={showShortcuts ? `${modifier}+X` : undefined}
          disabled={selectionEmpty}
          onSelect={handleCut}
        />
        <ActionRow
          icon={<Copy size={15} />}
          label={t('editor.copy')}
          shortcut={showShortcuts ? `${modifier}+C` : undefined}
          disabled={selectionEmpty}
          onSelect={handleCopy}
        />
        <ActionRow
          icon={<ClipboardPaste size={15} />}
          label={pastePending ? t('editor.pasting') : t('editor.paste')}
          disabled={!canPaste || pastePending}
          onSelect={handlePaste}
        />
        <ActionRow
          icon={<Pilcrow size={15} />}
          label={t('editor.selectBlock')}
          onSelect={handleSelectBlock}
        />
        <ActionRow
          icon={<TextSelect size={15} />}
          label={t('editor.selectAll')}
          shortcut={showShortcuts ? `${modifier}+A` : undefined}
          onSelect={handleSelectAll}
        />
        {canPaste ? null : <p className={styles.hint}>{t('editor.clipboardUnavailable')}</p>}
      </div>

      <div className={styles.separator} role="separator" aria-hidden="true" />

      <div className={styles.group} role="group" aria-label={t('editor.formatGroup')}>
        <LabeledRow label={t('editor.style')}>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className={editor.isActive('bold') ? styles.active : undefined}
            onClick={() => editor.chain().focus().toggleBold().run()}
            aria-label={t('editor.bold')}
            title={t('editor.bold')}
            aria-pressed={editor.isActive('bold')}
          >
            <Bold size={15} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className={editor.isActive('italic') ? styles.active : undefined}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            aria-label={t('editor.italic')}
            title={t('editor.italic')}
            aria-pressed={editor.isActive('italic')}
          >
            <Italic size={15} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className={editor.isActive('underline') ? styles.active : undefined}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            aria-label={t('editor.underline')}
            title={t('editor.underline')}
            aria-pressed={editor.isActive('underline')}
          >
            <UnderlineIcon size={15} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className={editor.isActive('strike') ? styles.active : undefined}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            aria-label={t('editor.strike')}
            title={t('editor.strike')}
            aria-pressed={editor.isActive('strike')}
          >
            <Strikethrough size={15} aria-hidden="true" />
          </Button>
        </LabeledRow>

        <LabeledRow label={t('editor.font')}>
          <FontFamilyControl
            value={fontFamily}
            label={t('editor.fontFamily')}
            onChange={(value) => setTextStyle(editor, { fontFamily: cssFontFamily(value) })}
          />
        </LabeledRow>

        <LabeledRow label={t('editor.size')}>
          <FontSizeControl
            value={fontSize}
            label={t('editor.fontSize')}
            decreaseLabel={t('editor.decreaseFontSize')}
            increaseLabel={t('editor.increaseFontSize')}
            onChange={(size) => setTextStyle(editor, { fontSize: `${size}px` })}
          />
        </LabeledRow>

        <LabeledRow label={t('editor.color')}>
          <ColorControl
            value={color}
            label={t('editor.textColor')}
            onChange={(nextColor) => setTextStyle(editor, { color: nextColor })}
          />
          <ColorControl
            value={highlightColor}
            label={t('editor.highlightColor')}
            highlight
            onChange={(nextColor) => setHighlightColor(editor, nextColor)}
          />
        </LabeledRow>

        <button
          type="button"
          className={`${styles.action} ${styles.moreToggle}`}
          onClick={() => setMoreOpen((value) => !value)}
          aria-label={t('editor.moreFormatting')}
          title={t('editor.moreFormatting')}
          aria-expanded={moreOpen}
          aria-controls="editor-selection-more"
        >
          <span className={styles.actionIcon} aria-hidden="true">
            <MoreHorizontal size={15} />
          </span>
          <span className={styles.actionLabel}>{t('editor.moreFormatting')}</span>
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`${styles.chevron} ${moreOpen ? styles.chevronOpen : ''}`}
          />
        </button>

        {moreOpen ? (
          <div
            id="editor-selection-more"
            className={styles.secondary}
            role="group"
            aria-label={t('editor.moreFormatting')}
          >
            <LabeledRow label={t('editor.lineSpacing')}>
              <CompactSelect
                className={styles.select}
                value={spacing ?? ''}
                ariaLabel={t('editor.lineSpacing')}
                options={[
                  { value: '', label: t('editor.lineSpacingDefault') },
                  { value: '1', label: '1.0' },
                  { value: '1.15', label: '1.15' },
                  { value: '1.5', label: '1.5' },
                  { value: '2', label: '2.0' },
                ]}
                onChange={(value) => {
                  setLineSpacing(editor, lineSpacingValue(value));
                }}
              />
            </LabeledRow>

            <LabeledRow label={t('editor.list')}>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                className={editor.isActive('bulletList') ? styles.active : undefined}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                aria-label={t('editor.bulletList')}
                title={t('editor.bulletList')}
                aria-pressed={editor.isActive('bulletList')}
              >
                <List size={15} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                className={editor.isActive('orderedList') ? styles.active : undefined}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                aria-label={t('editor.orderedList')}
                title={t('editor.orderedList')}
                aria-pressed={editor.isActive('orderedList')}
              >
                <ListOrdered size={15} aria-hidden="true" />
              </Button>
            </LabeledRow>

            <LabeledRow label={t('editor.alignment')}>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                className={alignment === 'left' ? styles.active : undefined}
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                aria-label={t('editor.alignLeft')}
                title={t('editor.alignLeft')}
                aria-pressed={alignment === 'left'}
              >
                <AlignLeft size={15} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                className={alignment === 'center' ? styles.active : undefined}
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                aria-label={t('editor.alignCenter')}
                title={t('editor.alignCenter')}
                aria-pressed={alignment === 'center'}
              >
                <AlignCenter size={15} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                className={alignment === 'right' ? styles.active : undefined}
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                aria-label={t('editor.alignRight')}
                title={t('editor.alignRight')}
                aria-pressed={alignment === 'right'}
              >
                <AlignRight size={15} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                className={alignment === 'justify' ? styles.active : undefined}
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                aria-label={t('editor.alignJustify')}
                title={t('editor.alignJustify')}
                aria-pressed={alignment === 'justify'}
              >
                <AlignJustify size={15} aria-hidden="true" />
              </Button>
            </LabeledRow>

            <button
              type="button"
              className={styles.action}
              onClick={() => editor.chain().focus().unsetAllMarks().run()}
              aria-label={t('editor.clearFormatting')}
              title={t('editor.clearFormatting')}
            >
              <span className={styles.actionIcon} aria-hidden="true">
                <Eraser size={15} />
              </span>
              <span className={styles.actionLabel}>{t('editor.clearFormatting')}</span>
            </button>
          </div>
        ) : null}
      </div>

      {status ? (
        <p className={styles.status} data-tone={status.tone} role="status" aria-live="polite">
          {status.message}
        </p>
      ) : null}
    </div>,
    document.body,
  );
}
