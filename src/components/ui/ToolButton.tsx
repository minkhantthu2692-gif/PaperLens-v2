import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ToolButton.module.css';

type LabelAlign = 'start' | 'center' | 'end';

export interface ToolButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'title'
> {
  /** Visible icon only; the label is revealed by expanding the button. */
  icon: ReactNode;
  /** Control name, used for the accessible name and the expanded label. */
  label: string;
  /** Highlighted state for toggles such as the hand tool. */
  active?: boolean;
  /** Renders `aria-pressed` when provided; omit it for plain actions. */
  pressed?: boolean | undefined;
  /** Which way the label grows so it stays inside the panel. Defaults to center. */
  labelAlign?: LabelAlign;
}

/**
 * Compact inline-expanding toolbar button.
 *
 * Shows only its icon at rest. On hover or keyboard focus the button expands
 * horizontally to reveal the control title beside its icon. On hover/focus out
 * it smoothly collapses back to icon-only.
 *
 * The label becomes part of the button itself — no floating tooltip or separate
 * overlay. Exactly one label appears during hover/focus.
 *
 * @param icon - The icon to show (lucide-react or similar).
 * @param label - The control name revealed on expand; also used as `aria-label`.
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
      <span className={styles.iconWrapper}>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      </span>
      <span className={clsx(styles.label, styles[labelAlign])} aria-hidden="true">
        {label}
      </span>
    </button>
  );
});
