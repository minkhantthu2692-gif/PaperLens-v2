import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';
import type { Editor } from '@tiptap/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import i18n from '@/i18n';
import type { EditorContent } from '@/domain/document';
import { EditorPanel } from './EditorPanel';

const initialContent: EditorContent = {
  html: '<p>First paragraph</p><p>Second paragraph</p>',
  text: 'First paragraph\n\nSecond paragraph',
  json: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'First paragraph' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph' }] },
    ],
  },
};

function renderEditor(
  onEditor: (editor: Editor | null) => void = () => undefined,
  content: EditorContent = initialContent,
) {
  return render(
    <EditorPanel
      documentId="alignment-test"
      initialContent={content}
      onEditorReady={onEditor}
      onSaveStateChange={() => undefined}
      onAiRequest={() => undefined}
    />,
  );
}

function requireEditor(editor: Editor | null): Editor {
  if (!editor) {
    throw new Error('The editor did not mount');
  }
  return editor;
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('Editor paragraph alignment', () => {
  it('uses inline labels for toolbar buttons without native tooltips', () => {
    renderEditor();

    const toolbar = screen.getByRole('toolbar', { name: 'Document editor' });
    const bold = within(toolbar).getByRole('button', { name: 'Bold' });
    const more = within(toolbar).getByRole('button', { name: 'More formatting options' });

    expect(bold).toHaveAttribute('data-toolbar-expandable', '');
    expect(bold).not.toHaveAttribute('title');
    expect(within(bold).getByText('Bold')).toBeInTheDocument();
    expect(within(more).getByText('More')).toBeInTheDocument();
  });

  it('places finder and assistant beside translator in the panel header', () => {
    render(
      <EditorPanel
        documentId="alignment-test"
        initialContent={initialContent}
        headerActions={<Button aria-label="Translator">Translate</Button>}
        onEditorReady={() => undefined}
        onSaveStateChange={() => undefined}
        onAiRequest={() => undefined}
      />,
    );

    const header = screen.getByRole('group', { name: 'Editor actions' });
    expect(
      within(header)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Find in document', 'AI assistant', 'Translator']);
    const toolbar = screen.getByRole('toolbar', { name: 'Document editor' });
    expect(toolbar).not.toContainElement(screen.getByRole('button', { name: 'Find in document' }));
    expect(toolbar).not.toContainElement(screen.getByRole('button', { name: 'AI assistant' }));
  });

  it('offers four alignments and aligns the current paragraph', async () => {
    const user = userEvent.setup();
    renderEditor();
    const toolbar = screen.getByRole('toolbar', { name: 'Document editor' });
    await user.click(within(toolbar).getByRole('button', { name: 'More formatting options' }));
    const more = within(document.getElementById('editor-secondary-formatting-controls')!);

    const leftButton = more.getByRole('button', { name: 'Align left' });
    expect(leftButton).toHaveAttribute('aria-pressed', 'true');
    expect(more.getByRole('button', { name: 'Align center' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(more.getByRole('button', { name: 'Align right' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await user.click(more.getByRole('button', { name: 'Justify' }));

    expect(screen.getByText('First paragraph').closest('p')).toHaveStyle({
      textAlign: 'justify',
    });
    expect(more.getByRole('button', { name: 'Justify' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies alignment to all selected paragraphs', async () => {
    const user = userEvent.setup();
    let editor: Editor | null = null;
    renderEditor((readyEditor) => {
      editor = readyEditor;
    });

    await waitFor(() => expect(editor).not.toBeNull());
    act(() => {
      editor?.commands.selectAll();
    });
    const toolbar = screen.getByRole('toolbar', { name: 'Document editor' });
    await user.click(within(toolbar).getByRole('button', { name: 'More formatting options' }));
    await user.click(
      within(document.getElementById('editor-secondary-formatting-controls')!).getByRole('button', {
        name: 'Align center',
      }),
    );

    expect(screen.getByText('First paragraph').closest('p')).toHaveStyle({
      textAlign: 'center',
    });
    expect(screen.getByText('Second paragraph').closest('p')).toHaveStyle({
      textAlign: 'center',
    });
    expect(
      within(document.getElementById('editor-secondary-formatting-controls')!).getByRole('button', {
        name: 'Align center',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens the AI assistant from the panel header with the current selection', async () => {
    const user = userEvent.setup();
    const onAiRequest = vi.fn();
    let editor: Editor | null = null;
    render(
      <EditorPanel
        documentId="ai-test"
        initialContent={initialContent}
        onEditorReady={(readyEditor) => {
          editor = readyEditor;
        }}
        onSaveStateChange={() => undefined}
        onAiRequest={onAiRequest}
      />,
    );

    await waitFor(() => expect(editor).not.toBeNull());
    act(() => {
      editor?.commands.setTextSelection({ from: 1, to: 6 });
    });

    expect(screen.queryByRole('button', { name: 'AI actions for the selected text' })).toBeNull();
    await user.click(
      within(screen.getByRole('group', { name: 'Editor actions' })).getByRole('button', {
        name: 'AI assistant',
      }),
    );

    expect(onAiRequest).toHaveBeenCalledWith({ text: 'First', from: 1, to: 6 });
  });

  it('passes an empty selection so the assistant can use the whole document', async () => {
    const user = userEvent.setup();
    const onAiRequest = vi.fn();
    let editor: Editor | null = null;
    render(
      <EditorPanel
        documentId="ai-test"
        initialContent={initialContent}
        onEditorReady={(readyEditor) => {
          editor = readyEditor;
        }}
        onSaveStateChange={() => undefined}
        onAiRequest={onAiRequest}
      />,
    );

    await waitFor(() => expect(editor).not.toBeNull());
    act(() => {
      editor?.commands.setTextSelection(3);
    });
    await user.click(
      within(screen.getByRole('group', { name: 'Editor actions' })).getByRole('button', {
        name: 'AI assistant',
      }),
    );

    expect(onAiRequest).toHaveBeenCalledWith(null);
  });

  it('restores existing heading alignment from saved editor content', () => {
    renderEditor(() => undefined, {
      ...initialContent,
      json: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2, textAlign: 'right' },
            content: [{ type: 'text', text: 'Saved heading' }],
          },
        ],
      },
    });

    expect(screen.getByText('Saved heading').closest('h2')).toHaveStyle({ textAlign: 'right' });
    const toolbar = screen.getByRole('toolbar', { name: 'Document editor' });
    fireEvent.click(within(toolbar).getByRole('button', { name: 'More formatting options' }));
    expect(
      within(document.getElementById('editor-secondary-formatting-controls')!).getByRole('button', {
        name: 'Align right',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Editor native selection suppression', () => {
  it('cancels the native context menu on the editing surface only', () => {
    renderEditor();
    const paragraph = screen.getByText('First paragraph');
    const toolbar = screen.getByRole('toolbar', { name: 'Document editor' });
    const fontSizeInput = within(toolbar).getByRole('spinbutton', { name: 'Font size (px)' });

    expect(fireEvent.contextMenu(paragraph)).toBe(false);
    expect(fireEvent.contextMenu(paragraph, { altKey: true })).toBe(true);
    expect(fireEvent.contextMenu(fontSizeInput)).toBe(true);
  });
});

describe('Editor text formatting', () => {
  it('applies font families, custom sizes, and size stepping to selected text', async () => {
    const user = userEvent.setup();
    let editor: Editor | null = null;
    renderEditor((readyEditor) => {
      editor = readyEditor;
    });

    await waitFor(() => expect(editor).not.toBeNull());
    const activeEditor = requireEditor(editor);
    vi.spyOn(activeEditor.view, 'coordsAtPos').mockReturnValue({
      top: 20,
      bottom: 30,
      left: 20,
      right: 30,
    });
    act(() => activeEditor.commands.setTextSelection({ from: 1, to: 16 }));
    const toolbar = screen.getByRole('toolbar', { name: 'Document editor' });
    await user.click(within(toolbar).getByRole('combobox', { name: 'Font family' }));
    await user.click(screen.getByRole('option', { name: 'Pyidaungsu' }));

    const sizeInput = within(toolbar).getByRole('spinbutton', { name: 'Font size (px)' });
    await user.clear(sizeInput);
    await user.type(sizeInput, '24');
    await user.keyboard('{Enter}');

    expect(screen.getByText('First paragraph').closest('span')).toHaveStyle({
      fontFamily: '"Pyidaungsu", "Noto Sans Myanmar", sans-serif',
      fontSize: '24px',
    });
    await user.click(within(toolbar).getByRole('button', { name: 'Increase font size' }));
    expect(screen.getByText('First paragraph').closest('span')).toHaveStyle({ fontSize: '25px' });
    await user.click(within(toolbar).getByRole('button', { name: 'Decrease font size' }));
    expect(screen.getByText('First paragraph').closest('span')).toHaveStyle({ fontSize: '24px' });
  });

  it('keeps Myanmar Unicode text and applies its font fallback stack', async () => {
    const burmese: EditorContent = {
      html: '<p>မြန်မာစာ စမ်းသပ်မှု</p>',
      text: 'မြန်မာစာ စမ်းသပ်မှု',
      json: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'မြန်မာစာ စမ်းသပ်မှု' }] }],
      },
    };
    const user = userEvent.setup();
    let editor: Editor | null = null;
    renderEditor((readyEditor) => {
      editor = readyEditor;
    }, burmese);

    await waitFor(() => expect(editor).not.toBeNull());
    const activeEditor = requireEditor(editor);
    act(() => activeEditor.commands.selectAll());
    const toolbar = screen.getByRole('toolbar', { name: 'Document editor' });
    await user.click(within(toolbar).getByRole('combobox', { name: 'Font family' }));
    await user.click(screen.getByRole('option', { name: 'Noto Sans Myanmar' }));

    expect(activeEditor.getText()).toBe('မြန်မာစာ စမ်းသပ်မှု');
    expect(screen.getByText('မြန်မာစာ စမ်းသပ်မှု').closest('span')).toHaveStyle({
      fontFamily: '"Noto Sans Myanmar", Pyidaungsu, sans-serif',
    });
  });

  it('applies text color and highlight, and clear-formatting remains undoable', async () => {
    const user = userEvent.setup();
    let editor: Editor | null = null;
    renderEditor((readyEditor) => {
      editor = readyEditor;
    });

    await waitFor(() => expect(editor).not.toBeNull());
    const activeEditor = requireEditor(editor);
    vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
    vi.spyOn(activeEditor.view, 'coordsAtPos').mockReturnValue({
      top: 20,
      bottom: 30,
      left: 20,
      right: 30,
    });
    act(() => activeEditor.commands.setTextSelection({ from: 1, to: 16 }));
    const toolbar = screen.getByRole('toolbar', { name: 'Document editor' });
    await user.click(within(toolbar).getByRole('button', { name: 'Bold' }));
    await user.click(within(toolbar).getByRole('button', { name: 'Italic' }));
    await user.click(within(toolbar).getByRole('button', { name: 'Underline' }));
    fireEvent.change(within(toolbar).getByLabelText('Text color'), {
      target: { value: '#2255aa' },
    });
    fireEvent.change(within(toolbar).getByLabelText('Highlight color'), {
      target: { value: '#ffee00' },
    });

    expect(activeEditor.getHTML()).toContain('<strong>');
    expect(activeEditor.getHTML()).toContain('<em>');
    expect(activeEditor.getHTML()).toContain('<u>');
    expect(screen.getByText('First paragraph').closest('span')).toHaveStyle({
      color: 'rgb(34, 85, 170)',
    });
    expect(activeEditor.getHTML()).toContain('<mark');
    expect(activeEditor.getHTML()).toContain('background-color: rgb(255, 238, 0)');

    await user.click(within(toolbar).getByRole('button', { name: 'More formatting options' }));
    const more = within(document.getElementById('editor-secondary-formatting-controls')!);
    await user.click(more.getByRole('button', { name: 'Clear text formatting' }));
    expect(activeEditor.getHTML()).not.toContain('<strong>');
    expect(activeEditor.getHTML()).not.toContain('<mark');

    await user.click(within(toolbar).getByRole('button', { name: 'Undo' }));
    expect(activeEditor.getHTML()).toContain('<strong>');
    expect(activeEditor.getHTML()).toContain('<mark');
    await user.click(within(toolbar).getByRole('button', { name: 'Redo' }));
    expect(activeEditor.getHTML()).not.toContain('<strong>');
  });

  it('applies paragraph spacing and lists across the selection with undo and redo', async () => {
    const user = userEvent.setup();
    let editor: Editor | null = null;
    renderEditor((readyEditor) => {
      editor = readyEditor;
    });

    await waitFor(() => expect(editor).not.toBeNull());
    const activeEditor = requireEditor(editor);
    act(() => activeEditor.commands.selectAll());
    const toolbar = screen.getByRole('toolbar', { name: 'Document editor' });
    await user.click(within(toolbar).getByRole('button', { name: 'More formatting options' }));
    const more = within(document.getElementById('editor-secondary-formatting-controls')!);
    await user.click(more.getByRole('combobox', { name: 'Line spacing' }));
    await user.click(screen.getByRole('option', { name: '1.5' }));

    expect(screen.getByText('First paragraph').closest('p')).toHaveStyle({ lineHeight: '1.5' });
    expect(screen.getByText('Second paragraph').closest('p')).toHaveStyle({ lineHeight: '1.5' });

    await new Promise((resolve) => window.setTimeout(resolve, 600));
    await user.click(more.getByRole('button', { name: 'Bulleted list' }));
    expect(document.querySelector('ul')).not.toBeNull();

    await user.click(within(toolbar).getByRole('button', { name: 'Undo' }));
    expect(document.querySelector('ul')).toBeNull();
    expect(screen.getByText('First paragraph').closest('p')).toHaveStyle({ lineHeight: '1.5' });
    await user.click(within(toolbar).getByRole('button', { name: 'Redo' }));
    expect(document.querySelector('ul')).not.toBeNull();
  });

  it('shows a positioned selection toolbar, synchronizes formatting, and never opens AI', async () => {
    const user = userEvent.setup();
    const onAiRequest = vi.fn();
    let editor: Editor | null = null;
    render(
      <EditorPanel
        documentId="selection-toolbar-test"
        initialContent={initialContent}
        onEditorReady={(readyEditor) => {
          editor = readyEditor;
        }}
        onSaveStateChange={() => undefined}
        onAiRequest={onAiRequest}
      />,
    );

    await waitFor(() => expect(editor).not.toBeNull());
    const activeEditor = requireEditor(editor);
    vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
    vi.spyOn(activeEditor.view, 'coordsAtPos').mockReturnValue({
      top: 4,
      bottom: 12,
      left: 0,
      right: 2,
    });
    act(() => activeEditor.commands.setTextSelection({ from: 1, to: 6 }));

    const quickToolbar = await screen.findByRole('toolbar', {
      name: 'Selection actions',
    });
    expect(quickToolbar).toHaveStyle({ left: '8px', top: '20px' });
    expect(within(quickToolbar).getByRole('button', { name: 'Bold' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await user.click(within(quickToolbar).getByRole('button', { name: 'Bold' }));

    expect(
      within(screen.getByRole('toolbar', { name: 'Document editor' })).getByRole('button', {
        name: 'Bold',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(within(quickToolbar).getByRole('button', { name: 'Bold' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(onAiRequest).not.toHaveBeenCalled();

    await user.click(
      within(screen.getByRole('toolbar', { name: 'Document editor' })).getByRole('button', {
        name: 'Undo',
      }),
    );
    expect(screen.queryByRole('toolbar', { name: 'Selection actions' })).not.toBeInTheDocument();
  });
});
