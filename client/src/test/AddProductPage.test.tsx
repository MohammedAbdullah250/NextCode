import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddProductPage } from '../pages/AddProductPage';

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/products/new', element: <AddProductPage /> },
      { path: '/products/:id', element: <p>Product page</p> },
    ],
    { initialEntries: ['/products/new'] },
  );
  render(<RouterProvider router={router} />);
}

afterEach(() => vi.unstubAllGlobals());

describe('AddProductPage', () => {
  it('US-01 AC2: shows errors and does not call the server when fields are missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Save product' }));

    expect(screen.getByText('Product name is required.')).toBeInTheDocument();
    expect(screen.getByText('Quantity is required.')).toBeInTheDocument();
    expect(screen.getByText('Expiry date is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Product name *')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('US-01 AC1: saves a valid product and opens it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ product: { id: 7, name: 'Milk' } }), { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await userEvent.type(screen.getByLabelText('Product name *'), 'Milk');
    await userEvent.type(screen.getByLabelText('Quantity *'), '12');
    await userEvent.type(screen.getByLabelText('Expiry date *'), '2026-12-01');
    await userEvent.click(screen.getByRole('button', { name: 'Save product' }));

    expect(await screen.findByText('Product page')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/products');
    expect(JSON.parse(init.body)).toMatchObject({ name: 'Milk', quantity: 12, expiryDate: '2026-12-01', unit: 'items' });
  });
});
