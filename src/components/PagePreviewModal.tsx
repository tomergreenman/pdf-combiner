import { useCallback, useEffect, useRef, useState } from 'react';
import { PageItem, SourceFile } from '../types';
import { renderPagePreview } from '../lib/renderPage';

interface Props {
  pages: PageItem[];
  currentId: string;
  getSource: (id: string) => SourceFile | undefined;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
}

/** Target render resolution (longest edge, px) based on the space we have to show it in. */
function renderResolution(stageEl: HTMLElement | null) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const longestCss = stageEl
    ? Math.max(stageEl.clientWidth, stageEl.clientHeight)
    : 0;
  const longest = longestCss > 0 ? longestCss : 1200;
  return Math.min(Math.round(longest * dpr), 2600);
}

export function PagePreviewModal({
  pages,
  currentId,
  getSource,
  onClose,
  onNavigate,
  onRotate,
  onRemove,
}: Props) {
  const index = pages.findIndex((p) => p.id === currentId);
  const page = index === -1 ? undefined : pages[index];

  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const prevId = index > 0 ? pages[index - 1].id : null;
  const nextId = index >= 0 && index < pages.length - 1 ? pages[index + 1].id : null;

  const goPrev = useCallback(() => prevId && onNavigate(prevId), [prevId, onNavigate]);
  const goNext = useCallback(() => nextId && onNavigate(nextId), [nextId, onNavigate]);

  // If the previewed page disappears (e.g. removed), close.
  useEffect(() => {
    if (!page) onClose();
  }, [page, onClose]);

  // Lock body scroll + remember focus for the lifetime of the modal.
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, []);

  // Track the available stage size so a rotated page can be fitted exactly.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext]);

  // Render the current page at high resolution whenever it changes.
  useEffect(() => {
    if (!page) return;
    const source = getSource(page.sourceId);
    if (!source) {
      setStatus('error');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setDataUrl(null);
    renderPagePreview(page, source, renderResolution(stageRef.current))
      .then((url) => {
        if (cancelled) return;
        setDataUrl(url);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('Preview render failed', err);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // page identity + which page; rotation is handled via CSS, no re-render needed.
  }, [page?.id, page?.sourceId, page?.kind, page?.pdfPageIndex, getSource]);

  if (!page) return null;

  const rotated = page.userRotation === 90 || page.userRotation === 270;
  const label =
    page.kind === 'pdf-page'
      ? `${page.sourceName} — page ${(page.pdfPageIndex ?? 0) + 1}`
      : page.sourceName;

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 55) (dx > 0 ? goPrev : goNext)();
  };

  return (
    <div
      className="preview"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${label}`}
      onClick={onClose}
    >
      <div className="preview-topbar" onClick={(e) => e.stopPropagation()}>
        <span className="preview-counter">
          {index + 1} / {pages.length}
        </span>
        <span className="preview-title" title={label}>
          {label}
        </span>
        <button type="button" className="btn small preview-buttons" onClick={onClose} aria-label="Close preview">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"
            />
          </svg>
        </button>
      </div>

      <div
        className="preview-stage"
        ref={stageRef}
        onClick={onClose}
        onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
      >
        {status === 'loading' && (
          <div className="preview-spinner" role="status" aria-label="Rendering page">
            <div className="spinner" />
          </div>
        )}
        {status === 'error' && <p className="preview-error">Couldn’t render this page.</p>}
        {status === 'ready' && dataUrl && (
          <img
            src={dataUrl}
            alt={label}
            className="preview-img"
            style={{
              transform: `rotate(${page.userRotation}deg)`,
              maxWidth: stage.w ? `${rotated ? stage.h : stage.w}px` : undefined,
              maxHeight: stage.h ? `${rotated ? stage.w : stage.h}px` : undefined,
            }}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      <button
        type="button"
        className="preview-nav prev"
        onClick={(e) => {
          e.stopPropagation();
          goPrev();
        }}
        disabled={!prevId}
        aria-label="Previous page"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z" />
        </svg>
      </button>
      <button
        type="button"
        className="preview-nav next"
        onClick={(e) => {
          e.stopPropagation();
          goNext();
        }}
        disabled={!nextId}
        aria-label="Next page"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M8.6 7.4 10 6l6 6-6 6-1.4-1.4L13.2 12z" />
        </svg>
      </button>

      <div className="preview-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn" onClick={() => onRotate(page.id)}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 6V3L8 7l4 4V8a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6Z" />
          </svg>
          Rotate
        </button>
        <button type="button" className="btn danger" onClick={() => onRemove(page.id)}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Z" />
          </svg>
          Remove
        </button>
      </div>
    </div>
  );
}
