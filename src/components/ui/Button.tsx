import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  toolbarLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    iconOnly = false,
    toolbarLabel,
    title,
    className,
    type = 'button',
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        styles.button,
        styles[variant],
        styles[size],
        iconOnly && styles.iconOnly,
        toolbarLabel && styles.toolbarExpandable,
        className,
      )}
      title={toolbarLabel ? undefined : title}
      data-toolbar-expandable={toolbarLabel ? '' : undefined}
      {...props}
    >
      {children}
      {toolbarLabel ? <span className={styles.toolbarLabel}>{toolbarLabel}</span> : null}
    </button>
  );
});
