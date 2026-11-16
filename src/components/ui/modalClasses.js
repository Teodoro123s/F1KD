const modalDuration = 'duration-[var(--motion-modal-duration)]';
const drawerDuration = 'duration-[var(--motion-drawer-duration)]';

export function getModalBackdropClasses({ exiting = false, drawer = false } = {}) {
  return [
    'bg-[rgba(15,23,42,0.48)]',
    'backdrop-blur-[5px]',
    getModalTransitionClasses({ exiting, drawer, panel: false }),
    exiting
      ? 'animate-none'
      : drawer
        ? 'animate-[fadeIn_var(--motion-drawer-duration)_var(--motion-ease-out)_both]'
        : 'animate-[fadeIn_220ms_var(--motion-ease-out)_both]',
  ].join(' ');
}

export function getModalTransitionClasses({ exiting = false, drawer = false, panel = true } = {}) {
  return [
    panel ? 'transition-[opacity,transform]' : 'transition-opacity',
    drawer ? drawerDuration : modalDuration,
    exiting
      ? `ease-[var(--motion-ease-in)] opacity-0 ${drawer && panel ? 'translate-x-4' : panel ? 'translate-y-2 scale-[0.995]' : ''} ${panel ? 'pointer-events-none' : ''}`
      : `ease-[var(--motion-ease-out)] opacity-100 ${drawer && panel ? 'translate-x-0' : panel ? 'translate-y-0 scale-100' : ''}`,
  ].join(' ');
}

export function getModalSurfaceClasses({ exiting = false, drawer = false, variant = 'default' } = {}) {
  const surfaceClasses = {
    default: 'border border-[var(--color-border)] rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] overflow-hidden max-[640px]:rounded-[14px]',
    community: 'border border-[var(--color-border)] rounded-[14px] bg-[var(--color-surface)] shadow-[0_22px_40px_rgba(15,23,42,0.18)] overflow-hidden max-[640px]:rounded-[14px]',
    drawer: 'border-0 border-l border-[var(--border-color)] rounded-[16px_0_0_16px] bg-[var(--color-surface)] shadow-[-18px_0_48px_rgba(15,23,42,0.16)] overflow-hidden',
    communityDrawer: 'border-0 border-l border-[var(--border-color)] rounded-[16px_0_0_16px] bg-[var(--color-surface)] shadow-[-18px_0_48px_rgba(15,23,42,0.16)] overflow-hidden max-[640px]:rounded-none',
    confirm: 'border border-[#e2e8f0] rounded-[18px] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.24)] overflow-hidden',
  }[variant] || '';
  return [
    'z-[var(--z-modal)]',
    surfaceClasses,
    getModalTransitionClasses({ exiting, drawer }),
    exiting
      ? variant === 'communityDrawer' ? '' : 'animate-none'
      : `${drawer ? '' : 'animate-[slideUp_220ms_var(--motion-ease-out)_both]'}`,
  ].join(' ');
}

export const modalHeaderClasses = 'border-b border-[#e8edf3] bg-white [&_h2]:tracking-normal [&_h2]:text-[#172033] [&_h3]:tracking-normal [&_h3]:text-[#172033]';
export const modalHeaderSectionClasses = `${modalHeaderClasses} px-[1.35rem] py-[1.15rem]`;
export const communityDrawerHeaderClasses = `${modalHeaderClasses} px-6 py-5 bg-[var(--modal-surface)] max-[640px]:px-4`;
export const communityModalFooterClasses = 'border-t-0 bg-transparent';
export const modalHeadingClasses = 'tracking-normal text-[#172033]';
export const modalCloseClasses = 'inline-flex min-w-[32px] w-8 h-8 items-center justify-center p-0 border-0 rounded-lg bg-transparent text-[#64748b] [font:inherit] text-[1.15rem] leading-none cursor-pointer transition-[background-color,color] duration-[150ms] ease-[ease] hover:bg-[#f1f5f9] hover:text-[#172033]';
export const modalBodyClasses = 'bg-[var(--color-surface)]';
export const modalFooterClasses = 'border-t border-[#e8edf3] bg-[#f8fafc]';
export const confirmationSurfaceClasses = 'w-[min(440px,calc(100vw-2rem))] max-w-[440px] rounded-[var(--radius-lg)]';
export const confirmationCloseClasses = 'inline-flex min-w-[32px] w-8 h-8 items-center justify-center p-0 border-0 rounded-lg bg-transparent text-[#9ca3af] [font:inherit] text-[1.8rem] leading-none cursor-pointer transition-[background-color,color] duration-[150ms] ease-[ease] hover:bg-[#f1f5f9] hover:text-[#172033]';
export const confirmationBodyClasses = 'min-h-[150px] border-[#e8edf3]';
export const confirmationFooterClasses = 'border-[#e8edf3] bg-[#f8fafc]';
