import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';

type ScrollStackElement = HTMLElement;

type ScrollStackResult<T extends ScrollStackElement> = {
  stackRef: RefObject<HTMLDivElement | null>;
  itemRefs: MutableRefObject<Array<T | null>>;
};

/**
 * Adds a passive, scroll-linked stack treatment while keeping every item in
 * normal document flow. Items that cannot fit comfortably, or users who need
 * a simpler motion model, stay static and fully readable.
 */
export function useScrollStack<T extends ScrollStackElement>(): ScrollStackResult<T> {
  const stackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<T | null>>([]);

  useEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let connectFrame = 0;
    let motionEnabled = false;
    let stickyTop = 88;

    const updateItems = () => {
      frame = 0;
      if (!motionEnabled) return;
      const items = itemRefs.current.filter((item): item is T => Boolean(item));
      const boxes = items.map(item => item.getBoundingClientRect());
      items.forEach((item, index) => {
        const next = boxes[index + 1];
        const height = item.offsetHeight;
        const progress = next ? Math.min(1, Math.max(0, (height + stickyTop + index * 14 - next.top) / height)) : 0;
        const target = item.querySelector<HTMLElement>('[data-scroll-stack-card]') ?? item;
        target.style.setProperty('--stack-scale', String(1 - progress * .045));
        target.style.setProperty('--stack-lift', `${progress * -8}px`);
      });
    };
    const scheduleUpdate = () => {
      if (motionEnabled && !frame) frame = window.requestAnimationFrame(updateItems);
    };
    const connect = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      const wasMotionEnabled = motionEnabled;
      const expandedItem = itemRefs.current.find(item => item?.querySelector('[aria-expanded="true"]'));
      const expandedTop = expandedItem?.getBoundingClientRect().top;
      const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
      const headerHeight = document.querySelector('.evg-header')?.getBoundingClientRect().height ?? 64;
      stickyTop = Math.ceil(headerHeight + 24);
      const availableHeight = window.innerHeight - stickyTop - 28 - 24;
      const itemsFit = itemRefs.current.every(item => !item || item.offsetHeight <= availableHeight);
      motionEnabled = window.innerWidth > 760 && window.innerHeight > 650 && rootFontSize < 24 && itemsFit && !motionQuery.matches;
      stack.style.setProperty('--stack-top', `${stickyTop}px`);
      stack.dataset.enhanced = String(motionEnabled);
      if (!motionEnabled) {
        itemRefs.current.forEach(item => {
          const target = item?.querySelector<HTMLElement>('[data-scroll-stack-card]') ?? item;
          target?.style.removeProperty('--stack-scale');
          target?.style.removeProperty('--stack-lift');
        });
        if (wasMotionEnabled && expandedItem && expandedTop !== undefined) {
          const layoutTop = expandedItem.getBoundingClientRect().top;
          const correction = layoutTop - expandedTop;
          if (Math.abs(correction) > 1) window.scrollBy(0, correction);
        }
        return;
      }
      scheduleUpdate();
    };
    const scheduleConnect = () => {
      if (connectFrame) return;
      connectFrame = window.requestAnimationFrame(() => {
        connectFrame = 0;
        connect();
      });
    };

    connect();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleConnect);
    itemRefs.current.forEach(item => { if (item) observer?.observe(item); });
    const header = document.querySelector('.evg-header');
    if (header) observer?.observe(header);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleConnect);
    motionQuery.addEventListener?.('change', scheduleConnect);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (connectFrame) window.cancelAnimationFrame(connectFrame);
      observer?.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleConnect);
      motionQuery.removeEventListener?.('change', scheduleConnect);
    };
  }, []);

  return { stackRef, itemRefs };
}
