# Web 界面设计规范

> 本文件是 Web 端设计的唯一事实来源。所有 Web 产出须通过文末验收清单。

## 设计目标

为浏览器环境产出高保真、可访问、响应式的 Web 界面。核心矛盾是「视觉表达力」与「跨设备可用性」的平衡--Web 用户设备跨度从 320px 手机到 2560px 桌面，设计须在任意断点保持可用与美观。

避免泛 AI 审美：不用千篇一律的 Inter/Roboto 字体、紫色渐变白底、模板化卡片布局。每个设计都应有明确的视觉观点。

## 操作流程

### W1. 信息架构

- 列出页面核心信息层级：主标题 -> 次级内容 -> 辅助信息 -> 操作入口
- 确定主次：每屏只有一个主要 CTA，次要操作视觉上从属
- 画线框（可用文本描述）：先定结构与信息密度，后定视觉

### W2. 响应式骨架

按 mobile-first 顺序定义断点：

| 断点 | 宽度 | 布局策略 |
|------|------|---------|
| mobile | ≤ 640px | 单列、底部导航或汉堡菜单、核心内容优先 |
| tablet | 641-1024px | 双列、侧栏可展开、触控间距放大 |
| desktop | ≥ 1025px | 多列网格、固定侧栏、鼠标交互可发挥 |

- viewport meta: `width=device-width, initial-scale=1`，禁止禁用缩放
- 移动端禁止横向滚动
- 固定栏（导航/底栏）须为下方内容预留安全 padding
- **触控目标 ≥ 44×44px（含导航内小按钮）**：压缩高度是导航常态，但点击区域不得低于 44px（可用 padding 扩展命中区，不改视觉尺寸）；不要等到验收才发现

### W3. 色彩与主题

建立语义化色彩 Token，不裸用 hex：

```
primary / secondary / accent
surface / on-surface / background
error / success / warning
```

- 主色 + 锐利辅色 > 均匀分布的怯弱色板
- **色彩三步法**（详见 `specs/workflow/hi-fi-acceptance-checklist.md`）：采样（品牌资产/真实内容/VI 吸色）→ 收敛（用 `oklch()` 压到 2-3 个有彩色 + 1 组中性明度序列，有彩色之间色相角 H≥60° 或明度差 L≥0.3）→ 论证（写一句「为什么是这个色」，写不出 = 在抄配方）
- **不凭空发明色**：先吸已有品牌/真实资产/内容真图的色值，缺的 token 用 oklch 插值；无任何参考才选 known 配色系统（Radix / Tailwind 默认 / 某品牌色），不凭记忆自调
- **饱和度与面积比以 `design/output/direction.md` 为准**（规则见 SKILL.md「设计与审美双闸门」）。本文件不设全站 chroma 区间
- **主色 + 一个 accent 贯穿全场**：两者的面积和力度跟参考，不另定深浅
- 暗色模式：用降饱和的浅色变体，不是直接反色；**不得简单 invert**，需重调饱和度/对比度/accent；不想做就别做
- **禁紫色→粉色→蓝色全屏渐变、任意 rainbow/mesh gradient 铺满背景**（品牌自用除外）
- 功能色（错误红/成功绿）必须配图标或文字，不能仅靠颜色传达含义
- 前景/背景对比度：正文 ≥ 4.5:1（AA），大字 ≥ 3:1

### W4. 排版系统

- 正文字号移动端 ≥ 16px（避免 iOS 自动放大）
- 行高正文 1.5-1.75，标题 1.1-1.3
- 行宽：移动端 35-60 字符，桌面 60-75 字符；中文一行 22-38 字（最佳 28-32，`max-width: 36em`）、西文最佳 66（`max-width: 65ch`）
- 字体配对：一个有性格的展示字体 + 一个可读性强的正文字体；禁用 Inter/Roboto/Arial 作为唯一字体。字族从 `direction.md` 的参考里取，本文件不指定平替名单
- **配对须有对比来源**（形式/同族咬合/时代对比）：衬线 display + 无衬线 body、Mono display + sans body、Heavy + light
- **中文字体**：正文只宋/黑/楷，一页最多 2 个中文字体家族；中文禁用 italic（无斜体传统，faux italic 变形丑），用字重/楷体/荧光笔底色/着重号强调，`font-synthesis: none` 禁合成；标点用直角引号「」，`line-break: strict` 避头尾；fallback 链「西文在前、中文在中、系统中文兜底、泛型收尾」
- **字距**：中文正文 0-0.05em、标题 0、display 巨字 -0.02em~0，绝不套西文负字距
- 字重层级：标题 600-700、正文 400、标签 500
- 数据列/价格/计时器用 `font-variant-numeric: tabular-nums`，防止布局跳动
- 展示字体用 `clamp()` 流式写法（`h1 { font-size: clamp(2rem, 1.2rem + 3.5vw, 4.5rem) }`），正文窄区间（16→18）即可

### W5. 布局与空间

