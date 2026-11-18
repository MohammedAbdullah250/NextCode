import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="panel">
      <div className="empty">
        <p className="empty-title">This page doesn’t exist.</p>
        <p>
          <Link to="/">Back to Today</Link>
        </p>
      </div>
    </section>
  );
}
