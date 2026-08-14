# 赛博朋克风个人作品集

React + TypeScript + Tailwind CSS 构建的个人作品集，含内容管理后台。

## 本地运行

```bash
npm install
npm run dev      # 开发（热更新）→ http://127.0.0.1:5173
npm run build    # 生产构建 → dist/
npm run preview  # 预览构建产物
```

## 页面路由

哈希路由，静态托管无需服务端 rewrite。

| 地址 | 说明 |
|---|---|
| `#/` | 作品集前台 |
| `#/admin` | 内容管理后台 |

前台页脚右下有一个不显眼的 `·`，点击即进后台。

## 目录结构

```
src/
├── types.ts            # 数据契约（SiteData 及各实体类型）
├── store.ts            # 数据访问层 ★ 切换云端只改这里
├── defaultSite.ts      # 初始内容（来源 content.ts）
├── content.ts          # 静态文案与导航配置
├── App.tsx             # 路由分发
├── components/         # 前台组件
│   ├── SiteView.tsx    # 前台整体
│   ├── Hero / About / Projects / Timeline / Skills / Contact
│   ├── MatrixRain.tsx  # 矩阵雨背景
│   ├── CursorGlow.tsx  # 鼠标跟随光效
│   └── ScrollProgress.tsx
├── admin/
│   └── AdminPanel.tsx  # 内容管理后台
└── hooks/
    ├── useSite.ts      # 前台读取内容，后台保存后自动刷新
    ├── useReveal.ts    # 滚动进场动画
    └── useHashRoute.ts
```

## 设计系统

**禁止硬编码颜色**，一律使用 `tailwind.config.js` 中定义的语义色：

| Token | 用途 |
|---|---|
| `void` / `surface` / `elevated` | 背景层级 |
| `cyan` | 主霓虹色 |
| `magenta` | 副霓虹色 |
| `lime` | 强调色 |
| `muted` | 次级文字 |
| `line` | 描边 |

中性文字用 `text-slate-100` / `text-slate-300`。

复用 `index.css` 中的组件类：`cyber-card`、`btn-neon`、`section-label`、`neon-text`、`glitch`。

## 无障碍与性能

- 所有动效响应 `prefers-reduced-motion`，用户关闭动画时自动降级
- 装饰性图层标注 `aria-hidden`
- 矩阵雨限帧约 18fps，DPR 上限 2
- 鼠标光效仅在 `pointer: fine` 设备启用
- 后台代码分包懒加载，不影响前台首屏

## 数据存储

当前为**本地阶段**：内容存于浏览器 `localStorage`，键 `cyber-portfolio-site-v1`。

- 换浏览器或清缓存会丢失，请用后台「数据」页的导出功能备份
- 封面图以 dataURL 存储，单张限制 400KB（localStorage 总量约 5MB）

## 迁移到 Cloudflare（云端阶段）

数据访问全部收敛在 `src/store.ts`，迁移只需改动该文件：

```ts
// 读取
export async function loadSite(): Promise<SiteData> {
  const r = await fetch('/api/content');
  return r.json();
}

// 保存
export async function saveSite(data: SiteData): Promise<void> {
  await fetch('/api/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
```

配套需要：

1. **D1 数据库**存 `SiteData` JSON
2. **R2 存储桶**存封面图，后台改为上传后保存返回的 URL（替代 dataURL，解除 400KB 限制）
3. **Pages Functions** 提供 `functions/api/content.ts`，处理 GET / PUT
4. **访问控制**：后台需鉴权，可用 Cloudflare Access，或在 Functions 中校验密码并签发 Cookie

## 部署

```bash
npm run build
# dist/ 目录上传至 Cloudflare Pages
# 构建命令 npm run build，输出目录 dist
```
