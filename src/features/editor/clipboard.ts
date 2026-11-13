import type { Editor } from '@tiptap/react';

/**
 * Clipboard and selection helpers for the editor's selection popup.
 *
 * Rich formatting is preserved when the browser can copy the live DOM
 * selection; otherwise the plain selected text is written through the async
 * Clipboard API. Every call site is a user gesture, as required by browsers.
 */

export type ClipboardReadResult =
  { status: 'ok'; text: string } | { status: 'empty' } | { status: 'unavailable' };

/** Whether this browser exposes the async clipboard read API. */
export function canReadClipboard(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function';
}

/** Plain text of the current editor selection (never HTML). */
export function selectionText(editor: Editor): string {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, '\n', ' ');
}

function writeClipboardTextFallback(text: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    return false;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  area.remove();
  return copied;
}

/** Writes plain text to the clipboard, returning whether it succeeded. */
export async function writeClipboardText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path; some browsers block the async API.
  }
  return writeClipboardTextFallback(text);
}

/**
 * Copies the current selection, preferring the browser's native copy so rich
 * formatting (bold, links, colors) survives. Falls back to plain text.
 */
export async function copySelection(editor: Editor): Promise<boolean> {
  if (editor.state.selection.empty) {
    return false;
  }
  if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
    try {
      editor.commands.focus(undefined, { scrollIntoView: false });
      if (document.execCommand('copy')) {
        return true;
      }
    } catch {
      // Fall through to the async clipboard.
    }
  }
  return writeClipboardText(selectionText(editor));
}

/** Reads clipboard text; never throws. */
export async function readClipboardText(): Promise<ClipboardReadResult> {
  if (!canReadClipboard()) {
    return { status: 'unavailable' };
  }
  try {
    const text = await navigator.clipboard.readText();
    return text.trim() ? { status: 'ok', text } : { status: 'empty' };
  } catch {
    return { status: 'unavailable' };
  }
}

/**
 * Inserts clipboard text as plain content: a single line stays inline, multiple
 * lines become paragraphs. Markup from the clipboard is never interpreted.
 */
export function insertPlainText(editor: Editor, text: string): boolean {
  const normalized = text.replace(/\r\n?/g, '\n');
  if (!normalized.trim()) {
    return false;
  }
  const lines = normalized.split('\n');
  try {
    if (lines.length === 1) {
      editor.chain().focus().insertContent({ type: 'text', text: normalized }).run();
      return true;
    }
    const blocks = lines.map((line) =>
      line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' },
    );
    editor.chain().focus().insertContent(blocks).run();
    return true;
  } catch {
    // If the schema rejects block insertion (for example inside a table cell),
    // keep the text rather than losing the paste.
    editor
      .chain()
      .focus()
      .insertContent({ type: 'text', text: normalized.replace(/\n+/g, ' ') })
      .run();
    return true;
  }
}

/**
 * Expands the current selection to the text block (paragraph or heading) that
 * contains its start, so the "Select" action has an obvious, useful meaning.
 */
export function selectContainingBlock(editor: Editor): boolean {
  const { state } = editor;
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (!node.isTextblock) {
      continue;
    }
    const start = $from.before(depth);
    const from = start + 1;
    const to = start + node.nodeSize - 1;
    if (from >= to) {
      return false;
    }
    editor.chain().focus().setTextSelection({ from, to }).run();
    return true;
  }
  return false;
}

/** Platform-aware modifier label for shortcut hints. */
export function shortcutModifier(): string {
  if (typeof navigator === 'undefined') {
    return 'Ctrl';
  }
  return /mac|iphone|ipad|ipod/i.test(navigator.userAgent) ? '⌘' : 'Ctrl';
}
