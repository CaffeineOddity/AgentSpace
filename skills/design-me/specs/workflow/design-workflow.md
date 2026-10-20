# 设计流程规范

> 本文件是从 PRD 到设计交付的完整流程主线。各领域 spec 定义单点规范，本 spec 定义流程顺序与阶段检查点。遵循渐进保真原则：低保真 -> 规范 -> 高保真，每个保真度有独立的审阅收敛。

## 设计目标

将 PRD 逐步转化为可交付的设计产物，通过渐进保真控制返工成本。核心矛盾是「推进速度」与「方向正确」的平衡--低保真阶段改方向成本低，高保真阶段改方向成本高，因此每一层保真度必须有审阅收敛检查点，未收敛不进入下一层。

## 流程总览

```
Phase 1 · 页面描述  PRD -> 每页一个 design/output/pages/<页面ID>.md（功能定位/进出/状态/布局结构）-> 确认 -> 收敛
Phase 2 · 低保真     页面描述 -> 低保真线框（弹出式审阅）-> 迭代 -> 收敛
Phase 3 · IP 与设计规范  页面描述 + 低保真 -> 读基线 + toapis 生成品牌素材 -> 品牌手册 HTML + Token 文档 HTML（弹出式审阅）-> 迭代 -> 收敛
Phase 4 · 高保真      Token + 品牌基线 + toapis 生成插画 -> UI 原型（弹出式审阅）-> 迭代 -> 收敛
Phase 5 · 交付        设计稿 -> 交付包 HTML + 真实资产文件（弹出式审阅）-> 迭代 -> 收敛
Phase 6 · 实现后走查   开发实现 -> 全流程页面走查（复用审阅机制，独立阶段）
```

**顺序依赖**：`design/output/pages/*.md`（页面描述）是低保真的输入；低保真是 Phase 3 品牌/IP 与 Phase 4 高保真的布局基线。页面描述缺失或未收敛，不进入低保真。

审阅机制是跨阶段复用工具，见 `specs/review/review-design.md`。Phase 1、2、3、4、5、6 都用它，但产出物不同。

Phase 3-5 须使用 `scripts/toapis.py` 生成真实图像素材（品牌图、IP 形象、插画、图标），并创建真实资产文件（SVG/PNG/tokens.json），存入 `design/output/assets/` 目录。不得用 emoji 或 CSS 占位符替代真实素材。**toapis 不可用/跳过时的合法降级**：如实标注「待生成」+ 先写好 `prompts/` 下的完整 prompt + 在产物内用矢量/母题占位并写明替换指引；禁止假装已生成、禁止无 prompt 留空。

## 产物目录

所有 Stage 产物统一落在 `design/output/` 根下，按类型细分，不散落别处：

```
design/output/
├── feedback/                    ← 审阅反馈（见 specs/review）
│   └── <phase>_<type>_feedback.md
├── assets/                      ← 真实资产生成物（图/SVG/Token/音源）
│   ├── brand/
│   ├── illustrations/
│   ├── icons/
│   ├── tokens.json
│   └── sfx/
├── prompts/                     ← toapis 生成前的 Prompt（见 specs/image-prompt）
│   └── <素材类型>/<素材名>_prompt.md
├── pages/                       ← 页面描述文档（Phase 1 主产物，每页一个 md，见「页面描述文档」）
│   └── <页面ID>.md
└── <phase>N_<名称>.html          ← 各 Phase 的可审阅产物（Phase 1 用 pages/，不产 HTML）
    （phase2_lofi.html / phase2_lofi_final.html / phase3_brand.html /
      phase3_token.html / phase4_hifi.html / phase5_delivery.html）
```

- `design/output/` 是唯一产物根：反馈、资产、Prompt、页面描述、各 Phase HTML 都在其下，不再另设同级 `feedback/`/`images/` 目录
- 各 Phase HTML 按 `phase<N>_<名称>.html` 命名，避免与 `assets/` 混淆
- 副本、中间稿不覆盖：定稿用 `_final` 后缀，其余轮次保留改名

## 页面描述文档（`design/output/pages/`）

每个页面（含子页面、弹窗、模态）一个 markdown 文档，存放于 `design/output/pages/<页面ID>.md`，描述该页的**功能定位与布局结构**。页面描述文档是 Phase 1 的主产物（逐页落地细节），也是 Phase 2 低保真 / Phase 4 高保真的布局对齐基线；后续低保真/高保真迭代中持续回写更新（见各 Phase 的「对照/回写页面描述单元」）。

### 文件命名

- 以页面稳定 ID 命名（`<页面ID>.md`），与全局页面 ID 一致
- 弹窗/模态作为独立页面单独一个 md（若其是核心交互则单列）
- 页面名变更时同步改文件内容但不改 ID（ID 跨轮次稳定）

### 模板

每页 `design/output/pages/<页面ID>.md` 按以下结构组织：

```markdown
# <页面名称>

## 功能定位
该页的职责、用户在这页能做什么、属于哪个流程分组。

## 进入与去向
- 入口：从哪些页面/操作进入
- 出口：用户操作后跳转到哪些页面/状态

## 状态
默认 / 加载 / 空数据 / 错误 / 成功 / 无权限 / 首次使用（按实际列出，写明各状态的触发与表现）。

## 布局结构
自顶向下描述页面骨架与区块，列出每个区块的控件与层次（**用界面语义命名，禁用组件库路径/组件体系名/Token**）：
1. 顶部区：标题 / 导航 / 搜索
2. 内容区：主内容 / 列表 / 表单 / 空态
3. 操作区：按钮组 / 提交 / 次级操作

（低保真/高保真阶段补充：对齐模式、栅格、控件尺寸引用）

## 交互与反馈
- 关键操作的动效 / 声音反馈（引用 specs/motion 的交互声音清单）
- 异常与恢复路径
```

- 布局结构用「区块 → 控件」的树状列表，标注**控件用途**（按钮/输入框/勾选框/标签/进度/弹窗）、对齐模式、间距（8px 栅格）；不写组件库路径、组件体系名、Token、实现流程词
- 所有页面都要有该文档，与页面清单一一对应；遗漏任一页面视为页面描述不完备
- 文档是活文档：随低保真/高保真细化持续更新，最终与交付一致

### 生成时机

- Phase 1 从 PRD 提取页面清单后，为每个页面写 `design/output/pages/<页面ID>.md`（功能定位、进出、状态、布局结构、交互反馈）
- Phase 2 低保真迭代中回写细化「布局结构」
- Phase 4 高保真迭代中同步更新「布局结构」与「交互反馈」
- 交付（Phase 5）前，`design/output/pages/` 须覆盖全部页面且与其产物一致

## Phase 1 · 页面描述

### 目标

