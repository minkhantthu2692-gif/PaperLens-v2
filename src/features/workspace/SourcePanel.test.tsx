import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import type { SourceAsset } from '@/domain/document';
import { SourcePanel } from './SourcePanel';

const asset: SourceAsset = {
  id: 'asset-image',
  blob: new Blob(['scan-bytes'], { type: 'image/png' }),
  mimeType: 'image/png',
  fileName: 'scan.png',
  size: 10,
  createdAt: 0,
};

function renderPanel() {
  return render(
    <SourcePanel
      asset={asset}
      onPageCount={() => undefined}
      onInsertText={() => undefined}
      onOcrPage={() => undefined}
      onOcrImage={() => undefined}
      onOcrRegion={() => undefined}
      onAiText={() => undefined}
      onRefineImage={() => undefined}
      hasRefinedImage={false}
    />,
  );
}

beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => 'blob:scan'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('en');
});

describe('SourcePanel image viewer', () => {
  it('reveals descriptive source controls inline without native tooltips', () => {
    renderPanel();

    const toolbar = screen.getByRole('toolbar', { name: 'Image source' });
    const zoomIn = within(toolbar).getByRole('button', { name: 'Zoom in' });
    const sourceDetails = screen.getByRole('button', { name: 'Source file details' });

    expect(zoomIn).toHaveAttribute('data-toolbar-expandable', '');
    expect(zoomIn).not.toHaveAttribute('title');
    expect(within(zoomIn).getByText('Zoom in')).toBeInTheDocument();
    expect(sourceDetails).toHaveAttribute('data-toolbar-expandable', '');
    expect(sourceDetails).not.toHaveAttribute('title');
    expect(within(sourceDetails).getByText('Info')).toBeInTheDocument();
  });

  it('pans the zoomed image with the hand tool and restores native behaviour', async () => {
    const user = userEvent.setup();
    renderPanel();

    const image = screen.getByAltText('scan.png');
    expect(image).toHaveAttribute('draggable', 'false');

    const handTool = screen.getByRole('button', { name: 'Hand tool' });
    expect(handTool).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('group', { name: 'Hand tool' })).toBeNull();

    await user.click(handTool);
    expect(handTool).toHaveAttribute('aria-pressed', 'true');
    expect(within(handTool).getByText('Pan')).toBeInTheDocument();
    expect(handTool).not.toHaveAttribute('title');

    const surface = screen.getByRole('group', { name: 'Hand tool' });
    expect(surface).toHaveAttribute('tabindex', '0');
    Object.defineProperty(surface, 'scrollLeft', { value: 40, writable: true });
    Object.defineProperty(surface, 'scrollTop', { value: 60, writable: true });

    fireEvent.pointerDown(surface, { button: 0, pointerId: 1, clientX: 320, clientY: 320 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 300, clientY: 300 });
    expect(surface.scrollLeft).toBe(60);
    expect(surface.scrollTop).toBe(80);
    fireEvent.pointerUp(surface, { pointerId: 1 });

    await user.click(handTool);
    expect(handTool).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('group', { name: 'Hand tool' })).toBeNull();
  });

  it('pinch-zooms the image with two fingers without arming the hand tool', () => {
    const { container } = renderPanel();
    const scroll = container.querySelector('[class*="scroll"]') as HTMLElement;

    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    expect(screen.queryByRole('group', { name: 'Hand tool' })).toBeNull();

    fireEvent.pointerDown(scroll, { button: 0, pointerId: 1, clientX: 100, clientY: 200 });
    fireEvent.pointerDown(scroll, { button: 0, pointerId: 2, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(scroll, { pointerId: 2, clientX: 300, clientY: 200 });
    expect(screen.getByText('200%')).toBeInTheDocument();

    fireEvent.pointerMove(scroll, { pointerId: 2, clientX: 400, clientY: 200 });
    expect(screen.getByText('300%')).toBeInTheDocument();

    fireEvent.pointerUp(scroll, { pointerId: 1 });
    fireEvent.pointerUp(scroll, { pointerId: 2 });
  });

  it('fits the whole image into the viewer by default and re-fits on resize', async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();
    const scroll = container.querySelector('[class*="scroll"]') as HTMLElement;
    const image = screen.getByAltText('scan.png') as HTMLImageElement;

    Object.defineProperty(scroll, 'clientWidth', { configurable: true, value: 1040 });
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 800 });
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 2000 });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 3000 });
    fireEvent.load(image);
    fireEvent(window, new Event('resize'));

    const computed = window.getComputedStyle(scroll);
    const paddingX =
      (Number.parseFloat(computed.paddingLeft) || 0) +
      (Number.parseFloat(computed.paddingRight) || 0);
    const paddingY =
      (Number.parseFloat(computed.paddingTop) || 0) +
      (Number.parseFloat(computed.paddingBottom) || 0);
    // The viewer keeps a spare pixel so rounding cannot create a scrollbar.
    const availableWidth = 1040 - paddingX - 1;
    const availableHeight = 800 - paddingY - 1;
    const fitScale = Math.min(availableWidth / 2000, availableHeight / 3000, 1);

    expect(await screen.findByText(`${Math.round(fitScale * 100)}%`)).toBeInTheDocument();
    expect(Number.parseFloat(image.style.width)).toBeCloseTo(2000 * fitScale, 2);
    expect(Number.parseFloat(image.style.height)).toBeCloseTo(3000 * fitScale, 2);
    expect(Number.parseFloat(image.style.width)).toBeLessThanOrEqual(availableWidth + 0.5);
    expect(Number.parseFloat(image.style.height)).toBeLessThanOrEqual(availableHeight + 0.5);

    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 400 });
    fireEvent(window, new Event('resize'));
    const resizedScale = Math.min(availableWidth / 2000, (400 - paddingY - 1) / 3000, 1);
    expect(await screen.findByText(`${Math.round(resizedScale * 100)}%`)).toBeInTheDocument();
    expect(Number.parseFloat(image.style.height)).toBeCloseTo(3000 * resizedScale, 2);

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(Number.parseFloat(image.style.width)).toBeGreaterThan(2000 * resizedScale);

    await user.click(screen.getByRole('button', { name: 'Actual size' }));
    expect(Number.parseFloat(image.style.width)).toBeCloseTo(2000, 2);

    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 900 });
    fireEvent(window, new Event('resize'));
    // Manual zoom is preserved when the viewer resizes.
    expect(Number.parseFloat(image.style.width)).toBeCloseTo(2000, 2);

    const tallScale = Math.min(availableWidth / 2000, (900 - paddingY - 1) / 3000, 1);
    await user.click(screen.getByRole('button', { name: 'Fit to view' }));
    expect(Number.parseFloat(image.style.width)).toBeCloseTo(2000 * tallScale, 2);
  });

  it('fits a landscape image proportionally without imposing a fixed aspect ratio', async () => {
    const { container } = renderPanel();
    const scroll = container.querySelector('[class*="scroll"]') as HTMLElement;
    const image = screen.getByAltText('scan.png') as HTMLImageElement;

    Object.defineProperty(scroll, 'clientWidth', { configurable: true, value: 1040 });
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 800 });
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 3000 });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 1000 });
    fireEvent.load(image);
    fireEvent(window, new Event('resize'));

    const computed = window.getComputedStyle(scroll);
    const availableWidth =
      1040 -
      (Number.parseFloat(computed.paddingLeft) || 0) -
      (Number.parseFloat(computed.paddingRight) || 0) -
      1;
    const availableHeight =
      800 -
      (Number.parseFloat(computed.paddingTop) || 0) -
      (Number.parseFloat(computed.paddingBottom) || 0) -
      1;
    const fitScale = Math.min(availableWidth / 3000, availableHeight / 1000, 1);

    expect(await screen.findByText(`${Math.round(fitScale * 100)}%`)).toBeInTheDocument();
    expect(Number.parseFloat(image.style.width)).toBeCloseTo(3000 * fitScale, 2);
    expect(Number.parseFloat(image.style.height)).toBeCloseTo(1000 * fitScale, 2);
    expect(
      Number.parseFloat(image.style.width) / Number.parseFloat(image.style.height),
    ).toBeCloseTo(3, 2);
  });

  it('uses Ctrl+wheel to zoom around the pointer without capturing normal scrolling', async () => {
    const { container } = renderPanel();
    const scroll = container.querySelector('[class*="scroll"]') as HTMLElement;
    const stage = container.querySelector('[class*="imageStage"]') as HTMLElement;
    const image = screen.getByAltText('scan.png') as HTMLImageElement;

    Object.defineProperty(scroll, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 600 });
    Object.defineProperty(scroll, 'scrollLeft', { configurable: true, writable: true, value: 0 });
    Object.defineProperty(scroll, 'scrollTop', { configurable: true, writable: true, value: 0 });
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 400 });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 300 });
    fireEvent.load(image);
    fireEvent(window, new Event('resize'));
    vi.spyOn(stage, 'getBoundingClientRect').mockImplementation(
      () =>
        new DOMRect(
          100 - scroll.scrollLeft,
          80 - scroll.scrollTop,
          Number.parseFloat(image.style.width),
          Number.parseFloat(image.style.height),
        ),
    );

    const normalWheel = new WheelEvent('wheel', { deltaY: -100, cancelable: true });
    fireEvent(scroll, normalWheel);
    expect(normalWheel.defaultPrevented).toBe(false);
    expect(screen.getByText('100%')).toBeInTheDocument();

    const outsideWheel = new WheelEvent('wheel', {
      deltaY: -100,
      ctrlKey: true,
      cancelable: true,
    });
    fireEvent(window, outsideWheel);
    expect(outsideWheel.defaultPrevented).toBe(false);

    const zoomInWheel = new WheelEvent('wheel', {
      deltaY: -100,
      ctrlKey: true,
      clientX: 150,
      clientY: 120,
      cancelable: true,
    });
    fireEvent(scroll, zoomInWheel);
    expect(zoomInWheel.defaultPrevented).toBe(true);
    expect(await screen.findByText('116%')).toBeInTheDocument();
    await waitFor(() => {
      expect(scroll.scrollLeft).toBeGreaterThan(0);
      expect(scroll.scrollTop).toBeGreaterThan(0);
    });

    const zoomOutWheel = new WheelEvent('wheel', {
      deltaY: 100,
      ctrlKey: true,
      clientX: 150,
      clientY: 120,
      cancelable: true,
    });
    fireEvent(scroll, zoomOutWheel);
    expect(zoomOutWheel.defaultPrevented).toBe(true);
    expect(await screen.findByText('100%')).toBeInTheDocument();
  });

  it('keeps the hand tool and region selection mutually exclusive', async () => {
    const user = userEvent.setup();
    renderPanel();

    const handTool = screen.getByRole('button', { name: 'Hand tool' });
    const regionTool = screen.getByRole('button', { name: 'Select region' });

    await user.click(handTool);
    expect(handTool).toHaveAttribute('aria-pressed', 'true');

    await user.click(regionTool);
    expect(regionTool).toHaveAttribute('aria-pressed', 'true');
    expect(handTool).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Drag on the page to select a region.')).toBeInTheDocument();

    await user.click(handTool);
    expect(handTool).toHaveAttribute('aria-pressed', 'true');
    expect(regionTool).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Drag on the page to select a region.')).not.toBeInTheDocument();
  });
});

