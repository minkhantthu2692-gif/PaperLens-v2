import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { SaveStatusIndicator } from './SaveStatusIndicator';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('SaveStatusIndicator', () => {
  it('shows a distinct icon state and tooltip for saving, saved, and error', () => {
    const { rerender, container } = render(<SaveStatusIndicator state="saving" />);
    const indicator = screen.getByRole('status');

    expect(indicator).toHaveAttribute('data-state', 'saving');
    expect(indicator).toHaveAttribute('title', 'Saving…');
    expect(indicator).toHaveAttribute('aria-label', 'Saving…');
    expect(container.querySelector('svg')).toBeTruthy();

    rerender(<SaveStatusIndicator state="saved" />);
    expect(indicator).toHaveAttribute('data-state', 'saved');
    expect(indicator).toHaveAttribute('title', 'Saved locally');
    expect(indicator).toHaveAttribute('aria-label', 'Saved locally');

    rerender(<SaveStatusIndicator state="error" />);
    expect(indicator).toHaveAttribute('data-state', 'error');
    expect(indicator).toHaveAttribute('title', 'Not saved. Browser storage may be full.');
    expect(indicator).toHaveAttribute('aria-label', 'Not saved. Browser storage may be full.');
  });
});
