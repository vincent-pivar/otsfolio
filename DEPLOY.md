# 部署到 Cloudflare Pages（详细）

本项目是纯静态前端 + Cloudflare Pages Functions，数据存于 **D1（SQLite）+ R2（图片）**。
以下是从零部署到上线的完整步骤。

---

## 0. 前置条件

- 一个 Cloudflare 账号（免费版够用）
- 域名已接入 Cloudflare（可选；用 `*.pages.dev` 默认域名也能跑）
- 本机装好 `node` + `npm`，并登录 wrangler：
  ```bash
  npx wrangler login        # 浏览器授权，写入 OAuth token
  npx wrangler whoami       # 确认账号
  ```

> 国内网络环境：wrangler / curl 直连 Cloudflare 常不通，需走代理。
> 本仓库开发机用 `HTTPS_PROXY=http://127.0.0.1:21081` 系统代理，下文命令均带该前缀；
> 你若网络正常，去掉代理前缀即可。

---

## 1. 创建 D1 数据库（存内容与统计）

```bash
npx wrangler d1 create portfolio-content
```

记下返回的 **database_id**（形如 `977b2f2b-xxxx`），后面填进 `wrangler.toml`。

建表：

```bash
npx wrangler d1 execute portfolio-content --remote --file=./schema.sql
```

`schema.sql` 内容（也可直接把下面 SQL 粘进 `--command`）：

```sql
CREATE TABLE IF NOT EXISTS site (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  action TEXT NOT NULL,          -- 'view' | 'read'
  duration INTEGER NOT NULL DEFAULT 0,
  country TEXT NOT NULL DEFAULT 'XX',
  ip_hash TEXT NOT NULL DEFAULT '',
  day TEXT NOT NULL,             -- YYYY-MM-DD
  ts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_analytics_day ON analytics(day);
CREATE INDEX IF NOT EXISTS idx_analytics_slug ON analytics(slug);
```

---

## 2. 创建 R2 存储桶（存封面图）

```bash
npx wrangler r2 bucket create portfolio-assets
```

如需公开读（封面图用公开 URL），在 Cloudflare 控制台给桶开 **R2 公开访问**，记下放问主机
（如 `https://<bucket>.r2.dev` 或自定义域 `https://assets.你的域名`）。
本仓库的封面上传走 `functions/api/content.ts` 的 R2 绑定，无需额外公开配置也能用。

---

## 3. 配置 wrangler.toml

```toml
name = "vincent-portfolio"
compatibility_date = "2024-09-23"

# 绑定 D1
[[d1_databases]]
binding = "portfolio_content"
database_name = "portfolio-content"
database_id = "填第1步的 database_id"

# 绑定 R2
[[r2_buckets]]
binding = "portfolio_assets"
bucket_name = "portfolio-assets"

# Pages Functions 不需要 pages_build_output_dir（wrangler pages deploy 会指定）
```

> 注意：本项目鉴权**不依赖** `wrangler secret`，而是函数直接从 D1 读取 `settings.adminPassHash`
> 比对。所以不需要 `wrangler secret put ADMIN_PASS_HASH`（也避开了某些 Windows 下 secret 注入崩溃的问题）。

---

## 4. 初始化内容（首次）

后端「设置」里设好访问口令后，D1 的 `site` 表会自动写入。
若要从本地默认内容灌入（含示例文章/项目），可调用：

```bash
# 取下当前 site（含 adminPassHash）
curl -s https://<你的pages>.pages.dev/api/content > site.json
# 修改 site.json 后 PUT 回去（需带 x-admin-hash 头 = 你设的口令哈希）
curl -X PUT https://<你的pages>.pages.dev/api/content \
  -H "content-type: application/json" \
  -H "x-admin-hash: <adminPassHash>" \
  --data-binary @site.json
```

更简单：部署后直接打开 `/#/admin`，在后台可视化编辑所有内容并点「保存」即可。

---

## 5. 构建并部署

```bash
npm install
npm run build

HTTPS_PROXY=http://127.0.0.1:21081 \
npx wrangler pages deploy dist --project-name=vincent-portfolio --branch=main
```

- `--project-name`：首次会创建 Pages 项目，之后复用
- 部署完成后 Cloudflare 给一个 `*.pages.dev` 地址

---

## 6. 绑定自定义域名（可选）

Cloudflare 控制台 → 你的 Pages 项目 → Custom domains → 添加 `www.你的域名`。
（本项目已用 `www.otscup.com`。）添加后 Cloudflare 自动签发证书、配置 CNAME。

---

## 7. 统计与评论（可选增强）

- **访问统计**：已内置。前端埋点在 `BlogPost.tsx` / `App.tsx`，聚合接口 `functions/api/track.ts`。
  后台「数据」tab 看图表。仅记录国家代码 + IP 哈希，不存明文 IP。
- **评论（Giscus）**：在后台「设置」填 `commentsRepo`（格式 `用户/仓库`），文章底部即显示评论区。
  需先在 GitHub 安装 Giscus App 并建公开仓库。
- **Cloudflare Web Analytics**：控制台 → 站点 → Analytics → Web Analytics → Enable，
  零代码看宏观 PV/UV/国家（文章级统计仍靠本项目 D1 方案）。

---

## 8. 本地开发

```bash
npm run dev        # http://127.0.0.1:5173
npm run build      # 产出 dist/
npm test           # Markdown 净化单测
```

本地开发时，内容走 `localStorage`；部署后前端优先读云端 D1，本地作缓存。

---

## 故障排查

| 现象 | 原因 / 解决 |
|---|---|
| wrangler 命令卡住 / 超时 | 国内直连不通，加 `HTTPS_PROXY=http://127.0.0.1:21081` |
| 部署后内容空白 | 首次需到 `/#/admin` 设口令并保存，D1 才有 `site` 数据 |
| 后台口令随便能进 | 检查 D1 `site` 表 `settings.adminPassHash` 是否已设（未设则放行首次设置） |
| Turnstile 加载失败 | 国内网络常加载不出 widget，本项目登录已不依赖它（纯 D1 哈希校验） |
| R2 图片 403 | 确认桶绑定名 `portfolio_assets` 与 `wrangler.toml` 一致，且函数用 `env.portfolio_assets` |
