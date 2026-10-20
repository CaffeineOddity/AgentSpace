# 设计系统规范

> 本文件是设计系统（Design System）构建的唯一事实来源。设计系统是品牌到实现的翻译层--品牌 spec 定「用什么色/字」，本 spec 定「色和字怎么变成可复用的 Token 与组件」。

## 设计目标

将品牌视觉基线（`specs/brand`）翻译为可被 Web、移动端、封面等各端消费的结构化 Token 体系与组件库。核心是「一次定义，多端消费」--Token 是设计与代码的契约，组件是 Token 的具象组合，模式文档是组件的使用说明。

设计系统解决三个问题：**一致性**（同一 Token 全局复用）、**效率**（改 Token 全局生效）、**可维护**（组件单一事实来源，不散落各处）。

## 架构分层

```
品牌基线（specs/brand）          ← 视觉身份定义
    ↓ 翻译
设计系统（本 spec）               ← Token + 组件 + 模式
    ├── Token 层                 ← 原子级变量（color/font/space/radius/shadow/motion）
    ├── 组件层                   ← Token 组合为可复用 UI 单元
    └── 模式层                   ← 组件组合为页面级模式
    ↓ 消费
各端实现（specs/web / specs/mobile / specs/cover）  ← 按 Token 构建各端界面
```

项目级覆盖见 `specs/spec-customization`，不在此处重复。

## 操作流程

### D1. Token 层

将品牌基线翻译为原子级 Token。Token 是设计系统最小不可分单元，每个 Token 有语义名、值、用途。

#### 色彩 Token

三层命名：基线 -> 语义 -> 组件。

```
基线层    primary-500: #FF6B35        ← 品牌色原始值
          gray-900: #1A1A2E
          ↓
语义层    color-primary: {primary-500}  ← 角色引用基线
          color-on-primary: #FFFFFF
          color-surface: #FFFFFF
          color-on-surface: {gray-900}
          color-error: #DC2626
          ↓
组件层    button-bg: {color-primary}   ← 组件引用语义
          button-text: {color-on-primary}
```

- 基线层是色板（含色阶 50-900），从 `specs/brand` 的色彩体系直接映射
- 语义层定义角色（primary/surface/error），暗色模式映射到不同基线值
- 组件层引用语义层，禁止直接引用基线层
- 每色须有明/暗双色映射
- **色彩非凭空发明**：基线色板先从品牌资产/真实素材/用户 VI 采样（详见 `specs/workflow/hi-fi-acceptance-checklist.md`），缺的色阶用 `oklch()` 插值；无参考才选 known 配色系统，不凭记忆自调
- **饱和度跟 `design/output/direction.md` 走**（规则见 SKILL.md 双闸门）。本文件把参考里的大面积色与点睛色写成 Token，不设全站 chroma 区间。禁紫→粉→蓝满版渐变

#### 字体 Token

```
font-family-display: "<direction.md 的展示字体>"
font-family-body: "<direction.md 的正文字体>"
font-family-label: "<direction.md 的标签字体>"

font-size-sm: 12px / 14px / 16px / 18px / 24px / 32px / 48px
font-weight-regular: 400
font-weight-medium: 500
font-weight-bold: 700

line-height-tight: 1.2
line-height-normal: 1.5
line-height-relaxed: 1.75
```

- 字族从 `specs/brand` 的字体层级映射
- 字号阶梯用语义名（sm/md/lg/xl/2xl），不用数字
- 行高按用途命名（tight/normal/relaxed），不按数值
- **字体配对须有对比来源**（衬线 display + 无衬线 body、Mono display + sans、Heavy + light，都是可选对比，不是菜单）。字族跟 `direction.md` 的参考走；禁 Inter/Roboto/Arial 作为唯一字体
- **中文字体**：正文只宋/黑/楷，一页最多 2 个中文字体家族；禁 faux italic（`font-synthesis: none`）；fallback 链「西文在前、中文在中、系统中文兜底」；直角引号「」、`line-break: strict`

#### 间距 Token

