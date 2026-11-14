import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

/** Shown instead of a blank screen if a page crashes. */
export function ErrorPage() {
  const error = useRouteError();
  console.error(error);
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <section className="panel" style={{ maxWidth: 560, margin: '3rem auto' }}>
      <div className="empty">
        <p className="empty-title">{notFound ? 'This page doesn’t exist.' : 'Something went wrong on this page.'}</p>
        <p>
          {notFound ? null : 'Your data is safe. '}
          <a href="/" onClick={() => window.location.assign('/')}>
            Reload FreshTrack
          </a>{' '}
          or go back to <Link to="/inventory">Inventory</Link>.
        </p>
      </div>
    </section>
  );
}