从 PRD 提取完整的页面清单与功能映射，并为每个页面产出 `design/output/pages/<页面ID>.md` 页面描述文档（功能定位/进出/状态/布局结构）。页面描述是低保真的直接输入，不画任何界面。

### 产出要求

- 每个页面（含子页面、弹窗、模态）一个 `design/output/pages/<页面ID>.md`（见「页面描述文档」）
- 页面描述含：功能定位、进入与去向、状态、布局结构、交互与反馈
- 每页的每个状态单独列出（默认/加载/空数据/错误/成功/无权限/首次使用）
- PRD 未说明清楚的地方标「待确认」，不自行补全
- **审阅（复用 `specs/review`）：页面描述文档纳入弹窗审阅（[+] 按钮写反馈 + 快捷标记），反馈导出 `design/output/feedback/`

### 步骤

**1.1 读 PRD -> 页面清单**

- 列出 PRD 涉及的所有页面（含子页面、弹窗、模态）
- 标注每个页面的流程位置（第几步、从哪来、到哪去）
- 按「真实用户使用产品的先后顺序」分组，每组一个小标题

**1.2 写页面描述文档（`design/output/pages/`）**

为每个页面创建 `design/output/pages/<页面ID>.md`（模板见「页面描述文档」），一次性写全骨架：
- 功能定位、进入与去向、状态清单
- 自顶向下的布局结构（区块 + 控件）
- 关键交互与反馈

PRD 未说明清楚的地方标「待确认」，不自行补全。

### 审阅迭代

- 用户对各页 `design/output/pages/<页面ID>.md` 审阅，检查页面清单是否覆盖 PRD 全部功能、状态是否完整、布局结构是否合理
- 在输入框写补充或修改点，用快捷标记标「可以/待改/阻塞」
- 导出 Markdown 或 JSON，交给 AI 按反馈修改页面描述文档

### 收敛条件

- 页面清单覆盖 PRD 全部功能点
- 每页的状态清单完整（含异常状态）
- 流程分组经用户确认
- 每页已有 `design/output/pages/<页面ID>.md`（功能定位/进入去向/状态/布局结构/交互反馈齐全）
- 审阅反馈全部清空或标记为「可以」；**无真人审阅的回归/自动化场景等效自检**：逐项对照本 spec 收敛条件 + 验收清单自检并在产物旁落 SELF-CHECK.md，脚本可校验项（pageerror/结构计数/命名）用脚本跑，等效替代弹窗审阅

**未收敛不进入 Phase 2。** 页面描述是低保真的输入，漏了页面或状态，Phase 2 全部返工。

## Phase 2 · 低保真

### 目标

产出低保真线框图，验证信息架构与流程，不涉及视觉。只表达信息层级、核心文案、按钮位置和页面状态。布局与结构的输入来自 Phase 1 的 `design/output/pages/*.md`；低保真收敛后回写页面描述文档的「布局结构」，二者保持同步。

### 产出要求

低保真用**连续页面画布**，不用「每状态一格」的分屏堆叠（否则同一页面被复制成多个割裂方块）：

- 单页 HTML 文件，打开即完整查看
- 黑白灰、基础框线、图片占位块，不做正式 UI
- **每页一个连续画布**：页面本体按真实布局**从上到下连续渲染一次**，不把每个状态做成并列的独立块
- 一个页面的多个状态（默认/加载/空/错误/成功/无权限/首次使用）**共享同一页面骨架**，作为骨架内的「状态片段」展示（见「连续页面模型」），而非整页复制 N 份
- 按 Phase 1 的流程分组排列，同组页面相邻；页面之间用细分隔线 + 页面标题分隔，不用大留白切块
- **对照页面描述文档**：每个页面的布局结构（区块/控件/对齐）与 `design/output/pages/<页面ID>.md` 一致，并据此细化页面描述文档
- **只用产品语义，禁用实现/组件词**：线框里的标注一律用用户在界面上能看到的说法（按钮、输入框、勾选框、标签、进度、弹窗）。**禁止出现**组件库路径、组件体系名、设计系统实现层或实现流程词：如 `ui/card`、`src/components/`、`CardHeader`、`CardTitle`、`CardAction`、`button`/`checkbox`/`badge`/`progress`/`tabs` 作为命名组件、`语义 Token`、`dark mode（作为产物特性）`、`复用 xxx`、`基建对齐版`、`还原 TSX`、`组件映射` 等。Title 副标题只写产品/版本，不写实现清单
- **禁区块级标注条**：不为每个区块额外贴一排「控件用途 / 排列方式」的小标签牌（如「平台勾选框」「自适应网格排列」「双列编辑区」）。区块内容由线框本体表达即可，不逐块加解说
- **禁设计说明脚注**：页面底部不写自述性说明大段（如「本图为低保真，只表布局与产品语义，不表最终视觉」「组件映射」「还原 TSX 时…」「保存到 …feedback.md」）。审阅入口（[+] 按钮）自解释即可，不用文字铺陈
- 不擅自增加 PRD 没有的功能；PRD 未说明处标「待确认」
- **控件布局对齐**：表单 label 与 input 对齐、同组控件左对齐、间距均匀；线框中的模态框/弹窗居中显示（详见下方「布局对齐规范」）
- **弹出式审阅（见 `specs/review/review-design.md`）：每个页面/状态片段标题行有 [+] 按钮，点击弹窗写反馈 + 快捷标记

### 连续页面模型（低保真视图）

一个页面 = 一个连续可滚动画布，拒绝「每个状态独立成块」。具体规则：

1. **画一次页面骨架**：顶部栏、导航、主内容容器、底部操作区等整页框架只渲染一次
2. **状态作为片段**：每个状态（默认/加载/空数据/错误/…）在骨架内用一个片段表示，片段 = 状态标签条（左侧短竖条 + 状态名）+ 该状态下的**差异区块**。只画区别于默认态的部分，不重复整页
3. **默认态打底**：把「默认态」作为页面主体渲染完整；其他状态用片段给出关键差异（如空态替换列表区、错误替换内容区），审阅时能对照出差异即可，不必把每个状态画满
4. **连续分隔**：状态片段之间用 1px 虚线 + 状态标签分隔，不设大留白、不加框线外框
5. 弹窗/模态作为**浮层片段**展示在触发它的页面右侧，而非单独成整页块

### 布局对齐规范

低保真不涉及视觉（色彩/字体/圆角），但**布局对齐是信息架构的骨架**，必须规范。控件歪斜、间距不匀、弹窗偏移会让审阅者误判信息层级，是低保真最常见的返工来源。

#### 间距栅格

- 全局使用 8px 基线栅格（`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`），低保真也遵循，不随意堆间距
- 页面内边距 `16px`（移动端）/ `24px`（Web），区块间距 `24px`，同区块内控件间距 `12px` 或 `16px`
- 间距用 CSS 变量统一定义，不逐处硬编码

