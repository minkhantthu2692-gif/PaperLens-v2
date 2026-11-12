import { act, render, waitFor } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import type { EditorContent } from '@/domain/document';
import { saveEditorContent } from '@/services/storage/documents';
import { EditorPanel, type SaveState } from './EditorPanel';

vi.mock('@/services/storage/documents', () => ({ saveEditorContent: vi.fn() }));
const saveMock = vi.mocked(saveEditorContent);

const initialContent: EditorContent = {
  html: '<p>Hello</p>',
  text: 'Hello',
  json: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
  },
};

beforeEach(() => {
  saveMock.mockReset();
});

function renderEditor(onSaveStateChange: (state: SaveState) => void) {
  const editorRef: { current: Editor | null } = { current: null };
  render(
    <EditorPanel
      documentId="save-state-test"
      initialContent={initialContent}
      onEditorReady={(readyEditor) => {
        editorRef.current = readyEditor;
      }}
      onSaveStateChange={onSaveStateChange}
      onAiRequest={() => undefined}
    />,
  );
  return () => {
    if (!editorRef.current) {
      throw new Error('The editor did not mount');
    }
    return editorRef.current;
  };
}

describe('Editor autosave state', () => {
  it('reports saving while changes are pending and saved after a successful write', async () => {
    saveMock.mockResolvedValue(undefined);
    const states: SaveState[] = [];
    const getEditor = renderEditor((state) => states.push(state));

    await waitFor(() => expect(getEditor()).not.toBeNull());
    act(() => {
      getEditor().commands.insertContent(' world');
    });

    // The change is queued for the autosave debounce before the write starts.
    expect(states).toContain('saving');
    await waitFor(() => expect(states.at(-1)).toBe('saved'));
    expect(saveMock).toHaveBeenCalledWith('save-state-test', expect.anything());
  });

  it('reports an error when persistence fails and recovers on the next successful save', async () => {
    saveMock.mockRejectedValueOnce(new Error('quota exceeded'));
    const states: SaveState[] = [];
    const getEditor = renderEditor((state) => states.push(state));

    await waitFor(() => expect(getEditor()).not.toBeNull());
    act(() => {
      getEditor().commands.insertContent(' broken');
    });
    await waitFor(() => expect(states.at(-1)).toBe('error'));

    saveMock.mockResolvedValueOnce(undefined);
    act(() => {
      getEditor().commands.insertContent(' fixed');
    });
    await waitFor(() => expect(states.at(-1)).toBe('saved'));
  });

  it('never reports saved while newer edits are still queued', async () => {
    let resolveFirst: ((value: Awaited<ReturnType<typeof saveEditorContent>>) => void) | undefined;
    saveMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const states: SaveState[] = [];
    const getEditor = renderEditor((state) => states.push(state));

    await waitFor(() => expect(getEditor()).not.toBeNull());
    act(() => {
      getEditor().commands.insertContent(' one');
    });
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));

    // Type again while the first write is still in flight.
    act(() => {
      getEditor().commands.insertContent(' two');
    });

    await act(async () => {
      resolveFirst?.(undefined);
    });
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(states.at(-1)).toBe('saved'));

    // The first (stale) completion must not clear the still-unsaved second edit.
    expect(states.filter((state) => state === 'saved')).toHaveLength(1);
  });
});
