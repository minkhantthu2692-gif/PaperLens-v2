import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import type { SourceAsset } from '@/domain/document';
import { formatBytes } from '@/lib/format';
import styles from './SourceInfoButton.module.css';

interface SourceInfoButtonProps {
  asset: SourceAsset;
  pageCount?: number | undefined;
}

interface ImageSize {
  width: number;
  height: number;
}

function isImageAsset(asset: SourceAsset): boolean {
  return asset.mimeType.startsWith('image/');
}

/**
 * Header action that reveals the metadata of the source currently shown in the
 * Source panel. The popover is dismissible with Escape or an outside click and
 * keeps keyboard focus predictable.
 */
export function SourceInfoButton({ asset, pageCount }: SourceInfoButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [imageSizeFailed, setImageSizeFailed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const image = isImageAsset(asset);
  const formatLabel =
    asset.mimeType === 'application/pdf'
      ? t('workspace.formatPdf')
      : asset.mimeType === 'image/png'
        ? t('workspace.formatPng')
        : asset.mimeType === 'image/jpeg'
          ? t('workspace.formatJpeg')
          : asset.mimeType === 'image/webp'
            ? t('workspace.formatWebp')
            : asset.mimeType === 'text/plain'
              ? t('workspace.formatText')
              : asset.mimeType || t('workspace.infoUnavailable');

  // A different source invalidates both the open popover and its dimensions.
  useEffect(() => {
    setOpen(false);
    setImageSize(null);
    setImageSizeFailed(false);
  }, [asset]);

  // Decode the image only while its details are visible.
  useEffect(() => {
    setImageSize(null);
    setImageSizeFailed(false);
    if (!open || !image) {
      return;
    }
    let disposed = false;
    const url = URL.createObjectURL(asset.blob);
    const { Image } = window;
    const probe = new Image();
    const revoke = () => URL.revokeObjectURL(url);
    probe.onload = () => {
      if (disposed) {
        return;
      }
      if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
        setImageSize({ width: probe.naturalWidth, height: probe.naturalHeight });
      } else {
        setImageSizeFailed(true);
      }
      revoke();
    };
    probe.onerror = () => {
      if (!disposed) {
        setImageSizeFailed(true);
      }
      revoke();
    };
    probe.src = url;
    return () => {
      disposed = true;
      probe.onload = null;
      probe.onerror = null;
      revoke();
    };
  }, [open, image, asset]);

  useEffect(() => {
    if (!open) {
      return;
    }
    popoverRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !wrapperRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const dimensions = imageSize
    ? `${imageSize.width} × ${imageSize.height} px`
    : imageSizeFailed
      ? t('workspace.infoUnavailable')
      : t('workspace.infoReading');

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        iconOnly
        toolbarLabel={t('workspace.infoButtonShort')}
        aria-label={t('workspace.infoButton')}
        title={t('workspace.infoButton')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Info size={16} aria-hidden="true" />
      </Button>

      {open ? (
        <div
          id={popoverId}
          ref={popoverRef}
          className={styles.popover}
          role="dialog"
          aria-label={t('workspace.infoTitle')}
          tabIndex={-1}
        >
          <dl className={styles.details}>
            <dt className={styles.term}>{t('workspace.infoName')}</dt>
            <dd className={styles.value} title={asset.fileName}>
              {asset.fileName}
            </dd>

            <dt className={styles.term}>{t('workspace.infoType')}</dt>
            <dd className={styles.value} title={asset.mimeType}>
              {formatLabel}
            </dd>

            <dt className={styles.term}>{t('workspace.infoSize')}</dt>
            <dd className={styles.value}>{formatBytes(asset.size)}</dd>

            {asset.mimeType === 'application/pdf' && pageCount !== undefined ? (
              <>
                <dt className={styles.term}>{t('workspace.infoPages')}</dt>
                <dd className={styles.value}>{pageCount}</dd>
              </>
            ) : null}

            {image ? (
              <>
                <dt className={styles.term}>{t('workspace.infoDimensions')}</dt>
                <dd className={styles.value}>{dimensions}</dd>
              </>
            ) : null}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