#### 表单控件对齐

| 模式 | 规则 | 适用场景 |
|------|------|---------|
| 顶对齐 | Label 在 Input 正上方，左对齐；多字段纵向排列时所有 Input 宽度一致、左边界对齐 | 移动端、窄屏、字段数 ≤ 5 |
| 左对齐 | Label 在 Input 左侧，同表单内所有 Label 宽度统一（取最长 Label 宽度），Label 右对齐 + Input 左对齐 | Web、宽屏、字段数 > 5 |
| 行内对齐 | Label 与 Input 同一行，不推荐用于多字段表单 | 搜索栏、筛选条 |

- 同一表单内**不混用**对齐模式（要么全顶对齐、要么全左对齐）
- Input 框高度统一（`40px` 移动端 / `36px` Web），宽度按容器自适应
- 多个 Input 纵向排列时，间距统一（`12px` 或 `16px`，不混用）
- Checkbox/Radio 组：选项纵向排列时左边界对齐，横向排列时间距统一

#### 按钮组对齐

- 主按钮 + 次按钮同一行时：水平居中或右对齐，二者垂直中线对齐，间距 `12px`
- 底部固定操作栏：按钮组在安全区内，左右撑满（移动端）或右对齐（Web）
- 单一主按钮：居中或撑满容器宽度

#### 标注对齐

标注并入连续画布，**不设每屏的左侧便签列**（那会让每个状态/屏都变成「便签 + 线框」两栏块，是割裂的主因）。标注改为**轻量行内标签**，只标注整页与状态差异，**不逐区块加解说条、不写设计说明脚注**：

| 位置 | 规则 | 适用 |
|------|------|------|
| 页面标题行 | 页面名 + 页面 ID + 流程位置，横向一行，左侧 3px 竖条标识 | 每个页面的统一标注 |
| 状态标签条 | 状态名在 `.wf-state-tag` 内，位于差异区块左上 | 每个状态片段 |
| 待确认 | 浮现在对应区块右上角，标注「待确认」，不加两栏 | 局部待定项 |

- 页面标题行、状态标签直接贴在线框本体上方/内，与线框**左边界对齐**
- 不在每一屏/每一状态外面再套「左便签 + 右线框」的 flex 两栏容器
- 需要补充的备注（用户操作、操作去向）收敛到**页面标题行**同一行内，用「 › 」分隔，不散成每块一列
- **不贴区块级小标签条**（`.map-note` / 每块一排「控件用途 / 排列方式」解说），区块内容由线框本体表达；**不在页面底部写自述性说明大段**（`class="hint"` 类的「本图为低保真…」「组件映射」「保存到 …feedback.md」），审阅入口 + 标注仅指代整页状态差异

#### 模态框 / 弹窗对齐（线框内容）

低保真线框中若出现弹窗/模态框（如确认删除、权限申请），须：

- 在画布中**水平垂直居中**显示，不贴边、不偏移
- 有半透明遮罩层覆盖底层内容（黑白灰用 `rgba(0,0,0,0.3)`）
- 弹窗内控件遵循上述表单/按钮对齐规则
- 弹窗宽度不超过容器 80%，最小宽度 `320px`

#### 参考布局 CSS 骨架

生成低保真 HTML 时，以下 CSS 骨架**必须内联**，保证「连续页面 + 状态片段 + 弹窗居中」。可按实际页面调整数值，但**对齐模式、片段分隔与居中规则不可省略**：

```css
:root {
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px;
  --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;
}

/* 页面/区块容器统一内边距 */
.wf-page { padding: var(--s-4); }
.wf-section { margin-bottom: var(--s-5); }
.wf-section + .wf-section { margin-top: var(--s-5); }

/* 表单：顶对齐模式（默认），label 与 input 纵向排列、左对齐 */
.wf-form { display: flex; flex-direction: column; gap: var(--s-4); }
.wf-field { display: flex; flex-direction: column; gap: var(--s-2); align-items: stretch; }
.wf-label { font-size: 14px; line-height: 1.5; }   /* label 自身左对齐 */
.wf-input { height: 40px; border: 1px solid #999; border-radius: 0; padding: 0 var(--s-3); }
/* 左对齐模式：同一表单切 .wf-form--left，label 定宽右对齐 */
.wf-form--left { /* gap 继承 */ }
.wf-form--left .wf-field { flex-direction: row; align-items: center; }
.wf-form--left .wf-label { width: 80px; flex-shrink: 0; text-align: right; }

/* 按钮组：同行水平对齐 */
.wf-btn-group { display: flex; gap: var(--s-3); align-items: center; }
.wf-btn-group--center { justify-content: center; }
.wf-btn-group--right { justify-content: flex-end; }
.wf-btn { height: 40px; padding: 0 var(--s-4); border: 1px solid #999; background: #f5f5f5; cursor: pointer; }
.wf-btn--primary { background: #333; color: #fff; border-color: #333; }

/* 连续页面模型：一个页面 = 一个纵向连续画布 */
.wf-view { display: flex; flex-direction: column; width: 100%; gap: var(--s-5); }
/* 页面/流程分组间用细分隔线，不用大留白切块 */
.wf-group { border-bottom: 1px solid #ccc; padding-bottom: var(--s-5); }
.wf-group-title { font-weight: 700; margin-bottom: var(--s-4); }
/* 页面标题：每个页面一个标题条，下方直接是该页连续画布 */
.wf-page-title { font-weight: 600; border-left: 3px solid #333; padding-left: var(--s-2); margin: var(--s-5) 0 var(--s-3); }

/* 状态片段：状态标签条 + 差异区块，不重复整页 */
.wf-state { border-left: 2px dashed #999; padding-left: var(--s-4); margin-top: var(--s-4); }
.wf-state-tag { display: inline-block; font-size: 12px; background: #eee; padding: 2px var(--s-2); margin-bottom: var(--s-2); }
.wf-state + .wf-state { border-top: 1px dashed #ccc; padding-top: var(--s-3); }

/* 模态框：水平垂直居中 + 遮罩 */
.wf-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; }
.wf-modal { width: min(80vw, 480px); min-width: 320px; background: #fff; padding: var(--s-5); display: flex; flex-direction: column; gap: var(--s-4); }

/* 页面标题行内标注：一行收束页面名/ID/流程位置/操作去向，不再用左侧便签列 */
.wf-meta { display: inline-flex; gap: var(--s-3); font-size: 12px; color: #666; }
.wf-todo { float: right; font-size: 12px; color: #a00; border: 1px dashed #a00; padding: 0 var(--s-2); }
```

