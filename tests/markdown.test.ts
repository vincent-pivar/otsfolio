/** Markdown 解析器单测：安全性 + 语法覆盖 */
import { renderMarkdown, autoExcerpt, readingTime, slugify } from '../src/markdown';

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    pass++;
    console.log('PASS  ' + name);
  } else {
    fail++;
    console.log('FAIL  ' + name + (detail ? '  :: ' + detail : ''));
  }
}

/* ---------- 安全性（最关键） ---------- */

const xss1 = renderMarkdown('<script>alert(1)</script>');
check('XSS: script 标签被转义', !xss1.includes('<script>'), xss1.slice(0, 80));

const xss2 = renderMarkdown('<img src=x onerror="alert(1)">');
check('XSS: img onerror 被转义', !xss2.includes('onerror="'), xss2.slice(0, 80));

const xss3 = renderMarkdown('[点我](javascript:alert(1))');
check('XSS: javascript: 协议被拦截', !xss3.includes('javascript:'), xss3.slice(0, 100));

const xss4 = renderMarkdown('[点我](data:text/html,<script>alert(1)</script>)');
check('XSS: data: 协议被拦截', !xss4.toLowerCase().includes('data:text/html'), xss4.slice(0, 100));

const xss5 = renderMarkdown('普通 <b>加粗</b> 文本');
check('HTML 标签一律转义为文本', xss5.includes('&lt;b&gt;'), xss5.slice(0, 80));

/* ---------- 语法覆盖 ---------- */

check('H1 标题', renderMarkdown('# 标题').includes('<h1'), '');
check('H3 标题', renderMarkdown('### 小标题').includes('<h3'), '');
check('粗体', renderMarkdown('**重点**').includes('<strong'), '');
check('斜体', renderMarkdown('这是 *斜的* 字').includes('<em'), '');
check('行内代码', renderMarkdown('用 `npm run dev` 启动').includes('<code'), '');

const cb = renderMarkdown('```js\nconst a = 1;\n```');
check('代码块', cb.includes('<pre') && cb.includes('const a = 1;'), cb.slice(0, 120));

check('引用', renderMarkdown('> 引用内容').includes('<blockquote'), '');

const ul = renderMarkdown('- 甲\n- 乙\n- 丙');
check('无序列表（3 项）', (ul.match(/<li/g) || []).length === 3, ul.slice(0, 120));

const ol = renderMarkdown('1. 第一\n2. 第二');
check('有序列表', ol.includes('<ol') && (ol.match(/<li/g) || []).length === 2, ol.slice(0, 120));

check('分隔线', renderMarkdown('---').includes('<hr'), '');

const link = renderMarkdown('[站点](https://example.com)');
check('外链带 rel=noreferrer', link.includes('rel="noreferrer'), link.slice(0, 140));
check('外链新窗口打开', link.includes('target="_blank"'), '');

const imgInline = renderMarkdown('图：![风景](https://x.com/a.png) 结束');
check('行内图片渲染', imgInline.includes('<img') && imgInline.includes('src="https://x.com/a.png"'), imgInline.slice(0, 140));

const imgData = renderMarkdown('![x](data:image/png;base64,AAAA)');
check('data:image 图片被放行', imgData.includes('src="data:image/png;base64,AAAA"'), imgData.slice(0, 120));

const imgXss = renderMarkdown('![x](javascript:alert(1))');
check('图片 javascript: 协议被拦截', !imgXss.includes('javascript:'), imgXss.slice(0, 120));

const imgXss2 = renderMarkdown('![x](data:text/html,<script>1</script>)');
check('图片非 image 的 data: 被拦截', !imgXss2.toLowerCase().includes('data:text/html'), imgXss2.slice(0, 120));

const imgOnerror = renderMarkdown('![x](https://x.com/a.png "onerror=alert(1)")');
check('图片 alt 不含 onerror', !imgOnerror.includes('onerror='), imgOnerror.slice(0, 160));

/* ---------- 边界情况 ---------- */

check('空输入不报错', renderMarkdown('') === '', JSON.stringify(renderMarkdown('')));
check('纯空白输入', renderMarkdown('\n\n  \n') === '', '');

const unclosed = renderMarkdown('```\ncode without end');
check('未闭合代码块内容不丢失', unclosed.includes('code without end'), unclosed.slice(0, 120));

const mixed = renderMarkdown('# 标题\n\n段落一。\n\n- 项目\n\n> 引用\n\n```\ncode\n```');
check(
  '混排结构完整',
  mixed.includes('<h1') &&
    mixed.includes('<p') &&
    mixed.includes('<li') &&
    mixed.includes('<blockquote') &&
    mixed.includes('<pre'),
  '',
);

const para = renderMarkdown('第一行\n第二行');
check('连续行合并为同一段落', (para.match(/<p/g) || []).length === 1, para);

const codeInline = renderMarkdown('`**不该加粗**`');
check('行内代码内的标记不被解析', !codeInline.includes('<strong'), codeInline.slice(0, 120));

/* ---------- 辅助函数 ---------- */

check('autoExcerpt 去除标记', !autoExcerpt('# 标题\n**粗体**内容').includes('#'), autoExcerpt('# 标题\n**粗体**内容'));
check('autoExcerpt 截断加省略号', autoExcerpt('字'.repeat(200), 50).endsWith('…'), '');
check('readingTime 至少 1 分钟', readingTime('短') === 1, String(readingTime('短')));
check('readingTime 长文更长', readingTime('字'.repeat(4000)) > 5, String(readingTime('字'.repeat(4000))));
check('slugify 英文标题', slugify('Hello World Post') === 'hello-world-post', slugify('Hello World Post'));
check('slugify 中文回退', slugify('中文标题').startsWith('post-'), slugify('中文标题'));

console.log('\n===== Markdown 单测: ' + pass + '/' + (pass + fail) + ' 通过 =====');
if (fail > 0) process.exit(1);
