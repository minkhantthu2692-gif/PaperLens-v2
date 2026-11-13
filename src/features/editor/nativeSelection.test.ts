import { describe, expect, it, vi } from 'vitest';
import {
  placeSelectionPopup,
  prefersSelectionToolbarBelow,
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

describe('selection popup placement', () => {
  const base = {
    popupWidth: 248,
    popupHeight: 300,
    viewportWidth: 1200,
    viewportHeight: 800,
    anchor: { left: 300, right: 400, top: 400, bottom: 420 },
  };

  it('places the popup above the selection on pointer devices', () => {
    expect(placeSelectionPopup({ ...base, preferBelow: false })).toEqual({
      left: 226,
      top: 92,
      maxHeight: 300,
      side: 'above',
    });
  });

  it('places the popup below the selection on touch devices', () => {
    expect(placeSelectionPopup({ ...base, preferBelow: true })).toEqual({
      left: 226,
      top: 428,
      maxHeight: 300,
      side: 'below',
    });
  });

  it('flips above when the touch layout has no room below the selection', () => {
    const placement = placeSelectionPopup({
      ...base,
      anchor: { left: 300, right: 400, top: 700, bottom: 720 },
      preferBelow: true,
    });
    expect(placement.side).toBe('above');
    expect(placement.top).toBe(392);
  });

  it('keeps the popup inside the viewport at the screen edges', () => {
    const placement = placeSelectionPopup({
      ...base,
      anchor: { left: 0, right: 2, top: 4, bottom: 12 },
      preferBelow: false,
    });
    expect(placement).toEqual({ left: 8, top: 20, maxHeight: 300, side: 'below' });
  });

  it('stays below sticky editor chrome', () => {
    const placement = placeSelectionPopup({
      ...base,
      anchor: { left: 300, right: 400, top: 120, bottom: 140 },
      preferBelow: false,
      topInset: 100,
    });
    expect(placement.side).toBe('below');
    expect(placement.top).toBe(148);
  });

  it('caps the popup height to the space on the chosen side', () => {
    const placement = placeSelectionPopup({
      ...base,
      popupHeight: 900,
      viewportHeight: 300,
      anchor: { left: 300, right: 400, top: 40, bottom: 60 },
      preferBelow: false,
    });
    expect(placement.side).toBe('below');
    expect(placement.maxHeight).toBe(224);
    expect(placement.top).toBe(68);
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
