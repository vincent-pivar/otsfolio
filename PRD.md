# 个人作品集站点 — PRD（产品需求文档）

> 状态：已上线（Cloudflare Pages: vincent-portfolio-1b9.pages.dev）
> 负责人：Vincent（全栈）+ Hermes（AI 协作 / 博客维护）
> 最后更新：2026-08-14

## 1. 目标与背景

搭建一个**赛博朋克风格的个人作品集 + 技术博客**，用于展示全栈能力（移动原生 / Web 全栈 / AI 集成）并持续发布技术文章。

约束：
- 无自有服务器 → 部署到 Cloudflare Pages（纯静态 + Pages Functions）
- 隐私强：公开页不暴露电话 / QQ，仅留邮箱
- 设计 token 化，禁止硬编码颜色

## 2. 技术架构

| 层 | 选型 |
| --- | --- |
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 特效 | 矩阵雨背景、光标光斑、滚动进度（尊重 prefers-reduced-motion，装饰层 aria-hidden） |
| 部署 | Cloudflare Pages（免费额度） |
| 函数 | Pages Functions（内容 GET/PUT、登录校验、访问统计埋点） |
| 存储 | Cloudflare D1（SQLite，存站点内容 + 访问统计）+ R2（封面图） |
| 鉴权 | D1 存储口令 SHA-256 加盐哈希，云端写接口二次校验（不依赖 wrangler secret） |
| 统计 | D1 analytics 表（PV/UV/阅读时长/国家占比），后台 SVG 图表 |

## 3. 功能模块

### 3.1 前台
- Hero / About / Projects / Timeline / Skills / Contact 六段
- 矩阵雨特效（可 FX 开关关闭）
- 博客：列表（搜索 + 分类 + 加载更多 + 竖排单列）、详情（竖排正文 + 相关文章侧栏 + 创作日期）
- 博客正文支持轻量 Markdown（自写解析，34 单测覆盖 XSS 防护，支持封面图与正文插图）

### 3.2 后台（localStorage）
- 文章 CRUD（Markdown 编辑器 + 工具栏 + 实时预览 + 插入图片）
- 项目 / 时间线 / 技能 / 设置管理
- 登录闸门：SHA-256 口令哈希（本地阶段）；云端阶段切 Pages Functions + HttpOnly Cookie
- 登录加 Cloudflare Turnstile 真人验证（配置化）

### 3.3 评论（Giscus）
- 基于 GitHub Discussions，零自建后端
- 仓库配置化（settings.commentsRepo），未配置则不显示

### 3.4 自动化博客（Hermes 每日写手）
- 由 Hermes cronjob 每日 21:00 自动执行（job `3be74a4b5585`，deliver=telegram:PIVAR）
- 流程：GET 站点数据取 adminPassHash → 生成混合博客（项目观察 / 技术随想 / 生活杂感 / 对站长的毒舌吐槽，尺度开放）→ PUT 写回 D1 → hermes send 推 Telegram 提醒
- 文章 author=`hermes`，进前台「Hermes 协作」tab；slug 前缀 `auto-YYYYMMDD`
- 管理：`cronjob(action='list'|'pause'|'remove'|'run')`，job_id `3be74a4b5585`
- 触发依赖本机代理（直连 Cloudflare 不通，curl 带 `-x http://127.0.0.1:21081 -k`）

## 4. 设计系统

- 设计 token（tailwind.config.js）：void #07070f / surface / cyan #00f0ff / magenta #ff00a0 / lime / muted / line
- 卡片：iOS 风格（圆角 + 毛玻璃 + 柔阴影），无切角（避免边线缺口）
- 搜索框：iOS 圆角输入框

## 5. 已解决问题（本期）

| 问题 | 根因 | 解法 |
| --- | --- | --- |
| 特效看不到 | 系统「减少动态」直接关掉整层特效 | 改为始终运行 + 降速；加 FX 手动开关 |
| 矩阵雨太弱 | opacity 0.13 | 调至 0.35 |
| 卡片边线缺口 | clip-path 切角 | 改圆角 iOS 风 |
| 封面图不显示 | data-URI 双重编码（%2523） | 修正编码 + charset=utf-8 |
| 博客拥挤 | 2 列网格 | 竖排单列 + 分页 |
| 首页太乱 | 列具体文章 | 移除，仅导航入口 |
| XSS 风险 | 自定义 Markdown | 渲染层白名单 + 34 单测 |

## 6. 待办 / 后续

- [ ] Giscus 仓库接入（需公开 GitHub 仓库 + 安装 Giscus App）
- [ ] Turnstile 密钥注入（CF 控制台申请 + wrangler secret；当前登录已改 D1 哈希校验，不阻塞）
- [ ] 访问统计：真实多 IP 验证 UV 去重效果；考虑旧数据归档
- [ ] 博客作者隔离：后台「我的文章」空状态友好提示（当前 Vincent 视角文章少）

## 7. 成本

- 现金成本：0（Cloudflare 免费额度 + 自有账号）
- 时间成本：约 3 个工作日（大半在细节打磨）
- 详见博客《建这个作品集到底花了多少钱》

## 8. 验收标准

- [x] 首页 / 六段正常渲染
- [x] 矩阵雨可见 + FX 开关
- [x] 博客竖排 + 搜索 + 分类 + 相关文章
- [x] Markdown 插图 + XSS 防护单测通过
- [x] 部署上线且线上实测渲染正常
- [x] 总价博客 + 开站公告发布
- [x] 云端 D1+R2 迁移 + 自定义域名 www.otscup.com 上线
- [x] 后台口令鉴权修复（D1 哈希，错误口令被拒）
- [x] 访问统计面板（折线图 7/30 天 + 国家甜甜圈 + 真实人数）
- [x] 作品精选自定义勾选 + 文章一键分享
- [x] 作者严格隔离（侧栏/导航按 author 过滤）
- [x] 自动化博客 cronjob 每日 21:00 写文 + Telegram 提醒
- [x] 开源：GitHub vincent-pivar/otsfolio（MIT + DEPLOY.md + 截图）
