import { Suspense, lazy } from 'react';
import SiteView from './components/SiteView';
import { useHashRoute } from './hooks/useHashRoute';

// 后台按需加载，不进前台首屏体积
const AdminPanel = lazy(() => import('./admin/AdminPanel'));

export default function App() {
  const hash = useHashRoute();
  const isAdmin = hash.startsWith('#/admin');

  if (isAdmin) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <p className="animate-flicker font-mono text-sm text-cyan">载入后台…</p>
          </div>
        }
      >
        <AdminPanel />
      </Suspense>
    );
  }

  return <SiteView />;
}
