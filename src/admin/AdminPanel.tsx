import { useState, useRef, useEffect } from 'react';
import type { SiteData, Profile, Contact, Social, Project, TimelineItem, SkillGroup } from '../types';
import { loadSite, saveSite, resetSite, exportSite, importSite, newId } from '../store';

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

type TabKey = 'profile' | 'projects' | 'timeline' | 'skills' | 'data';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'profile', label: '基本资料' },
  { key: 'projects', label: '项目' },
  { key: 'timeline', label: '历程' },
  { key: 'skills', label: '技能' },
  { key: 'data', label: '数据' },
];

export default function AdminPanel() {
  const [state, setState] = useState<SiteData>(() => loadSite());
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [showSaved, setShowSaved] = useState(false);
  const [coverErrors, setCoverErrors] = useState<Record<string, string>>({});
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [saveError, setSaveError] = useState('');

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
