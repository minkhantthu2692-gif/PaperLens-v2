import type { Editor } from '@tiptap/core';

export const FONT_FAMILIES = [
  {
    value: '',
    label: 'Default',
    css: 'Georgia, "Noto Serif Myanmar", serif',
    docx: 'Georgia',
  },
  {
    value: 'Arial',
    label: 'Arial',
    css: 'Arial, "Noto Sans Myanmar", sans-serif',
    docx: 'Arial',
  },
  {
    value: 'Georgia',
    label: 'Georgia',
    css: 'Georgia, "Noto Serif Myanmar", serif',
    docx: 'Georgia',
  },
  {
    value: 'Pyidaungsu',
    label: 'Pyidaungsu',
    css: '"Pyidaungsu", "Noto Sans Myanmar", sans-serif',
    docx: 'Pyidaungsu',
  },
  {
    value: 'Noto Sans Myanmar',
    label: 'Noto Sans Myanmar',
    css: '"Noto Sans Myanmar", Pyidaungsu, sans-serif',
    docx: 'Noto Sans Myanmar',
  },
  {
    value: 'Noto Serif Myanmar',
    label: 'Noto Serif Myanmar',
    css: '"Noto Serif Myanmar", "Myanmar Text", serif',
    docx: 'Noto Serif Myanmar',
  },
] as const;

export const FONT_SIZE_PRESETS = [10, 12, 14, 16, 17, 18, 20, 24, 28, 32, 36, 48] as const;
export const LINE_SPACING_OPTIONS = ['1', '1.15', '1.5', '2'] as const;
const DEFAULT_FONT_SIZE = 17;

export type LineSpacing = (typeof LINE_SPACING_OPTIONS)[number];

export interface TextStyleAttributes {
  fontFamily?: string | null;
  fontSize?: string | null;
  color?: string | null;
}

export function sanitizeFontFamily(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value.length > 160 ||
    !/^[a-zA-Z0-9 _,."'-]+$/.test(value.trim())
  ) {
    return null;
  }
  return value.trim() || null;
}

export function fontFamilyOption(value: unknown): string {
  const family = sanitizeFontFamily(value);
  return FONT_FAMILIES.find((choice) => choice.value && choice.css === family)?.value ?? '';
}

export function cssFontFamily(value: string): string | null {
  return FONT_FAMILIES.find((choice) => choice.value === value && choice.value)?.css ?? null;
}

export function sanitizeFontSize(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }
  const match = /^(\d+(?:\.\d{1,2})?)(px|pt|em|rem)$/i.exec(String(value).trim());
  if (!match) {
    return null;
  }
  const size = Number(match[1]);
  return size >= 6 && size <= 200 ? `${size}${match[2]!.toLowerCase()}` : null;
}

export function sanitizeColor(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const color = value.trim();
  if (/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(color)) {
    return color.toUpperCase();
  }
  if (/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)$/i.test(color)) {
    return color;
  }
  return null;
}

export function colorInputValue(value: unknown, fallback: string): string {
  const color = sanitizeColor(value);
  if (!color) {
    return fallback;
  }
  if (/^#[\da-f]{6}$/i.test(color)) {
    return color.toLowerCase();
  }
  if (/^#[\da-f]{3}$/i.test(color)) {
    return `#${color
      .slice(1)
      .split('')
      .map((digit) => `${digit}${digit}`)
      .join('')
      .toLowerCase()}`;
  }
  const channels = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(color);
  if (!channels) {
    return fallback;
  }
  return `#${channels
    .slice(1, 4)
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, Number(channel))))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

export function colorToDocxHex(value: unknown): string | null {
  const color = colorInputValue(value, '');
  return color ? color.slice(1).toUpperCase() : null;
}

export function fontSizeInputValue(value: unknown): number {
  const size = sanitizeFontSize(value);
  if (!size) {
    return DEFAULT_FONT_SIZE;
  }
  const match = /^([\d.]+)(px|pt|em|rem)$/i.exec(size);
  if (!match) {
    return DEFAULT_FONT_SIZE;
  }
  const amount = Number(match[1]);
  const pixels =
    match[2]!.toLowerCase() === 'pt'
      ? amount * (4 / 3)
      : match[2]!.toLowerCase() === 'px'
        ? amount
        : amount * 16;
  return Math.round(Math.min(96, Math.max(8, pixels)));
}

export function fontSizeToDocxHalfPoints(value: unknown): number | null {
  const size = sanitizeFontSize(value);
  if (!size) {
    return null;
  }
  const match = /^([\d.]+)(px|pt|em|rem)$/i.exec(size);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  const points =
    match[2]!.toLowerCase() === 'pt'
      ? amount
      : match[2]!.toLowerCase() === 'px'
        ? amount * 0.75
        : amount * 12;
  return Math.round(points * 2);
}

export function docxFontFamily(value: unknown): string | null {
  const family = sanitizeFontFamily(value);
  if (!family) {
    return null;
  }
  const primary = family
    .split(',')[0]
    ?.trim()
    .replace(/^['"]|['"]$/g, '')
    .toLowerCase();
  return (
    FONT_FAMILIES.find((choice) => choice.value.toLowerCase() === primary)?.docx ?? primary ?? null
  );
}

export function lineSpacingValue(value: unknown): LineSpacing | null {
  return LINE_SPACING_OPTIONS.find((option) => option === value) ?? null;
}

export function getLineSpacing(editor: Editor): LineSpacing | null {
  const nodeType = editor.isActive('heading') ? 'heading' : 'paragraph';
  return lineSpacingValue(editor.getAttributes(nodeType)['lineSpacing']);
}

export function setTextStyle(editor: Editor, attributes: TextStyleAttributes): void {
  editor.chain().focus().setMark('textStyle', attributes).run();
}

export function setHighlightColor(editor: Editor, color: string): void {
  editor.chain().focus().setMark('highlight', { color }).run();
}

export function setLineSpacing(editor: Editor, spacing: LineSpacing | null): void {
  const { state } = editor;
  const { selection } = state;
  const blockTypes = new Set(['paragraph', 'heading']);
  const positions = new Set<number>();

  if (selection.empty) {
    for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
      if (blockTypes.has(selection.$from.node(depth).type.name)) {
        positions.add(selection.$from.before(depth));
      }
    }
  } else {
    state.doc.nodesBetween(selection.from, selection.to, (node, position) => {
      if (blockTypes.has(node.type.name)) {
        positions.add(position);
      }
    });
  }

  let transaction = state.tr;
  for (const position of positions) {
    const node = transaction.doc.nodeAt(position);
    if (node && blockTypes.has(node.type.name)) {
      transaction = transaction.setNodeMarkup(position, undefined, {
        ...node.attrs,
        lineSpacing: spacing,
      });
    }
  }
  if (transaction.docChanged) {
    editor.view.dispatch(transaction);
  }
}

export function defaultFontSize(): number {
  return DEFAULT_FONT_SIZE;
}