- 遮罩用 `display: flex; align-items: center; justify-content: center` 实现**弹窗水平垂直居中**，不依赖 `margin: auto` 或手算 `top/left` 偏移
- 表单默认顶对齐；字段多且为 Web 宽屏时切换 `.wf-form--left`（左对齐模式），**同一表单不混用**
- **不为每个状态复制整页**：状态用 `.wf-state` 片段挂在统一页面画布下，审阅点落在页面标题 + 状态标签行
- **不造「左便签 + 右线框」两栏块**：页面元信息收进 `.wf-meta` 标题行、待确认用 `.wf-todo` 浮动标，保持连续画布
- 以上骨架是连续页面模型的**最小实现**，不是视觉样式--低保真仍是黑白灰框线，不加圆角/阴影/品牌色

### 审阅迭代

- 用户按页/状态片段审阅，在输入框写修改点，用快捷标记标「可以/待改/阻塞」
- 导出 Markdown 或 JSON，交给 AI 按反馈修改线框
- 修改后的线框保留上一轮反馈原话，改动页面加标记，方便逐条回归

### 收敛条件

- 用户确认低保真定稿
- 所有「待确认」项已解决
- 反馈输入框全部清空或标记为「可以」
- 每页布局已回写细化到 `design/output/pages/<页面ID>.md` 的「布局结构」
- **连续画布通过**：每页为一个连续骨架，状态只画差异片段，无整页复制的割裂块、无「左便签+右线框」两栏块
- **只用产品语义通过**：线框与页面描述全文无组件库路径（`ui/card`、`src/components/`）、无组件体系名（`CardHeader`、`button/checkbox/badge/progress/tabs` 作为命名）、无实现流程词（`语义 Token`、`复用 xxx`、`还原 TSX`、`基建对齐版`、`组件映射`、`dark mode` 作为产物特性）
- **无冗余解说通过**：无区块级小标签条（`.map-note`/「平台勾选框」「自适应网格排列」类）、无页面底部自述性脚注大段（`.hint`/「本图为低保真…」「保存到 …feedback.md」）
- 控件布局对齐通过：表单 label-input 对齐模式统一、同组控件左对齐、间距均匀
- 页面标题/状态标签与线框本体左边界对齐，元信息收在标题行
- 线框中的模态框/弹窗水平垂直居中，有遮罩层
- **定稿线框 HTML 与审阅反馈已保存**：定稿线框存为 `design/output/phase2_lofi_final.html`，审阅反馈存为 `design/output/feedback/phase2_lofi_feedback.md`--二者合称「低保真布局契约」，是 Phase 4 高保真的布局基线（见跨阶段约束）

**未收敛不进入 Phase 3。** 低保真改方向成本低，高保真改方向成本高。

## Phase 3 · IP 与设计规范

### 目标

建立视觉基线与设计 Token，含 IP 形象，为高保真提供色彩、字体、组件、IP 规范。输入为 Phase 1 页面描述与 Phase 2 低保真定稿。产出为可审阅 HTML，弹出式审阅，与 Phase 2/4 产出格式统一。

### 产出格式

Phase 3 产出两份可审阅 HTML（均含弹出式审阅，见 `specs/review`）：

**品牌规范手册 HTML**：将 `specs/brand` 的 B1-B9 可视化为单页 HTML

- 品牌人格卡片（名称/行业/核心价值/风格关键词）
- Logo 展示区（正/反/单色变体 + 安全空间标注 + 最小尺寸演示）
- 色彩体系区（色板可视化 + hex + 语义名 + 暗色模式切换）
- 字体层级区（实际字体渲染 + 字号阶梯预览）
- 辅助图形区（底纹/装饰铺贴效果演示）
- IP 形象区（三视图 + 表情网格 + 动作展示）--可用 `scripts/toapis.py` 生成
- 应用示例区（名片/头像/Web 头部/IP 融入界面）--可用 `scripts/toapis.py` 生成
- 禁忌示例区（错误用法对比）
- 可选导出 PDF

**设计 Token 文档 HTML**：将 `specs/design-system` 的 Token 体系可视化

- 色彩 Token（三层：基线色板 -> 语义角色 -> 组件引用，可视化对比）
- 字体 Token（实际渲染预览 + 字号阶梯）
- 间距 Token（8dp 栅格可视化标尺）
- 圆角/阴影 Token（实际效果对比）
- 动效 Token（引用 `specs/motion`）
- 组件预览区（Button/Card/Modal 各变体各状态实时渲染）
- 导出区（下载 tokens.json / CSS 变量 / Swift 主题）

两份 HTML 都含弹出式审阅：每区块有 [+] 按钮，点击弹窗写反馈 + 快捷标记（可以/待改/阻塞），支持导出 Markdown/JSON 给 AI 修改，保留上一轮反馈对比。

### 步骤

**3.1 读已有品牌基线**

- 检查产品是否已有品牌 spec（见 `specs/brand`）
- 有 -> 加载为基线（色彩、字体、Logo、辅助图形、IP），直接生成品牌规范手册 HTML
- 无 -> 跳到 3.3 生成新品牌 spec

**3.2 生成 IP 与品牌视觉素材（`scripts/toapis.py`）**

基于 Phase 1 页面描述的交互情境，生成 IP 形象与品牌素材，存入 `design/output/assets/brand/`，嵌入品牌手册 HTML。**每个素材生成前，先写 `design/output/prompts/brand/` 下的 `xxx_prompt.md`**（结构模板、品牌基线绑定、`--ref`、负面词见 `specs/image-prompt/image-prompt-design.md`），审阅确认后再把该 prompt 交给 toapis：

| 素材 | 先写 prompt 文件（`design/output/prompts/brand/`） | 存入路径 | 用途 |
|------|------------|---------|------|
| 品牌情绪板 | `moodboard_prompt.md` | `design/output/assets/brand/moodboard.png` | 品牌手册 B1 区块背景 |
| Logo 概念图 | `logo_concept_prompt.md` | `design/output/assets/brand/logo_concept.png` | 品牌手册 B2 区块 |
| IP 基础形象 | `ip_base_prompt.md` | `design/output/assets/brand/ip_base.png` | 品牌手册 B6 区块 |
| IP 表情（≥8 种） | 每变体一个 `ip_expr_N_prompt.md`（`--ref` 只写变体差异） | `design/output/assets/brand/ip_expr_*.png` | 品牌手册 B6 表情网格 |
| 品牌应用示例 | 每张一个 `app_N_prompt.md` | `design/output/assets/brand/app_*.png` | 品牌手册 B7 区块 |

- 已有品牌基线时，仅生成缺失的素材（基线已有 Logo 则跳过）
- IP 基础形象定稿后，用 `--ref` 参数以图生图方式批量生成各表情/动作，`--ref` 场景下 prompt 只写表情/动作差异，不重述基底风格
- 所有素材以 `<img>` 嵌入 HTML，不用 emoji 占位

