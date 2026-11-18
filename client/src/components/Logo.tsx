export function Logo({ size }: { size: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path className="logo-tag" d="M4 7a3 3 0 0 1 3-3h11.2a3 3 0 0 1 2.1.9l7.8 7.8a3 3 0 0 1 0 4.2L17.9 27.1a3 3 0 0 1-4.2 0L4.9 18.3A3 3 0 0 1 4 16.2z" />
      <circle className="logo-hole" cx="10.5" cy="10.5" r="2.3" />
      <path className="logo-lines" d="M13 19.5l6.5-6.5M16 22.5l6.5-6.5" />
    </svg>
  );
}
