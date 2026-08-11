import { useState, useEffect, useRef } from "react";

/**
 * Custom hook to implement lazy loading / infinite scrolling for lists.
 * Renders data in small batches (e.g. 12-15 items at a time) as the user scrolls down,
 * optimizing performance, reducing memory overhead, and saving Firebase Firestore reads.
 */
export function useLazyBatchLoad<T>(items: T[], batchSize: number = 12) {
  const [visibleCount, setVisibleCount] = useState<number>(batchSize);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  // Reset visible count when item list changes significantly (e.g. category or search change)
  useEffect(() => {
    setVisibleCount(batchSize);
  }, [items.length]);

  const hasMore = visibleCount < items.length;

  const isLoadingMoreRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMoreRef.current) {
          isLoadingMoreRef.current = true;
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
            setIsLoadingMore(false);
            isLoadingMoreRef.current = false;
          }, 100);
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0.1,
      }
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, items.length, batchSize]);

  return {
    visibleItems: items.slice(0, visibleCount),
    hasMore,
    visibleCount,
    totalCount: items.length,
    isLoadingMore,
    observerTargetRef,
    loadMore: () => setVisibleCount((prev) => Math.min(prev + batchSize, items.length)),
  };
}

export default useLazyBatchLoad;