```
space-1: 4px    space-2: 8px    space-3: 12px
space-4: 16px   space-5: 24px   space-6: 32px
space-7: 48px   space-8: 64px
```

- 8dp 基线栅格（移动端可用 6dp，见 `specs/spec-customization` 的项目覆盖）
- 间距只有量级名，无语义名（间距语义由组件决定）

#### 圆角 / 阴影 / 动效 Token

```
radius-sm: 4px   radius-md: 8px   radius-lg: 16px   radius-full: 9999px

shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
shadow-md: 0 4px 8px rgba(0,0,0,0.08)
shadow-lg: 0 8px 24px rgba(0,0,0,0.12)

motion-duration-fast: 150ms
motion-duration-normal: 250ms
motion-duration-slow: 400ms
motion-easing-enter: cubic-bezier(0,0,0.2,1)
motion-easing-exit: cubic-bezier(0.4,0,1,1)
```

- 动效 Token 引用 `specs/motion` 的时长/缓动体系，不自定义
- 阴影分层级（sm/md/lg），组件按层级引用

### D2. Token 导出格式

Token 须可被各端消费。一份 Token 源，多端格式导出：

| 消费端 | 格式 | 用途 |
|--------|------|------|
| Web | CSS 自定义属性 / Tailwind config | `--color-primary: #FF6B35` |
| iOS | Swift 主题配置 | `Color.primary` |
| Android | XML 主题 / Compose 主题 | `<color name="primary">#FF6B35</color>` |
| 鸿蒙 | 主题资源文件 | 按鸿蒙规范 |
| 通用 | JSON（style.json） | 各端中间层 |
| 可视化预览 | 可审阅 HTML | Token 文档 HTML，实时渲染预览（见下） |

- Token 源文件为单一事实来源（如 `tokens.json`），各端格式由构建工具自动导出
- 禁止手动在各端重复维护 Token 值（DRY）
- 导出后各端只消费，不修改
- **Token 文档 HTML 与源同源**：文档 `:root` CSS 变量须逐值来自 Token 源（构建导出），不得手抄漂移；Token 引用（`{语义键}` / `{基线.阶}`）必须可解析，悬空引用 = Token 体系不成立
- **声明 webfont 的文档/产物须真实加载**（`@font-face` 内嵌或 link 引入 + 加载状态显式校验），否则回退链显式落系统字体；「声明了加载不了的 webfont」= 字体配对不成立，按实际渲染字体判定（与 `specs/web` 字体加载条款同源）
- **交互/提示原型不得摆拍**：错误/成功等双态提示须真实可切换（输入触发/修正消失），静态常驻的假提示 = 组件预览不成立
- **弹出式审阅层键盘可达**：打开后焦点入弹窗、Tab 圈闭、关闭归还触发元素、`aria-modal="true"`
- **页面级 SFX 须可关**：凡页面产物带声音，须有页面内静音控件（`specs/motion` 静音条款对文档原型同样适用）

**Token 文档 HTML**：Token 体系可视化为单页 HTML，供设计师与用户审阅：

- 色彩 Token 三层可视化（基线色板 -> 语义角色 -> 组件引用对比）
- 字体 Token 实际渲染预览（字族/字号/字重/行高，用该字体渲染文字）
- 间距 Token 可视化标尺（8dp 栅格 + 各档位对比）
- 圆角/阴影 Token 实际效果对比
- 动效 Token 引用 `specs/motion`
- 组件预览区（Button/Card/Modal 各变体各状态实时渲染）
- 导出区（下载 tokens.json / CSS 变量 / Swift 主题）
- 弹出式审阅（见 `specs/review`）：每区块有 [+] 按钮，点击弹窗写反馈 + 快捷标记，支持导出给 AI 修改

在 workflow 中，Token 文档 HTML 是 Phase 3 的产出之一（见 `specs/workflow` 的 Phase 3）。

### D3. 组件层

Token 组合为可复用 UI 组件。每个组件定义：

