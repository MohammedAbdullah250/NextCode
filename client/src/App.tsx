import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AuthProvider, RequireAuth, RequireRole } from './auth';
import { Layout } from './components/Layout';
import { AddProductPage } from './pages/AddProductPage';
import { DashboardPage } from './pages/DashboardPage';
import { ErrorPage } from './pages/ErrorPage';
import { InventoryPage } from './pages/InventoryPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProductPage } from './pages/ProductPage';
import { ReportsPage } from './pages/ReportsPage';
import { SetupPage } from './pages/SetupPage';
import { UsersPage } from './pages/UsersPage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <ErrorPage /> },
  { path: '/setup', element: <SetupPage />, errorElement: <ErrorPage /> },
  {
    element: <RequireAuth />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            // Keeps the sidebar visible if a single page crashes.
            errorElement: <ErrorPage />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'inventory', element: <InventoryPage /> },
              { path: 'products/new', element: <AddProductPage /> },
              { path: 'products/:id', element: <ProductPage /> },
              {
                element: <RequireRole roles={['manager', 'admin']} />,
                children: [{ path: 'reports', element: <ReportsPage /> }],
              },
              {
                element: <RequireRole roles={['admin']} />,
                children: [{ path: 'users', element: <UsersPage /> }],
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
