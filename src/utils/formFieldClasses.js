export const formFieldClasses =
  'box-border min-h-[var(--field-height)] border border-[var(--field-border)] rounded-[var(--field-radius)] bg-white text-[var(--slate-dark)] leading-[1.35] transition-[border-color,background-color,box-shadow] duration-[var(--transition-fast)] px-[0.85rem] py-[0.65rem] placeholder:text-[var(--field-placeholder)] placeholder:opacity-100 hover:border-[var(--color-border-strong)] focus:outline-none focus:border-[var(--field-border-focus)] focus:shadow-[0_0_0_3px_var(--field-focus-ring)] disabled:bg-[#f8fafc] disabled:text-[#64748b] disabled:cursor-not-allowed read-only:bg-[var(--color-surface-soft)] read-only:text-[var(--color-text-muted)] read-only:cursor-default [&.invalid]:border-[var(--color-error)] [&.invalid]:bg-[var(--color-error-bg)] [&.invalid]:shadow-[0_0_0_3px_rgba(180,35,24,0.08)] [&.invalid]:focus:border-[var(--color-error)] [&.invalid]:focus:shadow-[0_0_0_3px_rgba(180,35,24,0.12)] aria-[invalid=true]:border-[var(--color-error)] aria-[invalid=true]:bg-[var(--color-error-bg)] aria-[invalid=true]:shadow-[0_0_0_3px_rgba(180,35,24,0.08)] aria-[invalid=true]:focus:outline-[3px_solid_rgba(180,35,24,0.18)] aria-[invalid=true]:focus:outline-offset-2 aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(180,35,24,0.12)] aria-[invalid=true]:focus-visible:outline-[3px_solid_rgba(180,35,24,0.18)] aria-[invalid=true]:focus-visible:outline-offset-2 aria-[invalid=true]:focus-visible:shadow-[0_0_0_3px_rgba(180,35,24,0.12)]';

export const checkupFieldLayoutClasses =
  'box-border border border-[var(--field-border)] rounded-[var(--field-radius)] leading-[1.35] transition-[border-color,background-color,box-shadow] duration-[var(--transition-fast)] px-[0.85rem] py-[0.65rem] placeholder:text-[var(--field-placeholder)] placeholder:opacity-100 hover:border-[var(--color-border-strong)] focus:outline-none focus:border-[var(--field-border-focus)] focus:shadow-[0_0_0_3px_var(--field-focus-ring)] disabled:bg-[#f8fafc] disabled:text-[#64748b] disabled:cursor-not-allowed [&.invalid]:border-[var(--color-error)] [&.invalid]:bg-[var(--color-error-bg)] [&.invalid]:shadow-[0_0_0_3px_rgba(180,35,24,0.08)] [&.invalid]:focus:outline-none [&.invalid]:focus:border-[var(--color-error)] [&.invalid]:focus:shadow-[0_0_0_3px_rgba(180,35,24,0.08)] aria-[invalid=true]:border-[var(--color-error)] aria-[invalid=true]:bg-[var(--color-error-bg)] aria-[invalid=true]:shadow-[0_0_0_3px_rgba(180,35,24,0.08)] aria-[invalid=true]:focus:outline-none aria-[invalid=true]:focus:border-[var(--color-error)] aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(180,35,24,0.08)]';

export const formLabelClasses =
  'text-[var(--color-text-secondary)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] leading-[1.25]';

export const requiredLabelClasses = "after:content-['_*'] after:text-[#b42318]";

export const checkupGridClasses =
  'gap-[0.85rem_1rem] max-[720px]:gap-[0.75rem]';

export const checkupCardBodyClasses =
  'px-6 py-5 max-[720px]:p-4';

export const checkupSectionTitleClasses =
  'mb-[0.85rem] text-[1.35rem] leading-[1.25]';

export const motherCheckupSectionTitleClasses =
  'mt-[0.8rem] mb-[0.55rem] text-[1.05rem] leading-[1.25]';

export const checkupActionsClasses =
  'flex flex-wrap items-center gap-[0.65rem] mt-5 pt-4 border-t border-[#e8edf3] max-[720px]:[&_.btn-primary]:flex-[1_1_140px] max-[720px]:[&_.btn-secondary]:flex-[1_1_140px]';

export const checkupMessageClasses =
  'rounded-[12px] shadow-[0_8px_20px_rgba(15,23,42,0.06)]';

export const checkupSuccessMessageClasses =
  'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]';

export const checkupErrorMessageClasses =
  'border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error)]';

export const formErrorClasses =
  'text-[var(--color-error)] rounded-[12px] shadow-[0_8px_20px_rgba(15,23,42,0.06)]';