| 属性 | 说明 |
|------|------|
| 语义 | 这个组件是什么、解决什么问题 |
| Token 引用 | 引用哪些 Token（色彩/字体/间距/动效） |
| 变体 | 有哪些变体（如按钮 filled/outlined/text） |
| 尺寸 | sm/md/lg |
| 状态 | default/hover/focus/active/disabled |
| 属性 | 可传入的参数（如 icon、loading） |
| 交互 | 动效引用 `specs/motion` |
| 无障碍 | 见各端 spec 的无障碍章节 |

组件设计原则：

- 组件引用语义 Token，不硬编码值（如 `background: {color-primary}` 而非 `#FF6B35`）
- 变体用属性控制，不用复制组件
- 状态用 Token 层叠，不用重新定义
- 组件单一事实来源，各端各实现但接口一致

### D4. 组件清单

设计系统须维护组件清单，按成熟度分级：

| 层级 | 说明 | 示例 |
|------|------|------|
| 原子 | 不可再分的基础元素 | Button、Input、Icon、Text |
| 分子 | 原子组合的单元 | SearchBar（Input+Icon）、FormField（Label+Input+Error） |
| 有机体 | 分子组合的区块 | Header、Card、Modal |
| 模板 | 有机体组合的页面骨架 | DashboardLayout、AuthPage |

清单记录每个组件的：名称、层级、Token 依赖、变体数、成熟度（draft/stable/deprecated）。

### D5. 模式层

组件组合为页面级模式。模式不是组件，是组件的编排规则：

- 表单模式：Label 上方 + Input + Helper + Error
- 列表模式：卡片列表 + 分页/无限滚动 + 空状态
- 导航模式：顶栏 + 侧栏 + 面包屑
- 详情模式：头部信息 + 内容区 + 操作栏

模式文档用截图 + 组件组合说明，不复述组件本身（引用 D3/D4）。

### D6. 文档与维护

- 组件文档：每个组件一张文档，含示例、属性表、变体对比、Token 引用、使用禁忌
- Token 文档：Token 清单表，含名称、值、语义、消费端导出格式
- 变更日志：Token/组件变更记录（遵循 SDD，spec 先改再改实现）
- 成熟度标签：draft（实验）/ stable（可用）/ deprecated（废弃但保留）

## 验收标准

- [ ] Token 三层命名（基线 -> 语义 -> 组件）已定义
- [ ] 基线色板来源可指认（品牌资产采样 / oklch 插值 / known 配色系统，非凭记忆自调）
- [ ] 色与字能指认到 `direction.md` 的参考；本 spec 不设全站 chroma 区间或平替字表
- [ ] 字体配对有对比来源，非 Inter/Roboto/Arial 单一方案
- [ ] 组件层引用语义 Token，无裸值硬编码
- [ ] Token 源为单一文件，各端格式自动导出
- [ ] Token 文档 HTML 的 CSS 变量与 Token 源同源（无手抄漂移），Token 引用无悬空
- [ ] 声明 webfont 须真实加载或显式回退；文档/产物响应式无横向滚动；弹层焦点管理闭环（入/圈闭/归还）；SFX 有页面内静音控件；交互原型提示为真实双态非摆拍
- [ ] 暗色模式每色有明/暗双映射
- [ ] 组件清单含层级、Token 依赖、变体数、成熟度
- [ ] 每个组件有状态变体，**按语义取子集**：交互组件（Button/Input/Modal 等）default/hover/focus/active/disabled 全查；非交互原子（Icon/Text 等）查 default/disabled，hover/active 不适用标 N/A，禁硬凑假状态
- [ ] 动效 Token 引用 `specs/motion`，不自定义
- [ ] 模式层文档引用组件，不复述
- [ ] 变更遵循 SDD：先改 spec/Token 再改组件实现

## 边界与不做项

- 不定义品牌视觉身份（色彩/字体的源头选择见 `specs/brand`）
- 不定义各端平台规范（iOS HIG / Material / 鸿蒙见 `specs/mobile`）
- 不定义动效原则与时长体系（见 `specs/motion`）
- 项目级 Token 覆盖见 `specs/spec-customization`
- 各端代码实现（CSS/SwiftUI/Compose）由开发负责，本规范止于 Token 与组件设计
