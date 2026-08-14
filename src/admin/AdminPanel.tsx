import { useState, useRef, useEffect } from 'react';
import type {
  SiteData,
  Profile,
  Contact,
  Social,
  Project,
  TimelineItem,
  SkillGroup,
  Post,
} from '../types';
import { autoExcerpt, slugify } from '../markdown';
import { hashPass, logout } from '../auth';
import MarkdownEditor from './MarkdownEditor';
import { loadSite, saveSite, resetSite, exportSite, importSite, newId, pushToCloud } from '../store';

/* ---------- 可复用子组件 ---------- */

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-mono tracking-wider text-slate-300 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-void/60 border border-line px-3 py-2 text-slate-100 text-sm focus:border-cyan focus:outline-none focus:shadow-neon transition-all"
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-mono tracking-wider text-slate-300 mb-1">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-void/60 border border-line px-3 py-2 text-slate-100 text-sm focus:border-cyan focus:outline-none focus:shadow-neon transition-all resize-y"
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-mono tracking-wider text-slate-300 mb-1">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-void/60 border border-line px-3 py-2 text-slate-100 text-sm focus:border-cyan focus:outline-none focus:shadow-neon transition-all"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StringListEditor({
  id,
  label,
  items,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (!v) return;
    onChange([...items, v]);
    setInput('');
  };

  const remove = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-mono tracking-wider text-slate-300 mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2 min-h-[28px]">
        {items.map((it, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-cyan/10 border border-cyan/40 px-2 py-1 text-xs text-cyan font-mono"
          >
            {it}
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-magenta hover:text-cyan ml-0.5"
              aria-label={`移除 ${it}`}
            >
              ✕
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-muted">暂无</span>}
      </div>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={input}
          placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          className="flex-1 bg-void/60 border border-line px-3 py-2 text-slate-100 text-sm focus:border-cyan focus:outline-none focus:shadow-neon transition-all"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 text-xs text-cyan border border-cyan/40 hover:bg-cyan hover:text-void transition-all"
        >
          添加
        </button>
      </div>
    </div>
  );
}

/* ---------- 主组件 ---------- */

type TabKey = 'profile' | 'posts' | 'projects' | 'timeline' | 'skills' | 'settings' | 'data';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'posts', label: '博客' },
  { key: 'profile', label: '基本资料' },
  { key: 'projects', label: '项目' },
  { key: 'timeline', label: '历程' },
  { key: 'skills', label: '技能' },
  { key: 'settings', label: '设置' },
  { key: 'data', label: '数据' },
];

/* ---------- 访问统计面板 ---------- */
type StatData = {
  totalViews: number;
  uniqueVisitors: number;
  perPost: { slug: string; views: number; reads: number; avg_duration: number }[];
  byCountry: { country: string; c: number }[];
  daily: { day: string; views: number; reads: number }[];
};