**3.3 查 IP 角色**

- 产品是否有品牌吉祥物/IP 角色（见 `specs/brand` 的 B6）
- 有 -> 读 IP 形象规范，影响 Phase 4 的插画系统（见 `specs/illustration`）
- 无 -> 标注，后续按需补充
- IP 形象已在 3.2 生成，此处检查效果是否满足要求

**3.4 生成品牌规范手册 HTML（若无品牌基线）**

按 `specs/brand` 的操作流程生成品牌规范手册 HTML，嵌入 3.2 生成的真实素材：
- 品牌解构（名称/行业/核心价值/风格/人格）+ 情绪板图片
- Logo 设计与安全空间 -> `<img src="assets/brand/logo_concept.png">`
- 品牌色彩体系（主/辅/强调/中性/功能）
- 专用字体层级（展示/正文/标签）
- 辅助图形与底纹
- IP 形象 -> `<img src="assets/brand/ip_base.png">` + 表情网格 `<img src="assets/brand/ip_expr_*.png">`
- 品牌应用示例 -> `<img src="assets/brand/app_*.png">`
- 禁忌示例
- 弹出式审阅（见 `specs/review`）

**3.5 生成设计 Token 文档 HTML**

按 `specs/design-system` 的操作流程生成 Token 文档 HTML：
- 品牌基线 -> Token 三层架构（基线/语义/组件）
- Token 多端导出格式（CSS 变量 / Swift 主题 / XML 主题 / JSON）
- 组件库（原子/分子/有机体/模板）含状态变体
- 组件各变体各状态实时渲染预览
- 弹出式审阅（见 `specs/review`）

### 收敛条件

- 品牌规范手册 HTML 通过 `specs/brand` 验收清单
- 设计 Token 文档 HTML 通过 `specs/design-system` 验收清单
- `design/output/assets/brand/` 目录有真实生成的品牌素材（情绪板/Logo/IP/应用示例）
- Token 可被各端消费
- 审阅反馈全部清空或标记为「可以」；**无真人审阅的回归/自动化场景等效自检**：逐项对照本 spec 收敛条件 + 验收清单自检并在产物旁落 SELF-CHECK.md，脚本可校验项（pageerror/结构计数/命名）用脚本跑，等效替代弹窗审阅

**未收敛不进入 Phase 4。** IP 与设计 Token 是高保真的输入，基线不稳后续全部返工。

## Phase 4 · 高保真

### 目标

基于 IP、品牌基线与设计 Token，产出高保真 UI 原型。低保真验证了「做什么」，高保真验证「长什么样」。输入为 Phase 1 页面描述、Phase 2 低保真定稿、Phase 3 IP/Token。

### 生成插画素材（`scripts/toapis.py`）

用 toapis.py 生成以下插画，存入 `design/output/assets/illustrations/`，嵌入高保真原型替换 emoji 占位符。插画以 Phase 3 的 IP 形象为风格基底。**每个素材生成前，先写 `design/output/prompts/illustration/` 下的 `xxx_prompt.md`**（结构见 `specs/image-prompt/image-prompt-design.md`）：

| 插画 | 先写 prompt 文件（`design/output/prompts/illustration/`） | 存入路径 | 用于 |
|------|------------|---------|------|
| 空状态-首页 | `ill_empty_home_prompt.md` | `design/output/assets/illustrations/ill_empty_home.png` | 首页空数据 |
| 空状态-记录 | `ill_empty_records_prompt.md` | `design/output/assets/illustrations/ill_empty_records.png` | 记录页空数据 |
| 错误-识别失败 | `ill_error_recognize_prompt.md` | `design/output/assets/illustrations/ill_error_recognize.png` | 识别失败页 |
| 加载动画 | `ill_loading_prompt.md` | `design/output/assets/illustrations/ill_loading.png` | 识别加载页 |
| 引导页插画 | 每张一个 `ill_onboarding_N_prompt.md` | `design/output/assets/illustrations/ill_onboarding_*.png` | 首次使用引导 |

- 插画风格须与 Phase 3 的 IP 形象一致（用 `--ref design/output/assets/brand/ip_base.png` 保持风格统一；`--ref` 场景下 prompt 只写场景差异，不重述 IP 基底风格）
- 所有插画以 `<img>` 嵌入 HTML，不用 emoji 占位

### 产出要求

- 消费 Phase 3 的设计 Token（色彩/字体/间距/圆角/阴影/动效）
- 遵循各端平台规范（Web 见 `specs/web`，移动端见 `specs/mobile`）
- 动效引用 `specs/motion`
- 插画引用 `specs/illustration`（空状态/引导/错误/加载）
- 覆盖低保真中定义的所有页面与状态
- **继承低保真布局契约**：页面结构、控件位置、分组、页面标题行标注、表单对齐模式须与低保真定稿一致（见步骤 4.0），高保真只「上色 + 精化」，不重新排布
- **对照页面描述文档**：布局与 `design/output/pages/<页面ID>.md` 的「布局结构」一致，并同步更新文档
- **视觉档次与动态质感**：高保真不是「线框上色版」，须达到成品级的视觉完成度与动态温度--动效传达因果、结果性交互可闻（见步骤 4.2），默认交付可点击、可动、有声的高保真 HTML 原型
- **同步更新页面描述文档**：细化 `design/output/pages/<页面ID>.md` 的「布局结构」与「交互反馈」（对齐模式、栅格、控件、动效/声音），与高保真产物保持一致
- **弹出式审阅（见 `specs/review/review-design.md`）：每屏有 [+] 按钮，点击弹窗写反馈 + 快捷标记
- **对标专业成品级水准**：High-fidelity 不是「线框上色」，须达到专业设计师成品级：反 slop / 排印 / form 推导五问 / 验证方法 / 5 维度评审，以及动效与声音质感进阶（easing 语义名 / orchestration / Signal 克制 / SFX 工程）。下列 4.1-4.3 与审阅 / 收敛为落进本流程的行为点。
- **真实资产优先（资产 > 规范）**：涉及真实品牌 / 产品名时，取官方 logo 与真实产品图（资产优先于规范），不用 SVG 手画 / CSS 剪影冒充真实产品图；Design-me 已有品牌 / IP / Token 则继承，不重新发明
- **placeholder 真诚**：缺真实数据时标诚实占位注释并告知「数据待补」，不编造看起来像数据的假数字；高保真里一个诚实 placeholder 比拙劣真实尝试好
- **事实优先于假设**：涉及具体产品 / 技术 / 规格的事实性断言，先 WebSearch 验证并写入 `product-facts.md`，不凭训练语料臆断

