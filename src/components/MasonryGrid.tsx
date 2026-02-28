import { useMemo, useEffect, useState } from "react";

interface MasonryGridProps {
  /** Total item count */
  itemCount: number;
  /** Render a single item by its original index */
  renderItem: (index: number) => React.ReactNode;
  /** Responsive column counts: [base, sm, md, lg, xl] */
  columns?: number[];
}

/**
 * JS-based masonry that distributes items row-wise (round-robin)
 * across columns, so lightbox prev/next follows left→right, top→bottom order.
 */
export default function MasonryGrid({ itemCount, renderItem, columns = [1, 2, 3, 4, 5] }: MasonryGridProps) {
  const [columnCount, setColumnCount] = useState(columns[0] ?? 1);

  useEffect(() => {
    const resolveColumns = () => {
      const w = window.innerWidth;
      if (w >= 1280) return columns[4] ?? columns[columns.length - 1] ?? 1;
      if (w >= 1024) return columns[3] ?? columns[columns.length - 1] ?? 1;
      if (w >= 768) return columns[2] ?? columns[columns.length - 1] ?? 1;
      if (w >= 640) return columns[1] ?? columns[columns.length - 1] ?? 1;
      return columns[0] ?? 1;
    };

    const update = () => setColumnCount(Math.max(1, resolveColumns()));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [columns]);

  const cols = useMemo(() => {
    const grid: number[][] = Array.from({ length: columnCount }, () => []);
    for (let i = 0; i < itemCount; i++) {
      grid[i % columnCount].push(i);
    }
    return grid;
  }, [itemCount, columnCount]);

  return (
    <div className="flex w-full min-w-0 gap-3 overflow-x-hidden">
      {cols.map((colItems, colIdx) => (
        <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-3">
          {colItems.map((itemIdx) => renderItem(itemIdx))}
        </div>
      ))}
    </div>
  );
}

