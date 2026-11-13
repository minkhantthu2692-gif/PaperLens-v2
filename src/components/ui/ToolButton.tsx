import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ToolButton.module.css';

type LabelAlign = 'start' | 'center' | 'end';

export interface ToolButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'title'
> {
  /** Visible icon only; the label is revealed on hover, focus, and touch focus. */
  icon: ReactNode;
  /** Control name, used for the accessible name and the animated label. */
  label: string;
  /** Highlighted state for toggles such as the hand tool. */
  active?: boolean;
  /** Renders `aria-pressed` when provided; omit it for plain actions. */
  pressed?: boolean | undefined;
  /** Which way the label grows so it stays inside the panel. Defaults to center. */
  labelAlign?: LabelAlign;
}

/**
 * Compact toolbar button. Shows only its icon at rest and reveals the control
 * name with a short fade/slide animation on hover, keyboard focus, and touch
 * focus. The label is an overlay so revealing it never reflows the toolbar.
 */
export const ToolButton = forwardRef<HTMLButtonElement, ToolButtonProps>(function ToolButton(
  {
    icon,
    label,
    active = false,
    pressed,
    labelAlign = 'center',
    className,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      title={label}
      aria-label={label}
      {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
      className={clsx(styles.toolButton, active && styles.active, className)}
      {...props}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={clsx(styles.label, styles[labelAlign])} aria-hidden="true">
        {label}
      </span>
    </button>
  );
});
