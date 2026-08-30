import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageItem } from '../types';
import { MovePositionControl } from './MovePositionControl';

interface Props {
  page: PageItem;
  index: number;
  total: number;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, target: number) => void;
  onOpenPreview: (id: string) => void;
}

export function PageCard({
  page,
  index,
  total,
  onRotate,
  onRemove,
  onMove,
  onOpenPreview,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 5 : undefined,
  };

  // The thumbnail image (PDF canvas / source image) already reflects any
  // rotation embedded in the source. Only the user's added rotation is applied
  // visually on top.
  const previewRotation = page.userRotation;
  const label =
    page.kind === 'pdf-page'
      ? `${page.sourceName} — page ${(page.pdfPageIndex ?? 0) + 1}`
      : page.sourceName;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`page-card${isDragging ? ' dragging' : ''}`}
    >
      <div className="page-card-head">
        <MovePositionControl
          position={index + 1}
          total={total}
          onMove={(target) => onMove(page.id, target)}
        />
        <button
          type="button"
          className="drag-handle"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="6" cy="4" r="1.4" /><circle cx="12" cy="4" r="1.4" />
            <circle cx="6" cy="9" r="1.4" /><circle cx="12" cy="9" r="1.4" />
            <circle cx="6" cy="14" r="1.4" /><circle cx="12" cy="14" r="1.4" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        className="thumb-frame thumb-open"
        onClick={() => onOpenPreview(page.id)}
        aria-label={`Enlarge preview of ${label}`}
      >
        {page.thumbnailPending ? (
          <div className="thumb-skeleton" aria-label="Rendering preview" />
        ) : page.thumbnail ? (
          <img
            src={page.thumbnail}
            alt={label}
            className="thumb-img"
            style={{ transform: `rotate(${previewRotation}deg)` }}
            draggable={false}
          />
        ) : (
          <div className="thumb-missing">No preview</div>
        )}
        <span className="thumb-zoom" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M10 4a6 6 0 1 0 3.9 10.5l4.8 4.8 1.4-1.4-4.8-4.8A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-1 1v2H7v2h2v2h2v-2h2V9h-2V7H9Z"
            />
          </svg>
        </span>
      </button>

      <p className="page-label" title={label}>
        {label}
      </p>

      <div className="page-card-actions">
        <button
          type="button"
          className="btn small"
          onClick={() => onRotate(page.id)}
          aria-label={`Rotate page ${index + 1}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 6V3L8 7l4 4V8a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6Z"
            />
          </svg>
          Rotate
        </button>
        <button
          type="button"
          className="btn small danger"
          onClick={() => onRemove(page.id)}
          aria-label={`Remove page ${index + 1}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Z"
            />
          </svg>
          Remove
        </button>
      </div>
    </li>
  );
}
