import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editor } from '@tiptap/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import i18n from '@/i18n';
import { createEditorExtensions } from './extensions';
import { SelectionToolbar } from './SelectionToolbar';

let editor: Editor;

function setSelection(from: number, to: number) {
  act(() => {
    editor.commands.setTextSelection({ from, to });
  });
}

function installClipboard(options: { text?: string; readError?: boolean } = {}) {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const readText = options.readError
    ? vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    : vi.fn().mockResolvedValue(options.text ?? '');

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText, readText },
  });
  return { writeText, readText };
}

async function openPopup() {
  render(<SelectionToolbar editor={editor} />);
  setSelection(1, 6);
  return screen.findByRole('toolbar', { name: 'Selection actions' });
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  const element = document.createElement('div');
  document.body.append(element);
  editor = new Editor({
    element,
    extensions: createEditorExtensions(''),
    content: '<p>Hello world</p><p>Second line</p>',
  });
  vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({
    top: 100,
    bottom: 120,
    left: 40,
    right: 140,
  });
});

afterEach(() => {
  editor.destroy();
  Reflect.deleteProperty(navigator, 'clipboard');
  vi.restoreAllMocks();
});

describe('selection popup actions', () => {
  it('shows clipboard and formatting groups near the selection', async () => {
    const popup = await openPopup();

    expect(popup).toHaveAttribute('aria-orientation', 'vertical');
    const clipboard = within(popup).getByRole('group', { name: 'Clipboard actions' });
    expect(
      within(clipboard)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Cut', 'Copy', 'Paste', 'Select paragraph', 'Select all']);
    expect(within(popup).getByRole('group', { name: 'Text formatting' })).toBeInTheDocument();
    expect(within(popup).getByRole('button', { name: 'Bold' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('copies the selected text and reports success', async () => {
    const { writeText } = installClipboard();
    const popup = await openPopup();

    await userEvent.click(within(popup).getByRole('button', { name: 'Copy' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Hello'));
    expect(await within(popup).findByText('Copied to clipboard.')).toBeInTheDocument();
    expect(editor.getText()).toContain('Hello world');
  });

  it('cuts the selection only after it was copied', async () => {
    const { writeText } = installClipboard();
    const popup = await openPopup();

    await userEvent.click(within(popup).getByRole('button', { name: 'Cut' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Hello'));
    await waitFor(() => expect(editor.getText()).not.toContain('Hello'));
    expect(editor.getText()).toContain('Second line');
  });

  it('pastes clipboard text as plain content', async () => {
    installClipboard({ text: '<b>Pasted</b> words' });
    const popup = await openPopup();

    await userEvent.click(within(popup).getByRole('button', { name: 'Paste' }));

    await waitFor(() => expect(editor.getText()).toContain('<b>Pasted</b> words'));
    expect(editor.getHTML()).not.toContain('<b>');
    expect(editor.getHTML()).toContain('&lt;b&gt;Pasted&lt;/b&gt;');
  });

  it('pastes multi-line clipboard text as paragraphs', async () => {
    installClipboard({ text: 'First line\nSecond line' });
    const popup = await openPopup();

    await userEvent.click(within(popup).getByRole('button', { name: 'Paste' }));

    await waitFor(() => expect(editor.getHTML()).toContain('>Second line</p>'));
    expect(editor.getHTML()).toContain('>First line</p>');
    // The paste replaces the selected word and keeps the rest of the document.
    expect(editor.getText()).not.toContain('Hello');
    expect(editor.getText()).toContain('world');
  });

  it('explains when the browser blocks clipboard reads', async () => {
    installClipboard({ readError: true });
    const popup = await openPopup();

    await userEvent.click(within(popup).getByRole('button', { name: 'Paste' }));

    expect(await within(popup).findByText(/Paste is blocked by the browser/)).toBeInTheDocument();
    expect(editor.getText()).toContain('Hello world');
  });

  it('disables Paste when the clipboard API is unavailable', async () => {
    const popup = await openPopup();
    expect(within(popup).getByRole('button', { name: 'Paste' })).toBeDisabled();
  });

  it('selects the paragraph around the selection', async () => {
    const popup = await openPopup();

    await userEvent.click(within(popup).getByRole('button', { name: 'Select paragraph' }));

    expect(editor.state.selection.from).toBe(1);
    expect(editor.state.selection.to).toBe(1 + 'Hello world'.length);
    expect(editor.state.doc.textBetween(1, editor.state.selection.to)).toBe('Hello world');
  });

  it('selects the whole document', async () => {
    const popup = await openPopup();

    await userEvent.click(within(popup).getByRole('button', { name: 'Select all' }));

    expect(editor.state.selection.to).toBe(editor.state.doc.content.size);
  });

  it('closes on Escape and returns focus to the editor', async () => {
    const popup = await openPopup();
    const bold = within(popup).getByRole('button', { name: 'Bold' });
    bold.focus();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('toolbar', { name: 'Selection actions' })).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(editor.view.dom));
  });
});
