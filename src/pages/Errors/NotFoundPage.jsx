import { Home, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section
      className="grid min-h-[65vh] place-items-center px-4 py-10"
      aria-labelledby="not-found-title"
    >
      <div className="w-full max-w-xl rounded-3xl border border-f1kd-border bg-f1kd-surface p-8 text-center shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-12">
        <div
          className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-f1kd-brand-soft text-f1kd-brand"
          aria-hidden="true"
        >
          <Search size={25} />
        </div>
        <p className="mb-2 text-sm font-bold tracking-[0.16em] text-f1kd-brand">404 ERROR</p>
        <h1 id="not-found-title" className="m-0 text-3xl font-bold tracking-tight text-f1kd-text sm:text-4xl">
          Page not found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-f1kd-secondary">
          The address may be incorrect, or the page may have moved. Return to your workspace to continue.
        </p>
        <Link
          to="/community"
          className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-[11px] border border-f1kd-brand bg-f1kd-brand px-5 py-3 text-sm font-semibold text-white no-underline shadow-sm transition hover:-translate-y-px hover:bg-f1kd-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-f1kd-brand"
        >
          <Home size={18} aria-hidden="true" />
          Go to Community
        </Link>
      </div>
    </section>
  );
}