- 8dp 间距栅格：4 / 8 / 16 / 24 / 32 / 48 / 64
- z-index 分层：0 / 10 / 20 / 40 / 100 / 1000
- 桌面 max-width 一致（如 max-w-6xl / 7xl）
- 用大小、间距、对比建立层级，不只用颜色
- 构图（主体位置与留白）按 `direction.md` 里从参考抽出的那一项
- **留白是构图不是缺席**：留白必须服务于明确的视觉锚点/黄金位置，不是「页面渲染坏了」；空白用构图解决，不靠内容填满
- **反填充**：每个元素必须 earn its place，无真数据就留诚实 placeholder；**面向用户的未定数据用可见灰字标注「数据待补：xx」**（如折扣细则、统计数），不可藏在注释里假装已完成
- **禁圆角卡片 + 左 border accent 色组合**（`border-radius:12px + border-left:4px solid #色`），强调用背景对比/字重字号对比/plain 分割线/干脆不分卡片
- **禁装饰性 emoji 作图标**（🚀⚡✨🎯、feature 列表 ✅、CTA emoji 箭头），用图标系统（`specs/icon-system`）或 placeholder
- **禁 SVG 手画人物/设备/场景代替真实产品图**：品牌识别度归零；缺图放 placeholder 等用户给，不自己造
- **签名**：全页只留一处，规则见 SKILL.md 双闸门（能指认来自本产品的哪一个名词，指认不出就删）
- 线宽克制：hairline 0.5-1px，一处背景色 + 一个 accent 贯穿全场
- **text-wrap: balance（标题 ≤4 行）+ pretty（正文）**；CSS Grid（含 named areas / subgrid）优先

### W6. 动效

动效原则、时长 Token、缓动 Token、编排规则见 `specs/motion/motion-design.md`，不在此重复。Web 端平台差异补充：

- reduced-motion：用 CSS `@media (prefers-reduced-motion: reduce)` 降级为淡入淡出
- 物理曲线：CSS `transition` + `cubic-bezier`（Web 无原生弹簧，用 `cubic-bezier` 模拟）
- 页面转场：View Transition API（渐进增强）或库方案
- 手势反馈：`pointer events` + `touch-action: manipulation`

### W7. 无障碍

- 焦点环可见（2-4px），禁移除
- 标题层级 h1->h6 连续，不跳级
- 图标按钮须有 aria-label
- 表单 label 与 input 关联（for 属性）
- 颜色不作为唯一信息载体
- 支持键盘完整导航，Tab 顺序与视觉顺序一致

### W8. 性能

- 图片用 WebP/AVIF + srcset/sizes，懒加载非首屏
- 声明 width/height 或 aspect-ratio 防止 CLS（目标 < 0.1）
- 字体 `font-display: swap`，仅 preload 关键字体
- 首屏 CSS 内联或尽早加载
- 路由级代码分割
- 列表 50+ 项虚拟化

## 验收标准

产出 Web 界面后逐项核对：

- [ ] 三断点（375 / 768 / 1440）布局不破、无横向滚动
- [ ] 正文对比度 ≥ 4.5:1，大字 ≥ 3:1
- [ ] 所有交互元素有可见焦点环
- [ ] 触控目标 ≥ 44×44px（含导航内小按钮；用扩展命中区满足时须注明）
- [ ] 暗色模式对比度独立验证通过；**不提供暗色模式时须显式声明仅亮色——首选载体：HTML `<meta name="color-scheme" content="light">`，无 HTML 产物时用页面注释或交付说明，隐式缺失 = 不通过**
- [ ] 语义色彩 Token 已定义，无裸 hex；色彩非凭空发明（来源可论证，oklch 收敛到 2-3 有彩）
- [ ] 无紫→粉→蓝全屏渐变 / rainbow / mesh gradient 铺满背景
- [ ] 字体非泛用族（非 Inter/Roboto/Arial 单一方案）；展示字体与正文字体能指认到 `direction.md` 里的参考
- [ ] 中文正文用直角引号「」、无 faux italic、fallback 链西文在前
- [ ] 数据列用 tabular-nums
- [ ] 无圆角卡片+左 border accent 滥堆、无装饰 emoji 当图标、无 SVG 手画伪产品图
- [ ] 每屏只有一个主 CTA；每个元素 earn its place（无反填充）
- [ ] 信息密度分型正确：默认克制型；AI/数据/上下文感知类产品走高密度型（每屏 ≥3 处有内容的差异化信息），克制未做过头（无大片死白+微缩字号）
- [ ] 单文件交付的图片/logo 已 base64 内嵌；Playwright 验证无裂图（`<img>` naturalWidth>0 / 无资源 404），不只查 pageerror
- [ ] 动效尊重 reduced-motion
- [ ] 设计稿/原型为 JS + mock 数据演示，无真实后端/API/持久化/鉴权调用
- [ ] **错误/成功双态共用同一提示区时，JS 切换前重置前一态样式残留**（class/color 归零再赋新态）：错误文案不得残留成功色
- [ ] **声明的非系统字体必须有真实加载机制**（@font-face 内嵌 / link 引入），否则回退链须显式落到系统字体；「声明了加载不了的 webfont」= 字体配对不成立，按实际渲染字体判定
- [ ] **原型中不可用入口（`href="#"` 死链）须可见标注「演示原型/mock」或删除**；静默死链 = 不通过（与裂图同理，点击无反应不抛 pageerror）
- [ ] **标题层级不跳级用 Playwright 断言**（H1→H2→H3 连续），不肉眼自申报
- [ ] 图片声明尺寸防 CLS

## 边界与不做项

- 不负责后端 API 设计与数据库结构
- **设计稿/原型不实现真实业务功能**：可交互 HTML 原型的数据一律用 JS + 内存 mock 模拟（列表/表单校验/状态切换/图表），不接真实后端/API/持久化/登录鉴权；网络请求一律 mock，无后端时不留半截真实调用。mock 只为演示交互表现，不豁免本 spec 验收清单
- 不负责与界面无关的性能优化（如服务端缓存策略）
- 不负责纯基础设施或 DevOps 工作
- 移动端原生交互（手势、触觉反馈）见 `specs/mobile`，Web 端只覆盖浏览器环境
