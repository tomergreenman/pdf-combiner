import { useEffect, useRef, useState } from 'react';

/** The position the current input value would resolve to, for the button label. */
function clampPreview(value: string, total: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, n), total);
}

interface Props {
  /** Current 1-based position of this page. */
  position: number;
  /** Total number of pages. */
  total: number;
  /** Called with the desired 1-based target position. */
  onMove: (target: number) => void;
}

/**
 * The page-number badge. Tapping it opens a small popover to jump the page to a
 * typed position — the fast path for reordering when dragging across a long list
 * is impractical. Dragging still works independently.
 */
export function MovePositionControl({ position, total, onMove }: Props) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [value, setValue] = useState(String(position));
  const wrapRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue(String(position));
    // Open toward screen centre so the popover never runs off the edge.
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setAlignRight(rect.left > window.innerWidth / 2);
    // Focus + select the field once the popover is mounted.
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    const onDocPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, position]);

  const apply = (target: number) => {
    const clamped = Math.min(Math.max(1, Math.round(target)), total);
    if (Number.isFinite(clamped) && clamped !== position) onMove(clamped);
    setOpen(false);
  };

  return (
    <span className="pos-control" ref={wrapRef}>
      <button
        type="button"
        className="page-index"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Page ${position} of ${total}. Change position`}
        onClick={() => setOpen((v) => !v)}
      >
        {position}
      </button>

      {open && (
        <div
          className={`pos-popover${alignRight ? ' align-right' : ''}`}
          role="dialog"
          aria-label="Move page to position"
        >
          <label className="pos-popover-label" htmlFor="pos-input">
            Move to position
          </label>
          <div className="pos-popover-row">
            <input
              id="pos-input"
              ref={inputRef}
              type="number"
              inputMode="numeric"
              min={1}
              max={total}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  apply(Number(value));
                }
              }}
            />
            <span className="pos-popover-of">of {total}</span>
          </div>
          <div className="pos-popover-actions">
            <button type="button" className="btn small" onClick={() => apply(1)}>
              To start
            </button>
            <button type="button" className="btn small" onClick={() => apply(total)}>
              To end
            </button>
          </div>
          <button
            type="button"
            className="btn small primary pos-popover-move"
            onClick={() => apply(Number(value))}
          >
            Move to {clampPreview(value, total)}
          </button>
        </div>
      )}
    </span>
  );
}