### 步骤

**4.0 读取低保真布局契约（必执行）**

高保真不是从零起稿，是在低保真定稿上「加视觉层」。生成前必须读取并锁定布局基线：

| 读取项 | 路径 | 作用 |
|--------|------|------|
| 低保真定稿线框 | `design/output/phase2_lofi_final.html` | 逐屏对照页面结构、控件位置、分组、页面标题行标注、表单对齐模式 |
| 低保真审阅反馈 | `design/output/feedback/phase2_lofi_feedback.md` | 读取所有「待改」项，确认已落实到定稿线框中；高保真不得重蹈低保真已修正的问题 |
| 方向八行 | `design/output/direction.md` | 字族、饱和度、签名以这份文件为准。没有就先补 SKILL.md 双闸门八行，再进 4.2 |

- 逐屏比对：高保真每屏的控件数量、位置、层级关系须与低保真定稿**一一对应**
- 低保真标「待确认」并已解决的项，高保真按解决后的方案执行
- 低保真反馈中曾指出的问题（如控件不对齐、弹窗偏移），高保真不得重现
- 若高保真阶段发现低保真布局需调整，**先回退 Phase 2 改低保真再改高保真**，不直接在高保真中偷改布局（违反「高保真不改信息架构」）

**4.1 从内容长设计 · form 推导五问（必执行）**

双闸门八行已在 `design/output/direction.md` 与用户对齐。本步只补五问，不重选字族与饱和度。每屏开工前先答「form 推导五问」（UI 改写版，完整规则见 `specs/workflow/hi-fi-acceptance-checklist.md` §3-4）：

| 五问 | UI 版问法 |
|------|-----------|
| 叙事角色 | 这一屏在流程中扮演什么角色（入口/主内容/数据/表单/结果/引导）？ |
| 观众距离 | 用户离这屏多远、在干什么（决定字号与信息密度）？ |
| 视觉温度 | 这屏该安静/兴奋/冷静/权威/温柔/悲伤（落到配色与节奏 Token）？ |
| 容量估算 | 各状态（默认/加载/空/错误）内容都塞得下吗？不爆文本不挤压 |
| 视觉母题 | 本产品内容/数据/IP 里有没有别家不会有的视觉元素/结构/隐喻作 form 种子？ |

- 五问答完才 vocalize 设计系统（色彩/字体/布局/组件），系统服务于答案，不是先选系统再塞内容
- 交付时写一句「**form 来自内容的哪里**」：指认母题出自本产品哪份真实内容、换成别家不成立。指不出 = 在套模板，回去重答第五问
- 开工把五问答案 + assumptions 写进产物开头给用户确认，答不出第五问不进入 4.2

**4.2 视觉档次与动态质感质量闸门（必执行）**

高保真在布局继承上「只加上色与精化」，但那份「精化」不够。这一步交付前须对照以下质量闸门逐项自检，未通过不收敛：

| 维度 | 等级 | 说明 |
|------|------|------|
| **视觉档次** | 平面 → 成品 | 排版、光影、间距达到成品。签名按 SKILL.md 双闸门：只有一处，且能指认到本产品的名词 |
| **动效质感** | 静态 → 动态温度 | 动效不只「有」，而要传达因果：状态反馈、转场方向、加载渐进，引用 `specs/motion` 的时长/缓动/编排 |
| **声音质感** | 无声 → 可闻 | 结果性交互（提交/切换/成功/错误/弹窗）有 UI 声音反馈，引用 `specs/motion` 的交互声音清单；BGM/解说等叙事型音频不在高保真范围 |
| **可交互完成度** | 摆拍 → 可演示 | 默认交付可点击、可切换、可动、有声的 HTML 原型，非静态截图拼贴（静态需用户明确要求）；「可交互」指 **JS + mock 数据驱动的演示**（列表/表单校验/状态切换/图表用内存 mock 数据模拟），**禁止实现真实业务功能**：不接真实后端/API/持久化/登录鉴权，网络请求一律 mock，无后端时不留半截真实调用（mock 不豁免本表验收与 Playwright 点击测试） |

自检项（逐项勾选，任一不满足则返工）：

- [ ] 排版细节到位：正文 ≥14px、标签/注释 ≥12px、对比度达标，非纯色块堆叠；中文正文 ≥17-18px 基准、行宽中文 22-38 字（详见 `specs/workflow/hi-fi-acceptance-checklist.md`）；**App 原型列表次级文字 ≥13px、tab 标签 ≥12px 为下限，同屏不得出现第三种更小字号**
- [ ] 动效符合 `specs/motion`：状态/转场/加载均有对应动效，时长缓动遵循 Token，禁 linear、禁超 500ms、禁 `transition: all`（逐属性声明）；主 easing 用 expoOut 语义（进阶见 `specs/motion/motion-audio-rules.md`）
- [ ] **页面/原型入场由单条编排序列主持**（Web 无框架时用统一 CSS 动画 + `animation-delay` 阶梯，禁止全部元素同帧各自淡入）；App 原型关键屏（首页）入场须可演示错峰
- [ ] **静音开关必须在可交互原型内可操作**（页面内开关控件，非交付包文字声明）；结果性声音的开关与 SFX 同点交付
- [ ] **页面描述文档中声明的每个状态（加载/骨架/错误/空）在 hi-fi 中均有对应落点**：可实现则实做，不可实现（无真实数据）须在 assumptions 里逐条标注「未实现原因」，静默缺失 = 不通过
- [ ] **结果性错误提示挂 `aria-live`/`role=alert`**（错误文案动态插入时读屏可感知），键盘 Esc 关闭模态作为模态可用性底线
- [ ] 原型可交互可演示：点击/切换/流程走得通，Playwright 交互测试 `pageerror` 为 0（移动端可参照）
- [ ] 无「AI 默认味」堆砌：无通用紫渐变、逐处 emoji 图标、圆角卡片+左 border accent 滥堆、SVG 手画人脸等空泛占位（品牌语义引用 Phase 3 Token，反 slop 明细见 checklist）
- [ ] 反填充：每个元素 earn its place，删掉任一元素无所损就删；用构图解决空白，不编造内容填
- [ ] 签名按 SKILL.md 双闸门：只有一处，且能指认来自本产品的哪一个名词
- [ ] 信息密度分型正确：默认克制型；AI/数据/上下文感知类产品走高密度型（每屏 ≥3 处有内容的差异化信息），不做「大片死白+微缩字号」的过头安静派（见 checklist §5）
- [ ] 交互工程兜底通过：单文件交付的图片/logo 已 base64 内嵌，Playwright 验证无裂图（`<img>` naturalWidth>0 / 无资源 404，裂图不抛 pageerror 需单独查）；WebAudio 在首次用户交互后解锁，音源缺失/播放失败静默兜底不产生 JS 报错（见 `specs/motion` 实现要点）
- [ ] 至少提供跨维度的方向/变体供用户选择，不只给孤案

