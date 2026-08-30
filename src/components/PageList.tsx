import { verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PageItem } from '../types';
import { PageRow } from './PageRow';
import { SortablePages } from './SortablePages';

interface Props {
  pages: PageItem[];
  onReorder: (pages: PageItem[]) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, target: number) => void;
  onOpenPreview: (id: string) => void;
}

export function PageList({
  pages,
  onReorder,
  onRotate,
  onRemove,
  onMove,
  onOpenPreview,
}: Props) {
  return (
    <SortablePages pages={pages} strategy={verticalListSortingStrategy} onReorder={onReorder}>
      <ol className="page-rows">
        {pages.map((page, i) => (
          <PageRow
            key={page.id}
            page={page}
            index={i}
            total={pages.length}
            onRotate={onRotate}
            onRemove={onRemove}
            onMove={onMove}
            onOpenPreview={onOpenPreview}
          />
        ))}
      </ol>
    </SortablePages>
  );
}
