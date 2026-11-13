import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CompactSelect } from './CompactSelect';

const options = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'heading', label: 'Heading 1' },
  { value: 'quote', label: 'Quote' },
];

function TestSelect() {
  const [value, setValue] = useState('paragraph');
  return (
    <CompactSelect
      ariaLabel="Paragraph style"
      value={value}
      options={options}
      onChange={setValue}
    />
  );
}

describe('CompactSelect', () => {
  it('exposes an accessible combobox and selects an option by click', async () => {
    const user = userEvent.setup();
    render(<TestSelect />);

    const select = screen.getByRole('combobox', { name: 'Paragraph style' });
    await user.click(select);

    expect(screen.getByRole('listbox', { name: 'Paragraph style' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'Paragraph', selected: true })).toBeVisible();
    await user.click(screen.getByRole('option', { name: 'Heading 1' }));

    expect(select).toHaveTextContent('Heading 1');
    expect(select).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports arrow-key selection and Escape dismissal', async () => {
    const user = userEvent.setup();
    render(<TestSelect />);

    const select = screen.getByRole('combobox', { name: 'Paragraph style' });
    await user.click(select);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(select).toHaveTextContent('Heading 1');
    await user.click(select);
    await user.keyboard('{Escape}');

    expect(select).toHaveAttribute('aria-expanded', 'false');
    expect(select).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