**4.3 概念与立意把控（必执行）**

执行是放大镜，概念不成立则放大空洞更空洞。核心能力阶段前做概念测试：

- 一句话 idea：这个设计有没有一个能用一句话讲出来的 idea？讲不出 = 没有
- 盖 logo 测试：盖住文字与 logo 还认得出主题吗？认不出 = 视觉没承担表达
- 换皮测试：换个客户/产品名还成立吗？成立 = 模板套皮，概念维度直接压分
- 一票否决：概念不成立则先回 Phase 1/2 修立意，不带着空洞概念进 4.2

### 审阅迭代

与 Phase 2 相同的审阅循环，但关注视觉问题：
- **对照低保真布局契约**：逐屏检查控件位置、分组、页面标题行标注、表单对齐模式是否与低保真定稿一致，偏离项标「待改」并回退修正
- 对比度、间距、字体配对、状态完整性、暗色模式
- **视觉档次与动态质感**：动效是否传达因果关系、声音是否到位、是否成品级而非「线框上色」
- 品牌一致性（是否偏离 Phase 3 的品牌基线）
- **5 维度专业评审（可选质检，详见 `specs/workflow/hi-fi-acceptance-checklist.md` §2）**：哲学一致性 / 视觉层级（眯眼测试、标题正文字号差 ≥2.5 倍、3-4 层级）/ 细节执行（间距系统、≤3-4 色、≤2 字体）/ 功能性（删元素会否变差）/ 创新性（避开 cliché）。输出结构：总体分 + 分项分 + **Keep**（用设计语言描述）+ **Fix**（标 ⚠️致命/⚡重要/💡优化，每条含「当前/问题/修复含数值」）+ **Quick Wins**（5 分钟先做 3 件）。评审设计不评设计师，Findings 指向设计决策
- **验证方法（工程化必查，详见 checklist §1）**：先用「已知正确同类页」喂同一渲染器做工具自验（区分环境问题 vs 产物问题）；Playwright 多 viewport 截图（`1920/1440/768/375` + retina `device_scale_factor=2` + 逐页一图 + 等动画 settle）、控制台 `pageerror`=0、交付前真实浏览器肉眼过一遍；「看起来对但 interaction 有 bug / 静态好看但 scroll 错位 / 变体切换组件不响应」三类名坑列入必查

### 收敛条件

- 用户确认设计定稿
- 各端 spec 验收清单全部通过
- `design/output/assets/illustrations/` 目录有真实生成的插画素材
- 原型中无 emoji 占位符，所有视觉元素为真实图片或 CSS 渲染
- **布局契约一致性通过**：逐屏对照低保真定稿，页面结构、控件位置、分组、页面标题行标注、表单对齐模式一一对应，无偷改布局
- **动态质感质量闸门通过**：视觉成品级、动效传达因果、结果性交互可闻（含静音开关）、原型可交互可演示（步骤 4.2 自检项全部勾选）
- **概念 / form 自证通过**：步骤 4.1 五问 + 「form 来自内容的哪里」已写进产物 assumptions；步骤 4.3 概念测试（一句话 idea / 盖 logo / 换皮）通过
- **客观验证通过**：`pageerror`=0、多 viewport 无横向滚动破版、真实浏览器肉眼过一遍、关键流程点击测试通过
- 审阅反馈全部清空或标记为「可以」；**无真人审阅的回归/自动化场景等效自检**：逐项对照本 spec 收敛条件 + 验收清单自检并在产物旁落 SELF-CHECK.md，脚本可校验项（pageerror/结构计数/命名）用脚本跑，等效替代弹窗审阅

**未收敛不进入 Phase 5。**

## Phase 5 · 交付

### 目标

将定稿设计转化为开发可直接使用的交付物。产出为交付包 HTML + 真实资产文件，弹出式审阅，与 Phase 1/2/3/4/6 产出格式统一。详见 `specs/handoff`。

### 生成真实资产文件

Phase 5 不仅是列出文件清单，而是**创建真实文件**，存入 `design/output/assets/` 目录，开发拿到即可用：

| 资产类型 | 生成方式 | 存入路径 | 交付物 |
|---------|---------|---------|--------|
| 图标 SVG | 手写 SVG 文件（参照 `specs/icon-system` 规范） | `design/output/assets/icons/ic_*.svg` | 每个图标一个 SVG，currentColor 主题化 |
| 插画素材 | 从 Phase 4 的 `design/output/assets/illustrations/` 复制 | `design/output/assets/illustrations/ill_*.png` | 空状态/错误/加载/引导 |
| App 图标 | 从 Phase 3 的 `design/output/assets/brand/` 复制或 toapis 重新生成 | `design/output/assets/icons/icon_app_*.png` | 各平台尺寸 |
| Token 文件 | 生成 `tokens.json` | `design/output/assets/tokens.json` | 单一源，各端消费 |
| 品牌素材 | 从 Phase 3 的 `design/output/assets/brand/` 复制 | `design/output/assets/brand/*` | Logo/IP/情绪板 |

- 交付包 HTML 的资源区不再用 emoji 占位，而是 `<img src="assets/icons/ic_*.svg">` 展示真实图标预览
- 每个资产有下载链接（`<a href="assets/..." download>`）
- tokens.json 是真实可下载文件

### 产出要求

单页 HTML 文件，将 `specs/handoff` 的全部交付物可视化，嵌入真实资产，弹出式审阅：

- 标注文档区：间距/字号/颜色/圆角/阴影标注，用语义名
- 资源包区：真实 SVG 图标预览 + 真实插画预览 + 下载链接，不用 emoji
- Token 文件区：tokens.json 可下载 + 各端导出格式
- 交互说明区：状态/动效/边界条件
- 走查清单区：各端 spec 验收标准 + 交付专属项
- **弹出式审阅（见 `specs/review/review-design.md`）：每个交付物区块有 [+] 按钮，点击弹窗写反馈 + 快捷标记

### 审阅迭代

- 开发逐区块审阅，检查标注是否够用、切图是否齐全、Token 是否可消费
- 在输入框写补充或修改点，用快捷标记标「可以/待改/阻塞」
- 导出 Markdown 或 JSON，交给 AI 或设计补充修改

### 收敛条件

- `specs/handoff` 验收清单全部通过
- `design/output/assets/` 目录有真实资产文件（SVG 图标 / 插画 / tokens.json / App 图标）
- 交付包 HTML 嵌入真实素材预览，无 emoji 占位
- tokens.json 可被各端直接消费
- 审阅反馈全部清空或标记为「可以」；**无真人审阅的回归/自动化场景等效自检**：逐项对照本 spec 收敛条件 + 验收清单自检并在产物旁落 SELF-CHECK.md，脚本可校验项（pageerror/结构计数/命名）用脚本跑，等效替代弹窗审阅

