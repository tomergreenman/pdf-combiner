import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { PageItem } from '../types';
import { PageCard } from './PageCard';

interface Props {
  pages: PageItem[];
  onReorder: (pages: PageItem[]) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
}

export function PageGrid({ pages, onReorder, onRotate, onRemove }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(pages, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
        <ul className="page-grid">
          {pages.map((page, i) => (
            <PageCard
              key={page.id}
              page={page}
              index={i}
              onRotate={onRotate}
              onRemove={onRemove}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
