import { useEffect } from 'react';

const ICON_CONTROL_SELECTOR = 'button[aria-label], a[aria-label], [role="button"][aria-label]';

function addAccessibleTooltips(root) {
  if (root instanceof Element && root.matches(ICON_CONTROL_SELECTOR)) {
    setTooltip(root);
  }
  root.querySelectorAll?.(ICON_CONTROL_SELECTOR).forEach(setTooltip);
}

function setTooltip(control) {
  const label = control.getAttribute('aria-label')?.trim();
  const isIconOnly = !control.textContent?.trim();
  if (control.hasAttribute('data-auto-tooltip')) {
    if (label && isIconOnly) {
      control.setAttribute('title', label);
    } else {
      control.removeAttribute('title');
      control.removeAttribute('data-auto-tooltip');
    }
    return;
  }
  if (label && isIconOnly && !control.hasAttribute('title')) {
    control.setAttribute('title', label);
    control.setAttribute('data-auto-tooltip', 'true');
  }
}

export default function ActionTooltips() {
  useEffect(() => {
    addAccessibleTooltips(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) addAccessibleTooltips(node);
          });
        } else if (mutation.target instanceof Element) {
          addAccessibleTooltips(mutation.target);
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-label'],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
