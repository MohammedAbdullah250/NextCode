import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="card">
      <h1>Page not found</h1>
      <p>
        The page you are looking for does not exist. <Link to="/">Go to the dashboard</Link>.
      </p>
    </section>
  );
}