// The metadata popover decodes the image with `new Image()`, which jsdom never
// loads, so the tests stub the constructor to resolve synchronously.
class MockDecodingImage {
  naturalWidth = 640;
  naturalHeight = 480;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

class MockBrokenImage {
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => this.onerror?.());
  }
}

describe('Source info popover', () => {
  it('opens the metadata of the active source and closes with Escape', async () => {
    vi.stubGlobal('Image', MockDecodingImage);
    const user = userEvent.setup();
    renderPanel();

    const button = screen.getByRole('button', { name: 'Source file details' });
    expect(screen.queryByRole('dialog', { name: 'Source details' })).toBeNull();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');

    await user.click(button);
    const dialog = screen.getByRole('dialog', { name: 'Source details' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(within(dialog).getByText('scan.png')).toBeInTheDocument();
    expect(within(dialog).getByText('PNG image')).toBeInTheDocument();
    expect(within(dialog).getByText('10 B')).toBeInTheDocument();
    expect(await within(dialog).findByText('640 × 480 px')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Source details' })).toBeNull();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on an outside click and reports undecodable dimensions as unavailable', async () => {
    vi.stubGlobal('Image', MockBrokenImage);
    const user = userEvent.setup();
    renderPanel();

    const button = screen.getByRole('button', { name: 'Source file details' });
    await user.click(button);
    const dialog = screen.getByRole('dialog', { name: 'Source details' });
    expect(within(dialog).getByText('scan.png')).toBeInTheDocument();
    expect(await within(dialog).findByText('Unavailable')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog', { name: 'Source details' })).toBeNull();
  });
});
