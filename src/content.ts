/** 站点内容集中管理：改文案只动这个文件 */

export const profile = {
  name: 'VINCENT',
  title: '全栈开发者',
  tagline: '移动端原生 · Web 全栈 · AI 应用集成',
  intro:
    '专注把复杂需求落成可用产品。从 Android 原生 Canvas 图形引擎，到 Cloudflare 边缘全栈应用，独立完成设计、开发与部署。',
  contacts: [
    { label: '邮箱', value: 'admin@atproxy.eu.org', href: 'mailto:admin@atproxy.eu.org' },
    { label: '电话', value: '19354080327', href: 'tel:19354080327' },
    { label: 'QQ', value: '470892084', href: null },
  ],
};

export type Project = {
  name: string;
  subtitle: string;
  desc: string;
  tags: string[];
  highlights: string[];
  link?: string;
  status: '已上线' | '开发中';
  accent: 'cyan' | 'magenta' | 'lime';
};

export const projects: Project[] = [
  {
    name: '乡墅通量尺宝',
    subtitle: 'Android 原生测量标注工具',
    desc:
      '面向自建房场景的现场量尺与标注 App。自研 Canvas 标注引擎与 Matrix 手势系统，替代早期 WebView 方案，解决了缩放精度与触摸响应不可靠的问题。',
    tags: ['Kotlin', 'Canvas 2D', 'MediaStore', '手势矩阵'],
    highlights: [
      '自研 Matrix 手势缩放/平移，标注坐标零漂移',
      '三 Tab 工作流：拍照 → 标注 → 项目管理',
      '真机验证的相机链路（MediaStore Uri 写入）',
    ],
    status: '开发中',
    accent: 'cyan',
  },
  {
    name: '答题挑战',
    subtitle: 'AI 出题的在线答题应用',
    desc:
      '深色金调的答题竞技应用，四视图流转，含排行榜与昵称系统。接入大模型自动生成题目，并设计了多模型 failover 保证出题不中断。',
    tags: ['Cloudflare Pages', 'AI 集成', 'Serverless', '多模型容灾'],
    highlights: [
      'AI 自动出题 + 多模型故障转移',
      '排行榜与昵称持久化',
      '部署于 Cloudflare 边缘网络，零服务器成本',
    ],
    link: 'https://question-17e.pages.dev',
    status: '已上线',
    accent: 'magenta',
  },
];

export const skills = [
  { group: '移动端', items: ['Kotlin', 'Android SDK', 'Canvas 图形', '手势交互'] },
  { group: '前端', items: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'] },
  { group: '边缘 / 后端', items: ['Cloudflare Pages', 'Pages Functions', 'D1 / KV', 'REST API'] },
  { group: 'AI 工程', items: ['大模型 API 集成', 'Prompt 设计', '多模型容灾', 'Agent 编排'] },
];

export const nav = [
  { id: 'hero', label: '首页' },
  { id: 'about', label: '关于' },
  { id: 'projects', label: '作品' },
  { id: 'skills', label: '技能' },
  { id: 'contact', label: '联系' },
];