function StatsPanel() {
  const [data, setData] = useState<StatData | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const site = loadSite();
      const hash = site.settings?.adminPassHash || '';
      const r = await fetch('/api/track', { headers: { 'x-admin-hash': hash } });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || '加载失败');
      setData(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const maxViews = Math.max(1, ...(data?.perPost.map((p) => p.views) || []));
  const totalCountry = data?.byCountry.reduce((s, c) => s + c.c, 0) || 1;
  const titleOf = (slug: string) => {
    if (slug.startsWith('page:')) {
      const map: Record<string, string> = {
        home: '🏠 首页',
        blog: '📝 博客列表',
        about: '👤 关于',
        projects: '💼 作品',
        timeline: '📈 历程',
        skills: '🛠 技能',
        contact: '📮 联系',
      };
      return map[slug.slice(5)] || slug;
    }
    const p = loadSite().posts.find((x) => x.slug === slug);
    return p?.title || slug;
  };

  return (
    <section className="cyber-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="section-label">访问统计（D1 实时）</h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="px-3 py-1 text-xs text-cyan border border-cyan/40 hover:bg-cyan hover:text-void transition-all disabled:opacity-50"
        >
          {loading ? '刷新中…' : '刷新'}
        </button>
      </div>

      {err && <p className="text-magenta text-xs mt-3">{err}</p>}

      {data && (
        <div className="mt-4 space-y-6">
          {/* 总览 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="border border-line p-3">
              <div className="font-display text-2xl text-cyan">{data.totalViews}</div>
              <div className="text-xs text-muted mt-1">总访问次数</div>
              <div className="text-[10px] text-line mt-0.5 leading-tight">所有页面+文章的浏览量总和（同一人反复看会重复计）</div>
            </div>
            <div className="border border-line p-3">
              <div className="font-display text-2xl text-cyan">{data.uniqueVisitors}</div>
              <div className="text-xs text-muted mt-1">真实访问人数</div>
              <div className="text-[10px] text-line mt-0.5 leading-tight">按 IP 去重后的独立访客数（同一人只算 1 个）</div>
            </div>
            <div className="border border-line p-3">
              <div className="font-display text-2xl text-cyan">{data.perPost.length}</div>
              <div className="text-xs text-muted mt-1">有数据的页面</div>
              <div className="text-[10px] text-line mt-0.5 leading-tight">被访问过的页面/文章数量（不含无人看的）</div>
            </div>
            <div className="border border-line p-3">
              <div className="font-display text-2xl text-cyan">
                {data.byCountry.length}
              </div>
              <div className="text-xs text-muted mt-1">国家/地区数</div>
              <div className="text-[10px] text-line mt-0.5 leading-tight">访客来源的国家分布（仅国家级，无省份）</div>
            </div>
            <div className="border border-line p-3">
              <div className="font-display text-2xl text-cyan">
                {data.daily.length ? data.daily[data.daily.length - 1].views : 0}
              </div>
              <div className="text-xs text-muted mt-1">今日访问</div>
              <div className="text-[10px] text-line mt-0.5 leading-tight">当天（按 UTC）产生的访问次数</div>
            </div>
          </div>

          {/* 每篇文章阅读数 */}
          <div>
            <h3 className="text-xs font-mono text-muted mb-2">各文章阅读次数 / 平均时长</h3>
            <div className="space-y-2">
              {data.perPost.map((p) => (
                <div key={p.slug} className="flex items-center gap-3">
                  <div className="w-48 shrink-0 truncate text-sm text-slate-200" title={titleOf(p.slug)}>
                    {titleOf(p.slug)}
                  </div>
                  <div className="h-2 flex-1 bg-void/60">
                    <div
                      className="h-full bg-cyan"
                      style={{ width: `${(p.views / maxViews) * 100}%` }}
                    />
                  </div>
                  <div className="w-16 shrink-0 text-right font-mono text-xs text-muted">
                    {p.views} 次
                  </div>
                  <div className="w-20 shrink-0 text-right font-mono text-xs text-muted">
                    {Math.round(p.avg_duration)}s 均
                  </div>
                </div>
              ))}
              {data.perPost.length === 0 && (
                <p className="text-xs text-muted">暂无数据，访问文章后自动累计</p>
              )}
            </div>
          </div>

          {/* 国家占比 */}
          <div>
            <h3 className="text-xs font-mono text-muted mb-2">国家 / 地区占比</h3>
            <div className="flex flex-wrap gap-2">
              {data.byCountry.map((c) => (
                <span
                  key={c.country}
                  className="border border-line px-2 py-1 font-mono text-xs text-slate-200"
                >
                  {c.country === 'XX' ? '未知' : c.country} ·{' '}
                  <span className="text-cyan">
                    {((c.c / totalCountry) * 100).toFixed(1)}%
                  </span>
                </span>
              ))}
              {data.byCountry.length === 0 && (
                <p className="text-xs text-muted">暂无数据</p>
              )}
            </div>
          </div>

          {/* 近 14 天趋势 */}
          <div>
            <h3 className="text-xs font-mono text-muted mb-2">近 14 天趋势</h3>
            <div className="flex items-end gap-1 h-24">
              {data.daily.map((d) => (
                <div
                  key={d.day}
                  className="flex-1 bg-cyan/30 hover:bg-cyan/60 transition-colors"
                  style={{ height: `${(d.views / Math.max(1, ...data.daily.map((x) => x.views))) * 100}%` }}
                  title={`${d.day}: ${d.views} 次访问`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function AdminPanel() {
  const [state, setState] = useState<SiteData>(() => loadSite());
  const [activeTab, setActiveTab] = useState<TabKey>('posts');
  const [showSaved, setShowSaved] = useState(false);
  const [coverErrors, setCoverErrors] = useState<Record<string, string>>({});
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [saveError, setSaveError] = useState('');
  /** 当前展开编辑的文章 id；null 表示都折叠 */
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [passMsg, setPassMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const savedRef = useRef<string>(JSON.stringify(state));
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = JSON.stringify(state) !== savedRef.current;

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  // 有未保存修改时，拦截关闭/刷新与返回前台，避免内容丢失
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onHashChange = () => {
      if (window.location.hash.startsWith('#/admin')) return;
      if (!window.confirm('有未保存的修改，确定离开后台？修改将丢失。')) {
        window.location.hash = '#/admin';
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [dirty]);

  /* ----- 保存 / 数据操作 ----- */

  const handleSave = () => {
    try {
      saveSite(state);
      savedRef.current = JSON.stringify(state);
      setSaveError('');
      setShowSaved(true);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => setShowSaved(false), 2000);
      // 同步到云端（D1）。失败不影响本地保存。
      pushToCloud(state, state.settings.adminPassHash).then((ok) => {
        if (ok) console.info('[portfolio] 已同步到云端');
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '保存失败');
      setShowSaved(false);
    }
  };

  const handleImport = () => {
    try {
      const data = importSite(importText);
      setState(data);
      setImportError('');
    } catch (e) {
      setImportError(e instanceof Error ? e.message : '导入失败：JSON 格式错误');
    }
  };

  const handleReset = () => {
    if (!window.confirm('确定恢复默认内容？当前所有修改将丢失。')) return;
    resetSite();
    const fresh = loadSite();
    setState(fresh);
    savedRef.current = JSON.stringify(fresh);
  };

  /* ----- Profile / Contacts / Socials ----- */

  const updateProfile = (patch: Partial<Profile>) =>
    setState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));

  const updateContact = (index: number, patch: Partial<Contact>) =>
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        contacts: prev.profile.contacts.map((c, i) => (i === index ? { ...c, ...patch } : c)),
      },
    }));

  const removeContact = (index: number) =>
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        contacts: prev.profile.contacts.filter((_, i) => i !== index),
      },
    }));

  const addContact = () =>
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        contacts: [...prev.profile.contacts, { label: '', value: '', href: '' }],
      },
    }));

  const updateSocial = (index: number, patch: Partial<Social>) =>
    setState((prev) => ({
      ...prev,
      socials: prev.socials.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));

  const removeSocial = (index: number) =>
    setState((prev) => ({
      ...prev,
      socials: prev.socials.filter((_, i) => i !== index),
    }));

  const addSocial = () =>
    setState((prev) => ({
      ...prev,
      socials: [...prev.socials, { name: '', handle: '', href: '', icon: '' }],
    }));

  /* ----- Projects ----- */

  const updateProject = (id: string, patch: Partial<Project>) =>
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));

  const removeProject = (id: string) => {
    const target = state.projects.find((p) => p.id === id);
    if (!window.confirm(`确定删除项目「${target?.name || '未命名'}」？此操作不可撤销。`)) return;
    setState((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
  };

  const addProject = () =>
    setState((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          id: newId(),
          name: '',
          subtitle: '',
          desc: '',
          tags: [],
          highlights: [],
          status: '开发中',
          accent: 'cyan',
        },
      ],
    }));

  const handleCoverUpload = (projectId: string, file: File | undefined) => {
    if (!file) return;
    if (file.size > 400 * 1024) {
      setCoverErrors((prev) => ({ ...prev, [projectId]: '文件过大（超过 400KB），请使用更小的图片' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => (p.id === projectId ? { ...p, cover: result } : p)),
      }));
      setCoverErrors((prev) => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const removeCover = (projectId: string) =>
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === projectId ? { ...p, cover: undefined } : p)),
    }));

  /* ----- Timeline ----- */

  const updateTimeline = (id: string, patch: Partial<TimelineItem>) =>
    setState((prev) => ({
      ...prev,
      timeline: prev.timeline.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));

  const removeTimeline = (id: string) => {
    const target = state.timeline.find((t) => t.id === id);
    if (!window.confirm(`确定删除历程「${target?.title || '未命名'}」？此操作不可撤销。`)) return;
    setState((prev) => ({
      ...prev,
      timeline: prev.timeline.filter((t) => t.id !== id),
    }));
  };

  const addTimeline = () =>
    setState((prev) => ({
      ...prev,
      timeline: [
        ...prev.timeline,
        { id: newId(), period: '', title: '', desc: '', tags: [], current: false },
      ],
    }));

  const handleCurrentChange = (id: string, checked: boolean) =>
    setState((prev) => ({
      ...prev,
      timeline: prev.timeline.map((t) => {
        if (t.id === id) return { ...t, current: checked };
        if (checked) return { ...t, current: false };
        return t;
      }),
    }));

  /* ----- Skills ----- */

  const updateSkill = (id: string, patch: Partial<SkillGroup>) =>
    setState((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));

  const removeSkill = (id: string) => {
    const target = state.skills.find((s) => s.id === id);
    if (!window.confirm(`确定删除技能分组「${target?.group || '未命名'}」？此操作不可撤销。`)) return;
    setState((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s.id !== id),
    }));
  };

  const addSkill = () =>
    setState((prev) => ({
      ...prev,
      skills: [...prev.skills, { id: newId(), group: '', items: [] }],
    }));

  /* ----- 博客文章 ----- */

  const updatePost = (id: string, patch: Partial<Post>) =>
    setState((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));

  const removePost = (id: string) => {
    const target = state.posts.find((p) => p.id === id);
    if (!window.confirm(`确定删除文章「${target?.title || '未命名'}」？此操作不可撤销。`)) return;
    setState((prev) => ({ ...prev, posts: prev.posts.filter((p) => p.id !== id) }));
  };

  const addPost = () => {
    const today = new Date().toISOString().slice(0, 10);
    const fresh: Post = {
      id: newId(),
      slug: 'post-' + Date.now().toString(36),
      title: '',
      excerpt: '',
      body: '',
      tags: [],
      date: today,
      published: false,
    };
    setState((prev) => ({ ...prev, posts: [fresh, ...prev.posts] }));
    setExpandedPost(fresh.id);
  };

  /** 由标题生成 slug，并保证站内唯一 */
  const regenSlug = (id: string) => {
    const post = state.posts.find((p) => p.id === id);
    if (!post || !post.title.trim()) return;
    let base = slugify(post.title);
    const taken = new Set(state.posts.filter((p) => p.id !== id).map((p) => p.slug));
    let candidate = base;
    let n = 2;
    while (taken.has(candidate)) candidate = `${base}-${n++}`;
    updatePost(id, { slug: candidate });
  };

  const fillExcerpt = (id: string) => {
    const post = state.posts.find((p) => p.id === id);
    if (!post) return;
    updatePost(id, { excerpt: autoExcerpt(post.body, 120) });
  };

  const handlePostCover = (postId: string, file: File | null) => {
    if (!file) return;
    if (file.size > 400 * 1024) {
      setCoverErrors((prev) => ({
        ...prev,
        ['post-' + postId]: '文件过大（超过 400KB），请使用更小的图片',
      }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      updatePost(postId, { cover: result });
      setCoverErrors((prev) => {
        const next = { ...prev };
        delete next['post-' + postId];
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  /* ----- 设置 ----- */

  const updateSettings = (patch: Partial<SiteData['settings']>) =>
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));

  const handleChangePass = async () => {
    if (newPass.length < 6) {
      setPassMsg({ kind: 'err', text: '口令至少 6 位' });
      return;
    }
    if (newPass !== newPass2) {
      setPassMsg({ kind: 'err', text: '两次输入不一致' });
      return;
    }
    try {
      const hash = await hashPass(newPass);
      // 口令改动立即落盘，避免忘记点保存导致状态不一致
      const next = { ...state, settings: { ...state.settings, adminPassHash: hash } };
      setState(next);
      saveSite(next);
      savedRef.current = JSON.stringify(next);
      setNewPass('');
      setNewPass2('');
      setPassMsg({ kind: 'ok', text: '口令已更新并保存' });
    } catch (e) {
      setPassMsg({ kind: 'err', text: e instanceof Error ? e.message : '更新失败' });
    }
  };

  const handleClearPass = () => {
    if (!window.confirm('清除口令后，任何人都能进入后台修改内容。确定继续？')) return;
    const next = { ...state, settings: { ...state.settings, adminPassHash: '' } };
    setState(next);
    saveSite(next);
    savedRef.current = JSON.stringify(next);
    setPassMsg({ kind: 'ok', text: '口令已清除' });
  };

  /* ----- 渲染 ----- */

  return (
    <div className="min-h-screen bg-void">
      {/* 顶部栏 + 标签栏 */}
      <header className="sticky top-0 z-20 bg-void/95 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <h1 className="font-display font-bold text-lg text-cyan neon-text tracking-wider">
            内容管理后台
          </h1>
          <div className="flex-1" />
          {dirty && (
            <span className="text-magenta text-xs font-mono">● 有未保存修改</span>
          )}
          {showSaved && (
            <span className="text-lime text-xs font-mono">✓ 已保存</span>
          )}
          <button type="button" onClick={handleSave} className="btn-neon">
            保存
          </button>
          <a
            href="#/"
            className="text-slate-300 hover:text-cyan text-xs font-mono border border-line px-3 py-2 transition-all"
          >
            返回前台
          </a>
        </div>
        {saveError && (
          <div className="border-t border-magenta/40 bg-magenta/10 px-4 py-2" role="alert">
            <p className="mx-auto max-w-6xl font-mono text-xs text-magenta">⚠ {saveError}</p>
          </div>
        )}
        <nav className="border-t border-line">
          <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-3 font-mono text-xs tracking-wider uppercase transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'text-cyan neon-text'
                    : 'text-muted hover:text-slate-300'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-cyan shadow-neon" />
                )}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* ===== 基本资料 ===== */}
        {activeTab === 'posts' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="section-label">
                文章管理（共 {state.posts.length} 篇 ·{' '}
                {state.posts.filter((p) => p.published).length} 篇已发布）
              </h2>
              <button type="button" onClick={addPost} className="btn-neon">
                + 写新文章
              </button>
            </div>

            {state.posts.length === 0 && (
              <p className="cyber-card p-8 text-center font-mono text-sm text-muted">
                还没有文章，点击右上角开始写
              </p>
            )}

            {state.posts.map((post) => {
              const open = expandedPost === post.id;
              return (
                <article key={post.id} className="cyber-card p-5">
                  {/* 折叠头部 */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedPost(open ? null : post.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                      aria-expanded={open}
                    >
                      <span className="font-mono text-xs text-cyan">{open ? '▾' : '▸'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display font-bold text-slate-100">
                          {post.title || '（未命名文章）'}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] text-muted">
                          {post.date} · {post.slug}
                        </span>
                      </span>
                    </button>

                    <span
                      className={
                        post.published
                          ? 'border border-lime/50 px-2 py-0.5 font-mono text-[10px] text-lime'
                          : 'border border-line px-2 py-0.5 font-mono text-[10px] text-muted'
                      }
                    >
                      {post.published ? '已发布' : '草稿'}
                    </span>

                    <label className="flex cursor-pointer items-center gap-1.5 font-mono text-[10px] text-muted">
                      <input
                        type="checkbox"
                        checked={post.published}
                        onChange={(e) => updatePost(post.id, { published: e.target.checked })}
                        className="accent-cyan"
                      />
                      发布
                    </label>

                    <label className="flex items-center gap-2 font-mono text-xs text-muted">
                      作者
                      <select
                        value={post.author ?? 'hermes'}
                        onChange={(e) =>
                          updatePost(post.id, {
                            author: e.target.value as 'hermes' | 'vincent',
                          })
                        }
                        className="border border-line bg-transparent px-2 py-1 font-mono text-xs text-slate-200"
                      >
                        <option value="hermes">Hermes 协作</option>
                        <option value="vincent">我的文章</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => removePost(post.id)}
                      className="border border-magenta/50 px-2.5 py-1 font-mono text-[10px] text-magenta transition-colors hover:bg-magenta/10"
                    >
                      删除
                    </button>
                  </div>

                  {/* 展开的编辑区 */}
                  {open && (
                    <div className="mt-5 space-y-4 border-t border-line pt-5">
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <TextField
                          id={`post-title-${post.id}`}
                          label="标题"
                          value={post.title}
                          onChange={(v) => updatePost(post.id, { title: v })}
                        />
                        <TextField
                          id={`post-date-${post.id}`}
                          label="日期（YYYY-MM-DD）"
                          value={post.date}
                          onChange={(v) => updatePost(post.id, { date: v })}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`post-slug-${post.id}`}
                          className="mb-1.5 block font-mono text-xs tracking-wider text-muted"
                        >
                          短链（文章地址 #/blog/…）
                        </label>
                        <div className="flex gap-2">
                          <input
                            id={`post-slug-${post.id}`}
                            value={post.slug}
                            onChange={(e) => updatePost(post.id, { slug: e.target.value })}
                            className="flex-1 border border-line bg-void/60 px-3 py-2 font-mono text-sm text-slate-100 transition-all focus:border-cyan focus:shadow-neon focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => regenSlug(post.id)}
                            className="whitespace-nowrap border border-line px-3 py-2 font-mono text-xs text-muted transition-colors hover:border-cyan hover:text-cyan"
                          >
                            由标题生成
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label
                            htmlFor={`post-excerpt-${post.id}`}
                            className="font-mono text-xs tracking-wider text-muted"
                          >
                            摘要（留空则自动截取正文）
                          </label>
                          <button
                            type="button"
                            onClick={() => fillExcerpt(post.id)}
                            className="font-mono text-[10px] text-cyan hover:text-magenta"
                          >
                            从正文生成
                          </button>
                        </div>
                        <textarea
                          id={`post-excerpt-${post.id}`}
                          rows={2}
                          value={post.excerpt}
                          onChange={(e) => updatePost(post.id, { excerpt: e.target.value })}
                          className="w-full resize-y border border-line bg-void/60 px-3 py-2 text-sm text-slate-100 transition-all focus:border-cyan focus:shadow-neon focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`post-body-${post.id}`}
                          className="mb-1.5 block font-mono text-xs tracking-wider text-muted"
                        >
                          正文（Markdown，支持插入图片 / 加粗 / 标题 / 代码 / 列表 / 引用）
                        </label>
                        <MarkdownEditor
                          id={`post-body-${post.id}`}
                          value={post.body}
                          onChange={(v) => updatePost(post.id, { body: v })}
                        />
                      </div>

                      <StringListEditor
                        id={`post-tags-${post.id}`}
                        label="标签"
                        items={post.tags}
                        onChange={(v) => updatePost(post.id, { tags: v })}
                        placeholder="输入标签后回车"
                      />

                      {/* 封面图 */}
                      <div>
                        <span className="mb-1.5 block font-mono text-xs tracking-wider text-muted">
                          封面图（可选，需小于 400KB）
                        </span>
                        {post.cover && (
                          <div className="mb-2 flex items-center gap-3">
                            <img
                              src={post.cover}
                              alt="封面预览"
                              className="h-16 w-24 border border-line object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => updatePost(post.id, { cover: undefined })}
                              className="border border-magenta/50 px-2.5 py-1 font-mono text-[10px] text-magenta transition-colors hover:bg-magenta/10"
                            >
                              移除封面
                            </button>
                          </div>
                        )}
                        <input
                          id={`post-cover-${post.id}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePostCover(post.id, e.target.files?.[0] ?? null)}
                          className="block w-full font-mono text-xs text-muted file:mr-3 file:border file:border-line file:bg-void/60 file:px-3 file:py-1.5 file:font-mono file:text-xs file:text-cyan hover:file:border-cyan"
                        />
                        {coverErrors['post-' + post.id] && (
                          <p role="alert" className="mt-1.5 font-mono text-xs text-magenta">
                            ⚠ {coverErrors['post-' + post.id]}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3 border-t border-line pt-4">
                        <a
                          href={`#/blog/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-cyan hover:text-magenta"
                        >
                          ↗ 新标签预览（需先保存）
                        </a>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <section className="cyber-card p-5">
              <h2 className="section-label">站点信息</h2>
              <div className="space-y-4">
                <TextField
                  id="site-title"
                  label="浏览器标签标题"
                  value={state.settings.siteTitle}
                  onChange={(v) => updateSettings({ siteTitle: v })}
                />
                <TextAreaField
                  id="site-desc"
                  label="站点描述（用于搜索引擎与分享卡片）"
                  value={state.settings.siteDescription}
                  onChange={(v) => updateSettings({ siteDescription: v })}
                  rows={3}
                />
              </div>
            </section>

            <section className="cyber-card p-5">
              <h2 className="section-label">评论与真人验证</h2>
              <div className="space-y-4">
                <TextField
                  id="comments-repo"
                  label="Giscus 评论仓库（owner/repo，需公开且已装 Giscus App）"
                  value={state.settings.commentsRepo ?? ''}
                  onChange={(v) => updateSettings({ commentsRepo: v })}
                  placeholder="vincent/portfolio-comments"
                />
                <TextField
                  id="turnstile-key"
                  label="Cloudflare Turnstile 站点密钥（留空则后台登录不做真人验证）"
                  value={state.settings.turnstileSiteKey ?? ''}
                  onChange={(v) => updateSettings({ turnstileSiteKey: v })}
                  placeholder="0x4AAAAAAA..."
                />
                <p className="font-body text-xs text-muted">
                  填好评论仓库后，每篇文章底部会出现 Giscus 评论区；填好 Turnstile 站点密钥后，
                  后台登录会要求先过真人验证（私钥需通过 wrangler secret 注入到 Pages Function）。
                </p>
              </div>
            </section>

            <section className="cyber-card p-5">
              <h2 className="section-label">后台访问口令</h2>
              <p className="mb-4 font-body text-sm text-muted">
                {state.settings.adminPassHash
                  ? '已设置口令。进入后台需要验证。'
                  : '尚未设置口令，任何人都能打开后台修改内容，建议立即设置。'}
              </p>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor="new-pass"
                    className="mb-1.5 block font-mono text-xs tracking-wider text-muted"
                  >
                    新口令（至少 6 位）
                  </label>
                  <input
                    id="new-pass"
                    type="password"
                    autoComplete="new-password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full border border-line bg-void/60 px-3 py-2 text-slate-100 transition-all focus:border-cyan focus:shadow-neon focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-pass2"
                    className="mb-1.5 block font-mono text-xs tracking-wider text-muted"
                  >
                    再次输入
                  </label>
                  <input
                    id="new-pass2"
                    type="password"
                    autoComplete="new-password"
                    value={newPass2}
                    onChange={(e) => setNewPass2(e.target.value)}
                    className="w-full border border-line bg-void/60 px-3 py-2 text-slate-100 transition-all focus:border-cyan focus:shadow-neon focus:outline-none"
                  />
                </div>
              </div>

              {passMsg && (
                <p
                  role="alert"
                  className={
                    passMsg.kind === 'ok'
                      ? 'mt-3 font-mono text-xs text-lime'
                      : 'mt-3 font-mono text-xs text-magenta'
                  }
                >
                  {passMsg.kind === 'ok' ? '✓ ' : '⚠ '}
                  {passMsg.text}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleChangePass()}
                  className="btn-neon"
                >
                  {state.settings.adminPassHash ? '更新口令' : '设置口令'}
                </button>
                {state.settings.adminPassHash && (
                  <button
                    type="button"
                    onClick={handleClearPass}
                    className="border border-magenta/50 px-4 py-2 font-mono text-xs text-magenta transition-colors hover:bg-magenta/10"
                  >
                    清除口令
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    window.location.hash = '#/';
                  }}
                  className="border border-line px-4 py-2 font-mono text-xs text-muted transition-colors hover:border-cyan hover:text-cyan"
                >
                  退出登录
                </button>
              </div>

              <p className="mt-4 border-t border-line pt-4 font-mono text-[10px] leading-relaxed text-line">
                说明：本地阶段口令校验在浏览器完成，可防止随手改动，但技术上可绕过。
                部署到 Cloudflare 后将改由服务端校验，那时前端绕过也无法写入数据。
              </p>
            </section>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8">
            <section className="cyber-card p-5">
              <h2 className="section-label">个人资料</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TextField
                  id="profile-name"
                  label="姓名"
                  value={state.profile.name}
                  onChange={(v) => updateProfile({ name: v })}
                />
                <TextField
                  id="profile-title"
                  label="头衔"
                  value={state.profile.title}
                  onChange={(v) => updateProfile({ title: v })}
                />
                <TextField
                  id="profile-tagline"
                  label="标语"
                  value={state.profile.tagline}
                  onChange={(v) => updateProfile({ tagline: v })}
                />
                <div className="lg:col-span-2">
                  <TextAreaField
                    id="profile-intro"
                    label="简介"
                    rows={4}
                    value={state.profile.intro}
                    onChange={(v) => updateProfile({ intro: v })}
                  />
                </div>
              </div>
            </section>

            <section className="cyber-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-label mb-0">联系方式</h2>
                <button
                  type="button"
                  onClick={addContact}
                  className="px-3 py-1 text-xs text-cyan border border-cyan/40 hover:bg-cyan hover:text-void transition-all"
                >
                  + 新增行
                </button>
              </div>
              <div className="space-y-3">
                {state.profile.contacts.map((c, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
                  >
                    <TextField
                      id={`contact-label-${i}`}
                      label="标签"
                      value={c.label}
                      onChange={(v) => updateContact(i, { label: v })}
                    />
                    <TextField
                      id={`contact-value-${i}`}
                      label="值"
                      value={c.value}
                      onChange={(v) => updateContact(i, { value: v })}
                    />
                    <TextField
                      id={`contact-href-${i}`}
                      label="链接"
                      value={c.href}
                      onChange={(v) => updateContact(i, { href: v })}
                    />
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      className="px-3 py-2 text-xs text-magenta border border-magenta/40 hover:bg-magenta hover:text-void transition-all h-[38px]"
                    >
                      删除
                    </button>
                  </div>
                ))}
                {state.profile.contacts.length === 0 && (
                  <p className="text-muted text-sm">暂无联系方式</p>
                )}
              </div>
            </section>

            <section className="cyber-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-label mb-0">社交账号</h2>
                <button
                  type="button"
                  onClick={addSocial}
                  className="px-3 py-1 text-xs text-cyan border border-cyan/40 hover:bg-cyan hover:text-void transition-all"
                >
                  + 新增
                </button>
              </div>
              <p className="text-muted text-xs mb-3">
                提示：href 为空时该社交账号不会在前台显示
              </p>
              <div className="space-y-3">
                {state.socials.map((s, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                    <TextField
                      id={`social-name-${i}`}
                      label="名称"
                      value={s.name}
                      onChange={(v) => updateSocial(i, { name: v })}
                    />
                    <TextField
                      id={`social-handle-${i}`}
                      label="用户名"
                      value={s.handle}
                      onChange={(v) => updateSocial(i, { handle: v })}
                    />
                    <TextField
                      id={`social-href-${i}`}
                      label="链接（留空则隐藏）"
                      value={s.href}
                      onChange={(v) => updateSocial(i, { href: v })}
                    />
                    <TextField
                      id={`social-icon-${i}`}
                      label="图标 SVG path"
                      value={s.icon}
                      onChange={(v) => updateSocial(i, { icon: v })}
                    />
                    <button
                      type="button"
                      onClick={() => removeSocial(i)}
                      className="px-3 py-2 text-xs text-magenta border border-magenta/40 hover:bg-magenta hover:text-void transition-all h-[38px] sm:col-span-2"
                    >
                      删除
                    </button>
                  </div>
                ))}
                {state.socials.length === 0 && (
                  <p className="text-muted text-sm">暂无社交账号</p>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ===== 项目 ===== */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="section-label mb-0">项目管理</h2>
              <button
                type="button"
                onClick={addProject}
                className="px-3 py-1 text-xs text-cyan border border-cyan/40 hover:bg-cyan hover:text-void transition-all"
              >
                + 新增项目
              </button>
            </div>
            {state.projects.map((p) => (
              <section key={p.id} className="cyber-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-cyan text-sm tracking-wider">
                    {p.name || '（未命名项目）'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeProject(p.id)}
                    className="px-3 py-1 text-xs text-magenta border border-magenta/40 hover:bg-magenta hover:text-void transition-all"
                  >
                    删除项目
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <TextField
                    id={`project-name-${p.id}`}
                    label="名称"
                    value={p.name}
                    onChange={(v) => updateProject(p.id, { name: v })}
                  />
                  <TextField
                    id={`project-subtitle-${p.id}`}
                    label="副标题"
                    value={p.subtitle}
                    onChange={(v) => updateProject(p.id, { subtitle: v })}
                  />
                  <SelectField
                    id={`project-status-${p.id}`}
                    label="状态"
                    value={p.status}
                    onChange={(v) => updateProject(p.id, { status: v as Project['status'] })}
                    options={[
                      { value: '已上线', label: '已上线' },
                      { value: '开发中', label: '开发中' },
                    ]}
                  />
                  <SelectField
                    id={`project-accent-${p.id}`}
                    label="强调色"
                    value={p.accent}
                    onChange={(v) => updateProject(p.id, { accent: v as Project['accent'] })}
                    options={[
                      { value: 'cyan', label: '青色' },
                      { value: 'magenta', label: '品红' },
                      { value: 'lime', label: '黄绿' },
                    ]}
                  />
                  <div className="lg:col-span-2">
                    <TextField
                      id={`project-link-${p.id}`}
                      label="链接（可选）"
                      value={p.link ?? ''}
                      onChange={(v) => updateProject(p.id, { link: v })}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <TextAreaField
                      id={`project-desc-${p.id}`}
                      label="描述"
                      rows={4}
                      value={p.desc}
                      onChange={(v) => updateProject(p.id, { desc: v })}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <StringListEditor
                      id={`project-tags-${p.id}`}
                      label="标签"
                      items={p.tags}
                      onChange={(v) => updateProject(p.id, { tags: v })}
                      placeholder="输入标签后回车"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <StringListEditor
                      id={`project-highlights-${p.id}`}
                      label="亮点"
                      items={p.highlights}
                      onChange={(v) => updateProject(p.id, { highlights: v })}
                      placeholder="输入亮点后回车"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label
                      htmlFor={`project-cover-${p.id}`}
                      className="block text-xs font-mono tracking-wider text-slate-300 mb-1"
                    >
                      封面图片
                    </label>
                    <div className="flex items-center gap-3 flex-wrap">
                      {p.cover && (
                        <div className="relative shrink-0">
                          <img
                            src={p.cover}
                            alt="封面预览"
                            className="w-16 h-16 object-cover border border-cyan/40"
                          />
                          <button
                            type="button"
                            onClick={() => removeCover(p.id)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-magenta text-void flex items-center justify-center text-xs leading-none"
                            aria-label="移除封面"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      <input
                        id={`project-cover-${p.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleCoverUpload(p.id, e.target.files?.[0]);
                          e.target.value = '';
                        }}
                        className="text-xs text-slate-300 file:mr-3 file:px-3 file:py-1 file:border file:border-cyan/40 file:bg-cyan/5 file:text-cyan file:text-xs file:cursor-pointer"
                      />
                    </div>
                    {coverErrors[p.id] && (
                      <p className="text-magenta text-xs mt-1">{coverErrors[p.id]}</p>
                    )}
                    <p className="text-muted text-xs mt-1">
                      图片需小于 400KB（localStorage 限制约 5MB）
                    </p>
                  </div>
                </div>
              </section>
            ))}
            {state.projects.length === 0 && (
              <p className="text-muted text-sm text-center py-8">暂无项目，点击右上角新增</p>
            )}
          </div>
        )}

        {/* ===== 历程 ===== */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="section-label mb-0">时间线管理</h2>
              <button
                type="button"
                onClick={addTimeline}
                className="px-3 py-1 text-xs text-cyan border border-cyan/40 hover:bg-cyan hover:text-void transition-all"
              >
                + 新增节点
              </button>
            </div>
            {state.timeline.map((t) => (
              <section key={t.id} className="cyber-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-cyan text-sm tracking-wider">
                    {t.title || '（未命名节点）'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeTimeline(t.id)}
                    className="px-3 py-1 text-xs text-magenta border border-magenta/40 hover:bg-magenta hover:text-void transition-all"
                  >
                    删除节点
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <TextField
                    id={`timeline-period-${t.id}`}
                    label="时间段"
                    value={t.period}
                    onChange={(v) => updateTimeline(t.id, { period: v })}
                  />
                  <TextField
                    id={`timeline-title-${t.id}`}
                    label="标题"
                    value={t.title}
                    onChange={(v) => updateTimeline(t.id, { title: v })}
                  />
                  <div className="lg:col-span-2">
                    <TextAreaField
                      id={`timeline-desc-${t.id}`}
                      label="描述"
                      rows={3}
                      value={t.desc}
                      onChange={(v) => updateTimeline(t.id, { desc: v })}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <StringListEditor
                      id={`timeline-tags-${t.id}`}
                      label="标签"
                      items={t.tags}
                      onChange={(v) => updateTimeline(t.id, { tags: v })}
                      placeholder="输入标签后回车"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="inline-flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!t.current}
                        onChange={(e) => handleCurrentChange(t.id, e.target.checked)}
                        className="w-4 h-4 accent-cyan"
                      />
                      当前进行中（仅可有一项勾选）
                    </label>
                  </div>
                </div>
              </section>
            ))}
            {state.timeline.length === 0 && (
              <p className="text-muted text-sm text-center py-8">暂无节点，点击右上角新增</p>
            )}
          </div>
        )}

        {/* ===== 技能 ===== */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="section-label mb-0">技能管理</h2>
              <button
                type="button"
                onClick={addSkill}
                className="px-3 py-1 text-xs text-cyan border border-cyan/40 hover:bg-cyan hover:text-void transition-all"
              >
                + 新增分组
              </button>
            </div>
            {state.skills.map((s) => (
              <section key={s.id} className="cyber-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-cyan text-sm tracking-wider">
                    {s.group || '（未命名分组）'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeSkill(s.id)}
                    className="px-3 py-1 text-xs text-magenta border border-magenta/40 hover:bg-magenta hover:text-void transition-all"
                  >
                    删除分组
                  </button>
                </div>
                <div className="space-y-4">
                  <TextField
                    id={`skill-group-${s.id}`}
                    label="分组名称"
                    value={s.group}
                    onChange={(v) => updateSkill(s.id, { group: v })}
                  />
                  <StringListEditor
                    id={`skill-items-${s.id}`}
                    label="技能项"
                    items={s.items}
                    onChange={(v) => updateSkill(s.id, { items: v })}
                    placeholder="输入技能后回车"
                  />
                </div>
              </section>
            ))}
            {state.skills.length === 0 && (
              <p className="text-muted text-sm text-center py-8">暂无分组，点击右上角新增</p>
            )}
          </div>
        )}

        {/* ===== 数据 ===== */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            {/* 访问统计面板 */}
            <StatsPanel />

            <section className="cyber-card p-5">
              <label htmlFor="export-text" className="section-label block">
                导出数据
              </label>
              <p className="text-muted text-xs mb-2">复制以下 JSON 内容以备份当前数据</p>
              <textarea
                id="export-text"
                readOnly
                rows={10}
                value={exportSite(state)}
                className="w-full bg-void/60 border border-line px-3 py-2 text-slate-100 text-xs font-mono focus:border-cyan focus:outline-none focus:shadow-neon transition-all resize-y"
              />
            </section>

            <section className="cyber-card p-5">
              <label htmlFor="import-text" className="section-label block">
                导入数据
              </label>
              <p className="text-muted text-xs mb-2">粘贴 JSON 内容后点击导入</p>
              <textarea
                id="import-text"
                rows={6}
                value={importText}
                placeholder='{"version":1,"profile":{...}, ...}'
                onChange={(e) => setImportText(e.target.value)}
                className="w-full bg-void/60 border border-line px-3 py-2 text-slate-100 text-xs font-mono focus:border-cyan focus:outline-none focus:shadow-neon transition-all resize-y mb-3"
              />
              {importError && (
                <p className="text-magenta text-xs mb-3">{importError}</p>
              )}
              <button
                type="button"
                onClick={handleImport}
                className="px-4 py-2 text-xs text-cyan border border-cyan/40 hover:bg-cyan hover:text-void transition-all"
              >
                导入
              </button>
            </section>

            <section className="cyber-card p-5">
              <h2 className="section-label">恢复默认</h2>
              <p className="text-muted text-xs mb-3">
                清除所有自定义内容，恢复到默认数据。此操作不可撤销。
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs text-magenta border border-magenta/40 hover:bg-magenta hover:text-void transition-all"
              >
                恢复默认内容
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