export const fieldValidationClasses =
  'text-[var(--color-error)]';

export const filterControlClasses =
  'box-border min-h-[var(--field-height)] border border-[var(--field-border)] rounded-[var(--field-radius)] bg-white text-[var(--slate-dark)] [font:inherit] leading-[1.35] transition-[border-color,background-color,box-shadow] duration-[var(--transition-fast)] hover:border-[var(--color-border-strong)] focus:outline-none focus:border-[var(--field-border-focus)] focus:shadow-[0_0_0_3px_var(--field-focus-ring)] disabled:bg-[#f8fafc] disabled:text-[#64748b] disabled:cursor-not-allowed';

export const archiveControlClasses =
  'box-border min-h-[var(--field-height)] border border-[var(--field-border)] rounded-[var(--field-radius)] bg-white text-[var(--slate-dark)] [font:inherit] leading-[1.35] transition-[border-color,background-color,box-shadow] duration-[var(--transition-fast)] hover:border-[var(--color-border-strong)]';

export const filterInteractionClasses =
  'transition-[border-color,background-color,box-shadow] duration-[var(--transition-fast)] hover:border-[var(--color-border-strong)] focus:outline-none focus:border-[var(--field-border-focus)] focus:shadow-[0_0_0_3px_var(--field-focus-ring)] disabled:bg-[#f8fafc] disabled:text-[#64748b] disabled:cursor-not-allowed';

export const searchContainerClasses =
  'transition-[border-color,background-color,box-shadow] duration-[var(--transition-fast)] hover:border-[var(--color-border-strong)] focus-within:border-[var(--field-border-focus)] focus-within:outline-[3px_solid_var(--field-focus-ring)] focus-within:outline-offset-2';

export const searchInputClasses =
  'focus-visible:outline-none';

export const maternalToggleRowClasses =
  'min-h-11 py-2';

export const labRequestListClasses =
  'grid grid-cols-2 gap-[0.25rem_0.75rem] max-h-[220px] px-[0.7rem] py-[0.55rem] overflow-y-auto border border-[#d7e2eb] rounded-[10px] bg-[#f8fafc] max-[720px]:grid-cols-1 max-[720px]:max-h-[190px]';

export const labRequestOptionClasses =
  'flex items-center gap-[0.55rem] min-w-0 min-h-[28px] px-[0.3rem] py-[0.15rem] rounded-[6px] text-[#334155] text-[0.78rem] leading-[1.3] cursor-pointer';

export const labRequestSelectedClasses =
  'bg-[#eaf5ef] text-[#176344]';

export const labRequestCheckboxClasses =
  'flex-[0_0_auto] w-[0.9rem] h-[0.9rem] m-0 accent-[#1f8f69]';

export const labRequestHelpClasses =
  'mt-[0.3rem] text-[0.72rem]';

export const checkupConfirmModalClasses =
  'w-[min(620px,calc(100vw-2rem))] max-w-[620px] [&>.modal-body]:p-[1.25rem_1.5rem]';

export const checkupConfirmIntroClasses =
  'm-0 mb-4 text-[#475569]';

export const checkupConfirmHeadingClasses =
  'flex items-center justify-between gap-4 mb-[0.9rem] p-[0.8rem_0.9rem] border border-[#dbe5ee] rounded-[10px] bg-[#f8fafc] text-[#243448] max-[720px]:items-start max-[720px]:flex-col max-[720px]:gap-1 [&_span]:flex-[0_0_auto] [&_span]:text-[#526579] [&_span]:text-[0.88rem]';

export const checkupConfirmSummaryClasses =
  'grid grid-cols-2 gap-0 m-0 border border-[#e2e8f0] rounded-[10px] overflow-hidden [&>div]:min-w-0 [&>div]:p-[0.65rem_0.8rem] [&>div]:border-b [&>div]:border-[#edf1f5] [&>div:nth-child(odd):not(.checkup-confirm-summary-wide)]:border-r [&>div:nth-child(odd):not(.checkup-confirm-summary-wide)]:border-[#edf1f5] [&>div:nth-last-child(-n+2)]:border-b-0 [&>.checkup-confirm-summary-wide]:col-span-full [&>.checkup-confirm-summary-wide]:border-r-0 [&_dt]:mb-[0.15rem] [&_dt]:text-[#64748b] [&_dt]:text-[0.76rem] [&_dt]:font-bold [&_dd]:m-0 [&_dd]:text-[#1e293b] [&_dd]:text-[0.9rem] [&_dd]:leading-[1.45] [&_dd]:[overflow-wrap:anywhere]';

export const checkupConfirmNoteClasses =
  'm-0 mt-[0.9rem] text-[#64748b] text-[0.8rem]';
