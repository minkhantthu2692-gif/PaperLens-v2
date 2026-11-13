import { describe, expect, it, vi } from 'vitest';
import {
  prefersSelectionToolbarBelow,
  selectionToolbarTop,
  shouldSuppressEditorContextMenu,
} from './nativeSelection';

describe('editor context menu suppression', () => {
  it('suppresses the native menu inside the editing surface', () => {
    const paragraph = document.createElement('p');
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    editor.append(paragraph);

    expect(shouldSuppressEditorContextMenu(paragraph)).toBe(true);
    expect(shouldSuppressEditorContextMenu(editor)).toBe(true);
  });

  it('keeps the native menu for form controls and explicitly exempted areas', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const exempt = document.createElement('div');
    exempt.setAttribute('data-native-context-menu', '');
    const insideExempt = document.createElement('span');
    exempt.append(insideExempt);

    expect(shouldSuppressEditorContextMenu(input)).toBe(false);
    expect(shouldSuppressEditorContextMenu(textarea)).toBe(false);
    expect(shouldSuppressEditorContextMenu(select)).toBe(false);
    expect(shouldSuppressEditorContextMenu(insideExempt)).toBe(false);
  });

  it('lets Alt opt back into the native menu for keyboard and assistive users', () => {
    const paragraph = document.createElement('p');
    expect(shouldSuppressEditorContextMenu(paragraph, { altKey: true })).toBe(false);
  });

  it('ignores targets that are not elements', () => {
    expect(shouldSuppressEditorContextMenu(null)).toBe(false);
    expect(shouldSuppressEditorContextMenu(document)).toBe(false);
  });
});

describe('selection toolbar placement', () => {
  const base = { toolbarHeight: 44, viewportHeight: 800 };

  it('places the toolbar above the selection on pointer devices', () => {
    expect(
      selectionToolbarTop({
        ...base,
        selectionTop: 300,
        selectionBottom: 320,
        preferBelow: false,
      }),
    ).toBe(248);
  });

  it('places the toolbar below the selection on touch devices', () => {
    expect(
      selectionToolbarTop({
        ...base,
        selectionTop: 300,
        selectionBottom: 320,
        preferBelow: true,
      }),
    ).toBe(328);
  });

  it('falls back above the selection on touch devices when there is no room below', () => {
    expect(
      selectionToolbarTop({
        ...base,
        selectionTop: 700,
        selectionBottom: 790,
        preferBelow: true,
      }),
    ).toBe(648);
  });

  it('keeps the toolbar inside the viewport', () => {
    expect(
      selectionToolbarTop({
        ...base,
        selectionTop: 4,
        selectionBottom: 12,
        preferBelow: false,
      }),
    ).toBe(20);
  });

  it('treats pointer-only environments as non-touch', () => {
    expect(prefersSelectionToolbarBelow()).toBe(false);
  });

  it('detects touch-first devices through any coarse pointer', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query === '(any-pointer: coarse)',
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );

    try {
      expect(prefersSelectionToolbarBelow()).toBe(true);
    } finally {
      vi.restoreAllMocks();
    }
  });
});
