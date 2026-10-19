import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function FloatingLayer({
  open,
  anchorRef,
  onDismiss,
  children,
  className = '',
  layer = 'page',
  align = 'end',
  matchAnchorWidth = false,
  offset = 6,
  menuRef,
  style: customStyle,
  ...menuProps
}) {
  const internalMenuRef = useRef(null);
  const dismissRef = useRef(onDismiss);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return undefined;
    }

    const updatePosition = () => {
      const anchor = anchorRef?.current;
      const menu = internalMenuRef.current;
      if (!anchor || !menu) return;

      const bounds = anchor.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const maxWidth = Math.max(0, viewportWidth - 16);
      const measuredWidth = matchAnchorWidth
        ? bounds.width
        : Math.min(menu.getBoundingClientRect().width, maxWidth);
      const measuredHeight = menu.scrollHeight;
      const belowSpace = Math.max(0, viewportHeight - bounds.bottom - offset - 8);
      const aboveSpace = Math.max(0, bounds.top - offset - 8);
      const openAbove = measuredHeight > belowSpace && aboveSpace > belowSpace;
      const availableHeight = Math.max(
        0,
        Math.min(viewportHeight - 16, openAbove ? aboveSpace : belowSpace),
      );
      const height = Math.min(measuredHeight, availableHeight);
      const left = align === 'start'
        ? bounds.left
        : bounds.right - measuredWidth;
      const clampedLeft = Math.max(8, Math.min(left, viewportWidth - measuredWidth - 8));
      const preferredTop = openAbove
        ? Math.max(8, bounds.top - height - offset)
        : Math.min(bounds.bottom + offset, viewportHeight - height - 8);
      const top = Math.max(8, Math.min(preferredTop, viewportHeight - height - 8));

      setPosition({
        left: clampedLeft,
        top,
        width: matchAnchorWidth ? Math.min(bounds.width, maxWidth) : measuredWidth,
        maxWidth,
        maxHeight: Math.max(0, availableHeight),
      });
    };

    const handleOutsideClick = (event) => {
      if (anchorRef?.current?.contains(event.target) || internalMenuRef.current?.contains(event.target)) return;
      dismissRef.current?.();
    };
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      dismissRef.current?.();
      anchorRef?.current?.focus({ preventScroll: true });
    };

    updatePosition();
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updatePosition);
    if (internalMenuRef.current) resizeObserver?.observe(internalMenuRef.current);
    window.addEventListener('resize', updatePosition);
    document.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      resizeObserver?.disconnect();
    };
  }, [align, anchorRef, matchAnchorWidth, offset, open]);

  if (!open) return null;

  const classes = [
    'floating-layer',
    layer === 'modal' ? 'floating-layer--modal' : '',
    className,
  ].filter(Boolean).join(' ');

  return createPortal(
    <div
      {...menuProps}
      ref={(element) => {
        internalMenuRef.current = element;
        if (menuRef) menuRef.current = element;
      }}
      className={classes}
      style={{
        ...customStyle,
        position: 'fixed',
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        right: 'auto',
        bottom: 'auto',
        width: position?.width,
        maxWidth: position?.maxWidth,
        maxHeight: position?.maxHeight,
        overflowY: 'auto',
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
