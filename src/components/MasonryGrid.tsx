import { useMemo } from "react";

interface MasonryGridProps {
  /** Total item count */
  itemCount: number;
  /** Render a single item by its original index */
  renderItem: (index: number) => React.ReactNode;
  /** Responsive column counts: [sm, md, lg, xl] — defaults to [1,2,3,4,5] */
  columns?: number[];
}

/**
 * JS-based masonry that distributes items **row-wise** (round-robin)
 * across columns, so lightbox prev/next follows left→right, top→bottom order.
 * Each column is a vertical flex container preserving natural aspect ratios.
 */
export default function MasonryGrid({ itemCount, renderItem, columns = [1, 2, 3, 4, 5] }: MasonryGridProps) {
  // We render ALL column counts and hide via CSS breakpoints
  const layouts = useMemo(() => {
    return columns.map((colCount) => {
      const cols: number[][] = Array.from({ length: colCount }, () => []);
      for (let i = 0; i < itemCount; i++) {
        cols[i % colCount].push(i);
      }
      return cols;
    });
  }, [itemCount, columns]);

  // Breakpoint classes for each layout: index 0=base, 1=sm, 2=md, 3=lg, 4=xl
  const breakpoints = ["flex sm:hidden", "hidden sm:flex md:hidden", "hidden md:flex lg:hidden", "hidden lg:flex xl:hidden", "hidden xl:flex"];

  return (
    <>
      {layouts.map((cols, layoutIdx) => (
        <div key={layoutIdx} className={`${breakpoints[layoutIdx]} gap-3`}>
          {cols.map((colItems, colIdx) => (
            <div key={colIdx} className="flex-1 flex flex-col gap-3">
              {colItems.map((itemIdx) => renderItem(itemIdx))}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
