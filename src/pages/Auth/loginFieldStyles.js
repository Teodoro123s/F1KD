export const loginFieldClassName = [
  'login-floating-field relative flex w-full flex-col',
  '[&.is-focused_.login-floating-field__icon--key]:text-[#15803d]',
  '[&.is-focused_.login-floating-label]:-translate-y-[26px]',
  '[&.is-focused_.login-floating-label]:scale-[.85]',
  '[&.is-focused_.login-floating-label]:font-semibold',
  '[&.is-focused_.login-floating-label]:text-[#15803d]',
  '[&.has-value_.login-floating-label]:-translate-y-[26px]',
  '[&.has-value_.login-floating-label]:scale-[.85]',
  '[&.has-value_.login-floating-label]:font-semibold',
  '[&.has-value:not(.is-focused)_.login-floating-label]:text-[#64748b]',
  '[&.is-focused_.login-floating-field__line:after]:scale-x-100',
  '[&:focus-within_.login-floating-field__line:after]:scale-x-100',
].join(' ');

export const loginInputClassName = [
  '!h-7 !w-full !border-0 !rounded-none !bg-transparent !p-0 !shadow-none !outline-none',
  'm-0 box-border text-base leading-7 text-[#0f172a]',
  '[&:focus~.login-floating-label]:-translate-y-[26px]',
  '[&:focus~.login-floating-label]:scale-[.85]',
  '[&:focus~.login-floating-label]:font-semibold',
  '[&:focus~.login-floating-label]:text-[#15803d]',
  '[&:not(:placeholder-shown)~.login-floating-label]:-translate-y-[26px]',
  '[&:not(:placeholder-shown)~.login-floating-label]:scale-[.85]',
  '[&:not(:placeholder-shown)~.login-floating-label]:font-semibold',
  '[&:not(:placeholder-shown):not(:focus)~.login-floating-label]:text-[#64748b]',
  '![&:-webkit-autofill]:[-webkit-box-shadow:inset_0_0_0_30px_#ffffff]',
  '![&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a]',
  '![&:-webkit-autofill]:[box-shadow:inset_0_0_0_30px_#ffffff]',
  '[&:-webkit-autofill]:[caret-color:#0f172a]',
  '[&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s]',
  '[&:-webkit-autofill]:[animation-name:onAutoFillStart]',
  '[&:-webkit-autofill~.login-floating-label]:-translate-y-[26px]',
  '[&:-webkit-autofill~.login-floating-label]:scale-[.85]',
  '[&:-webkit-autofill~.login-floating-label]:font-semibold',
  '[&:autofill~.login-floating-label]:-translate-y-[26px]',
  '[&:autofill~.login-floating-label]:scale-[.85]',
  '[&:autofill~.login-floating-label]:font-semibold',
  '[&:-webkit-autofill:not(:focus)~.login-floating-label]:text-[#64748b]',
  '[&:autofill:not(:focus)~.login-floating-label]:text-[#64748b]',
].join(' ');

export const loginFloatingLabelClassName = [
  'login-floating-label pointer-events-none absolute bottom-1 left-0 inline-flex origin-bottom-left',
  'items-center gap-0.5 whitespace-nowrap text-[0.95rem] text-[#64748b]',
  'transition-[transform,color,font-size] duration-200',
  '[transition-timing-function:cubic-bezier(0.2,0,0,1)]',
].join(' ');

export const loginButtonClassName = 'login-button !inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-[#16a34a] [background-image:linear-gradient(180deg,#16a34a_0%,#15803d_100%)] px-4 text-base font-semibold text-white shadow-[0_4px_14px_rgba(21,128,61,0.3)] transition-[all] duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:not-disabled:[background-image:linear-gradient(180deg,#15803d_0%,#166534_100%)] hover:not-disabled:shadow-[0_6px_20px_rgba(21,128,61,0.4)] hover:not-disabled:-translate-y-px active:not-disabled:translate-y-0 active:not-disabled:shadow-[0_2px_8px_rgba(21,128,61,0.25)] disabled:cursor-not-allowed disabled:opacity-[0.65] disabled:shadow-none disabled:transform-none';
