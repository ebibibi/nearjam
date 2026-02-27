'use client';

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';

interface QueueItem {
  id: string;
  orderIndex: number;
  keyOverride: string | null;
  song: {
    id: string;
    title: string;
    artist: string | null;
    genre: string | null;
    typicalKey: string | null;
  };
}

interface SongQueueProps {
  items: QueueItem[];
  sessionId: string;
  onReorder: (items: QueueItem[]) => void;
  onRemove: (itemId: string) => void;
}

export function SongQueue({ items, sessionId, onReorder, onRemove }: SongQueueProps) {
  const t = useTranslations('live');

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Optimistic update
    const updated = reordered.map((item, idx) => ({ ...item, orderIndex: idx }));
    onReorder(updated);

    // Persist new order
    await Promise.all(
      updated.map((item, idx) =>
        fetch(`/api/v1/sessions/${sessionId}/queue/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIndex: idx }),
        })
      )
    );
  }

  async function handleRemove(itemId: string) {
    onRemove(itemId);
    await fetch(`/api/v1/sessions/${sessionId}/queue/${itemId}`, { method: 'DELETE' });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
        <p className="text-sm text-gray-400">{t('noQueue')}</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="queue">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(drag, snapshot) => (
                  <div
                    ref={drag.innerRef}
                    {...drag.draggableProps}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 bg-white ${
                      snapshot.isDragging ? 'border-violet-400 shadow-md' : 'border-gray-200'
                    }`}
                  >
                    <div {...drag.dragHandleProps} className="cursor-grab text-gray-300 hover:text-gray-500 px-1 select-none">
                      ⠿
                    </div>
                    <span className="text-sm font-mono text-gray-400 w-5">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.song.title}</p>
                      {item.song.artist && <p className="text-xs text-gray-500 truncate">{item.song.artist}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.keyOverride && (
                        <span className="text-xs text-violet-600 font-mono">{item.keyOverride}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="text-gray-300 hover:text-red-500 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
