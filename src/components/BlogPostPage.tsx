import BlogShell from './BlogShell';
import BlogPost from './BlogPost';

export default function BlogPostPage({ slug }: { slug: string }) {
  return (
    <BlogShell>
      <BlogPost slug={slug} />
    </BlogShell>
  );
}
