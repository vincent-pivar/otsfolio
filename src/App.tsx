import { Suspense, lazy, useEffect, useState } from 'react';
import SiteView from './components/SiteView';
import BlogListPage from './components/BlogListPage';
import BlogPostPage from './components/BlogPostPage';
import { useHashRoute } from './hooks/useHashRoute';
import { useSite } from './hooks/useSite';
import { useDocumentMeta } from './hooks/useDocumentMeta';
import { isLoggedIn } from './auth';

// 后台按需加载，不进前台首屏体积
const AdminPanel = lazy(() => import('./admin/AdminPanel'));
const AdminLogin = lazy(() => import('./admin/AdminLogin'));

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="animate-flicker font-mono text-sm text-cyan">载入中…</p>
    </div>
  );
}

/** 后台入口：先过登录闸门 */
function AdminRoute() {
  const { settings } = useSite();
  const [authed, setAuthed] = useState(() => isLoggedIn());

  // 未设置口令时直接放行，但后台会提示设置
  const needLogin = settings.adminPassHash !== '' && !authed;

  return (
    <Suspense fallback={<Loading />}>
      {needLogin ? <AdminLogin onSuccess={() => setAuthed(true)} /> : <AdminPanel />}
    </Suspense>
  );
}

export default function App() {
  const hash = useHashRoute();
  const { settings, posts } = useSite();

  // 解析路由
  const path = hash.replace(/^#\/?/, ''); // '' | 'blog' | 'blog/xxx' | 'admin'
  const isAdmin = path.startsWith('admin');
  const isBlogPost = /^blog\/.+/.test(path);
  const isBlogList = path === 'blog';

  const slug = isBlogPost ? decodeURIComponent(path.slice('blog/'.length)) : '';
  const post = isBlogPost ? posts.find((p) => p.slug === slug && p.published) : undefined;

  // 页面标题与分享元信息
  const meta = isAdmin
    ? { title: '内容管理后台' }
    : isBlogPost
      ? {
          title: post ? `${post.title} — ${settings.siteTitle}` : `文章不存在 — ${settings.siteTitle}`,
          description: post?.excerpt || settings.siteDescription,
          image: post?.cover,
          type: 'article' as const,
        }
      : isBlogList
        ? { title: `博客 — ${settings.siteTitle}`, description: settings.siteDescription }
        : { title: settings.siteTitle, description: settings.siteDescription };

  useDocumentMeta(meta);

  // 路由切换后回到页首（锚点跳转除外）
  useEffect(() => {
    if (!hash.startsWith('#/')) return;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [hash]);

  if (isAdmin) return <AdminRoute />;
  if (isBlogPost) return <BlogPostPage slug={slug} />;
  if (isBlogList) return <BlogListPage />;
  return <SiteView />;
}
