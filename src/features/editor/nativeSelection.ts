/**
 * Best-effort suppression of native browser text-selection overlays inside the
 * editor surface.
 *
 * No web API lets a page disable Android's floating selection toolbar, iOS
 * Safari's callout menu, or the desktop context menu. The editor therefore
 * combines three narrow measures instead of touching global browser behavior:
 *
 * 1. `-webkit-touch-callout: none` in `EditorPanel.module.css` removes the iOS
 *    callout for the editable surface while leaving text selectable.
 * 2. `contextmenu` is cancelled only inside the editable surface, so Android's
 *    long-press menu and the desktop right-click menu cannot cover the custom
 *    formatting toolbar.
 * 3. On touch-first devices the custom toolbar is placed below the selection,
 *    where the native popup (which is drawn above the selection) cannot overlap
 *    it.
 */

/** Form controls keep their native menu so paste, spell-check and pickers work. */
const NATIVE_MENU_EXEMPT_SELECTOR = 'input, textarea, select, [data-native-context-menu]';

export interface EditorContextMenuOptions {
  /**
   * Holding Alt opts back into the browser menu, giving keyboard and assistive
   * technology users a way to reach copy/paste and spell-check actions.
   */
  altKey?: boolean;
}

/** Whether the native context menu should be cancelled for this target. */
export function shouldSuppressEditorContextMenu(
  target: EventTarget | null,
  options: EditorContextMenuOptions = {},
): boolean {
  if (options.altKey) {
    return false;
  }
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest(NATIVE_MENU_EXEMPT_SELECTOR) === null;
}

/**
 * Touch-first devices show their native selection toolbar above the selection,
 * so the custom toolbar prefers the space below it there. Pointer-only devices
 * keep the original above-first placement.
 */
export function prefersSelectionToolbarBelow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(any-pointer: coarse)').matches;
  } catch {
    return false;
  }
}

export interface SelectionPopupAnchor {
  /** Left edge of the first selected line in viewport coordinates. */
  left: number;
  /** Right edge of the first selected line in viewport coordinates. */
  right: number;
  /** Top edge of the selection in viewport coordinates. */
  top: number;
  /** Bottom edge of the selection (last line) in viewport coordinates. */
  bottom: number;
}

export interface SelectionPopupPlacementInput {
  anchor: SelectionPopupAnchor;
  popupWidth: number;
  popupHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  preferBelow: boolean;
  /** Smallest page width/height that must stay visible around the popup. */
  margin?: number;
  /** Distance between the selection and the popup. */
  gap?: number;
  /** Viewport top edge the popup must stay below (for example a sticky toolbar). */
  topInset?: number;
}

export type SelectionPopupSide = 'above' | 'below';

export interface SelectionPopupPlacement {
  left: number;
  top: number;
  maxHeight: number;
  side: SelectionPopupSide;
}

/**
 * Places the vertical selection popup next to the selected text, flipping sides
 * and capping its height so it stays inside the viewport and below any sticky
 * editor chrome.
 */
export function placeSelectionPopup({
  anchor,
  popupWidth,
  popupHeight,
  viewportWidth,
  viewportHeight,
  preferBelow,
  margin = 8,
  gap = 8,
  topInset = margin,
}: SelectionPopupPlacementInput): SelectionPopupPlacement {
  const width = Math.max(0, Math.min(popupWidth, viewportWidth - margin * 2));
  const centered = (anchor.left + anchor.right) / 2 - width / 2;
  const left = Math.max(margin, Math.min(viewportWidth - width - margin, centered));

  const minTop = Math.max(margin, topInset);
  const aboveSpace = Math.max(0, anchor.top - gap - minTop);
  const belowSpace = Math.max(0, viewportHeight - anchor.bottom - gap - margin);

  const preferredSide: SelectionPopupSide = preferBelow ? 'below' : 'above';
  const fallbackSide: SelectionPopupSide = preferBelow ? 'above' : 'below';
  const preferredSpace = preferBelow ? belowSpace : aboveSpace;
  const fallbackSpace = preferBelow ? aboveSpace : belowSpace;
  // Only flip sides when the preferred side cannot show a usable amount of the
  // popup; otherwise the popup would jump around while the selection changes.
  const minimumUseful = Math.min(Math.max(popupHeight, 96), 160);
  const side =
    preferredSpace >= minimumUseful || fallbackSpace <= preferredSpace
      ? preferredSide
      : fallbackSide;
  const available = side === 'below' ? belowSpace : aboveSpace;
  const maxHeight = Math.max(
    64,
    Math.min(popupHeight, available, viewportHeight - minTop - margin),
  );
  const top =
    side === 'below' ? anchor.bottom + gap : Math.max(minTop, anchor.top - gap - maxHeight);

  return { left, top, maxHeight, side };
}
