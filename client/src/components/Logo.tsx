/** FreshTrack mark: a shelf tag with a date notch. */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 7a3 3 0 0 1 3-3h11.2a3 3 0 0 1 2.1.9l7.8 7.8a3 3 0 0 1 0 4.2L17.9 27.1a3 3 0 0 1-4.2 0L4.9 18.3A3 3 0 0 1 4 16.2z" fill="#3f8a55" />
      <circle cx="10.5" cy="10.5" r="2.3" fill="#1b1e1a" />
      <path d="M13 19.5l6.5-6.5M16 22.5l6.5-6.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