**未收敛不进入开发实现。**

## Phase 6 · 实现后走查（独立阶段）

### 目标

开发实现完成后，对实际运行的产品做全流程页面走查，验证设计还原度与体验完整性。本阶段在设计交付之后，不属于设计流程，但复用审阅机制。

### 产出要求

- 实际运行产品，按真实用户使用顺序截取所有核心页面与关键状态
- 按流程分组，每组一个小标题，从头到尾是一次完整产品体验
- 覆盖正常流程 + 重要分支 + 不同页面状态
- 每屏标注：页面名称、当前状态、复现方式
- 每屏有反馈输入框 + 快捷标记（可以/待改/阻塞）
- 每组末尾有流程反馈输入框
- 所有反馈本地自动保存
- 支持导出 Markdown、导出 JSON，可直接交给 AI 修改
- 新一轮走查保留上一轮反馈原话，改动页面加标记，方便逐条回归

### 与其他 Phase 的区别

Phase 6 与其他审阅阶段用同一套审阅机制（`specs/review`），但产出物和反馈去向不同。差异详见 `specs/review` 的各阶段差异表。核心区别：

| 维度 | Phase 2 低保真 | Phase 4 高保真 | Phase 6 实现后 |
|------|--------------|--------------|--------------|
| 审查对象 | 线框 HTML | UI 原型 | 实际运行产品 |
| 反馈对象 | AI 修改线框 | AI 修改原型 | 开发修复实现 |
| 关注点 | 信息架构/流程 | 视觉/交互/品牌 | 还原度/体验完整性 |

## 跨阶段约束

- **渐进保真**：低保真不碰视觉，高保真不改信息架构。每层只解决本层问题。
- **收敛才推进**：每个 Phase 有收敛条件，未收敛不进入下一 Phase。
- **页面描述是契约**：Phase 1 的 `design/output/pages/*.md` 定义每页的功能定位与布局结构，是 Phase 2 低保真的输入与对齐基线；低保真/高保真迭代中持续回写更新（SDD）。
- **Token 是契约**：Phase 3 产出的 Token 是 Phase 4 和 Phase 5 的契约，改 Token = 改设计，二者同步（SDD）。
- **低保真布局是契约**：Phase 2 收敛后的定稿线框 + 审阅反馈合称「低保真布局契约」，是 Phase 4 高保真的布局基线。高保真继承布局（页面结构/控件位置/分组/页面标题行标注/表单对齐），只加视觉层，不重新排布。改布局 = 改低保真，须回退 Phase 2 修正再推进，不直接在高保真中偷改。
- **审阅机制复用**：Phase 1、2、3、4、5、6 共用 `specs/review` 的审阅机制，不各写一套。
- **spec 先行**：新增设计能力先写 spec 再执行（SDD），spec 与产出始终一致。

## 验收标准

- [ ] Phase 1 页面描述文档覆盖 PRD 全部页面（每页一个 `design/output/pages/<页面ID>.md`），含审阅机制
- [ ] Phase 1 每个页面文档含：功能定位/进入去向/状态/布局结构/交互反馈（见「页面描述文档」）
- [ ] Phase 1 用户已确认页面描述（收敛）
- [ ] Phase 2 低保真含所有状态与审阅机制
- [ ] Phase 2 低保真与 `design/output/pages/<页面ID>.md` 的布局结构一致，并已回写细化
- [ ] Phase 2 线框与页面描述只用产品语义，无组件库路径/组件体系名/Token/实现流程词
- [ ] Phase 2 连续画布通过：每页一个骨架、状态只画差异片段、无割裂块、无两栏块
- [ ] Phase 2 无冗余解说通过：无区块级小标签条（`.map-note`）、无页面底部自述脚注（`.hint`）
- [ ] Phase 2 控件布局对齐规范通过（表单 label-input 对齐、同组控件左对齐、间距 8px 栅格、模态框居中）
- [ ] Phase 2 页面标题/状态标签与线框左边界对齐通过，无「左便签+右线框」两栏块
- [ ] Phase 2 用户已确认定稿（收敛）
- [ ] Phase 2 定稿线框与审阅反馈已保存为「低保真布局契约」（`design/output/phase2_lofi_final.html` + `design/output/feedback/phase2_lofi_feedback.md`）
- [ ] Phase 3 IP 与品牌规范手册 HTML 通过验收（含 IP 形象）
- [ ] Phase 3 Token 文档 HTML 通过验收，Token 可被各端消费
- [ ] Phase 3 `design/output/assets/brand/` 有真实 toapis 生成的品牌素材
- [ ] Phase 4 步骤 4.0 已读取低保真布局契约（定稿线框 + 审阅反馈）
- [ ] Phase 4 步骤 4.1 已答 form 推导五问（UI 版）并写「form 来自内容的哪里」进 assumptions
- [ ] Phase 4 UI 原型消费 Token + 遵循各端 spec
- [ ] Phase 4 布局契约一致性通过（逐屏对照低保真定稿，控件位置/分组/标注/对齐一一对应）
- [ ] Phase 4 动态质感质量闸门通过（步骤 4.2：视觉成品级、动效传达因果、结果性交互可闻、原型可交互可演示）
- [ ] Phase 4 步骤 4.3 概念测试通过（一句话 idea / 盖 logo / 换皮）
- [ ] Phase 4 客观验证通过（Playwright `pageerror`=0、多 viewport 无横向滚动、真实浏览器肉眼、关键流程点击测试）
- [ ] Phase 4 `design/output/assets/illustrations/` 有真实 toapis 生成的插画素材
- [ ] Phase 4 原型无 emoji 占位符，视觉元素为真实图片
- [ ] Phase 4 `design/output/pages/` 每个页面「布局结构」与「交互反馈」已细化并与高保真产物一致
- [ ] Phase 5 交付包 HTML 通过 `specs/handoff` 验收，含审阅机制
- [ ] Phase 5 `design/output/assets/` 有真实资产文件（SVG/插画/tokens.json）
- [ ] Phase 5 交付包 HTML 嵌入真实素材预览，无 emoji 占位
- [ ] 每个审阅阶段有收敛检查点记录
- [ ] 未收敛的 Phase 未进入下一 Phase

## 边界与不做项

- 不负责 PRD 撰写（本流程从 PRD 开始）
- 不负责开发实现（Phase 6 只走查，不修复）
- 各领域规范见各自 spec，本文件只定义流程顺序与检查点
- 审阅机制的定义见 `specs/review/review-design.md`
