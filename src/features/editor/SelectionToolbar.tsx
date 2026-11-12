import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type KeyboardEvent,
} from 'react';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Italic,
  List,
  ListOrdered,
  MoreHorizontal,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { getParagraphAlignment } from '@/domain/paragraphAlignment';
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
import styles from './SelectionToolbar.module.css';

interface ToolbarPosition {
  left: number;
  top: number;
}

export function SelectionToolbar({ editor }: { editor: Editor }) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const dismissedSelectionRef = useRef('');
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [, setRevision] = useState(0);

  const updatePosition = useCallback(() => {
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      dismissedSelectionRef.current = '';
      setPosition(null);
      return;
    }

    const selectionKey = `${from}:${to}`;
    if (dismissedSelectionRef.current && dismissedSelectionRef.current !== selectionKey) {
      dismissedSelectionRef.current = '';
    }
    if (dismissedSelectionRef.current === selectionKey) {
      setPosition(null);
      return;
    }

    try {
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const menu = menuRef.current?.getBoundingClientRect();
      const width = menu?.width || 360;
      const height = menu?.height || 44;
      const left = Math.max(
        8,
        Math.min(window.innerWidth - width - 8, (start.left + end.right) / 2 - width / 2),
      );
      const above = start.top - height - 8;
      const below = end.bottom + 8;
      const top = Math.max(
        8,
        Math.min(window.innerHeight - height - 8, above >= 8 ? above : below),
      );
      setPosition({ left, top });
    } catch {
      setPosition(null);
    }
  }, [editor]);

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
      if (editor.view.dom.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      const { from, to } = editor.state.selection;
      dismissedSelectionRef.current = `${from}:${to}`;
      setPosition(null);
      setMoreOpen(false);
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
    if (!position || !menuRef.current || typeof ResizeObserver !== 'function') {
      return;
    }
    const observer = new ResizeObserver(updatePosition);
    observer.observe(menuRef.current);
    return () => observer.disconnect();
  }, [position, moreOpen, updatePosition]);

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest('input, select')) {
      return;
    }
    event.preventDefault();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setMoreOpen(false);
      setPosition(null);
    }
  };

  if (!position) {
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

  return (
    <div
      ref={menuRef}
      className={styles.toolbar}
      role="toolbar"
      aria-label={t('editor.selectionFormatting')}
      style={{ left: position.left, top: position.top }}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    >
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
      <FontSizeControl
        value={fontSize}
        label={t('editor.fontSize')}
        decreaseLabel={t('editor.decreaseFontSize')}
        increaseLabel={t('editor.increaseFontSize')}
        onChange={(size) => setTextStyle(editor, { fontSize: `${size}px` })}
      />
      <ColorControl
        value={color}
        label={t('editor.textColor')}
        onChange={(nextColor) => setTextStyle(editor, { color: nextColor })}
      />
      <ColorControl
        value={highlightColor}
        label={t('editor.highlightColor')}
        onChange={(nextColor) => setHighlightColor(editor, nextColor)}
      />
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        className={moreOpen ? styles.active : undefined}
        onClick={() => setMoreOpen((value) => !value)}
        aria-label={t('editor.moreFormatting')}
        title={t('editor.moreFormatting')}
        aria-expanded={moreOpen}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </Button>
      {moreOpen ? (
        <div className={styles.more} role="group" aria-label={t('editor.moreFormatting')}>
          <FontFamilyControl
            value={fontFamily}
            label={t('editor.fontFamily')}
            onChange={(value) => setTextStyle(editor, { fontFamily: cssFontFamily(value) })}
          />
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
          <select
            className={styles.lineSpacing}
            value={spacing ?? ''}
            aria-label={t('editor.lineSpacing')}
            title={t('editor.lineSpacing')}
            onChange={(event) => {
              const next = event.target.value;
              setLineSpacing(editor, lineSpacingValue(next));
            }}
          >
            <option value="">{t('editor.lineSpacingDefault')}</option>
            <option value="1">1.0</option>
            <option value="1.15">1.15</option>
            <option value="1.5">1.5</option>
            <option value="2">2.0</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            aria-label={t('editor.clearFormatting')}
            title={t('editor.clearFormatting')}
          >
            <Eraser size={15} aria-hidden="true" />
            {t('editor.clearFormatting')}
          </Button>
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
        </div>
      ) : null}
    </div>
  );
}
