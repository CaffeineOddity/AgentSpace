# 审阅反馈机制规范

> 本文件是设计产物审阅反馈机制的唯一事实来源。Phase 1（页面描述）、Phase 2（低保真）、Phase 3（IP 与设计规范）、Phase 4（高保真）、Phase 5（交付）、Phase 6（实现后走查）共用这套机制，不各写一套。流程顺序见 `specs/workflow/design-workflow.md`。独立任务（封面/图标/插画/文案）也复用此机制。

## 设计目标

让每个设计产物（线框 HTML、UI 原型、走查页面）都自带可结构化审阅的反馈层。核心解决两个问题：**反馈可追溯**（每条反馈绑定到具体页面与状态，不散落在聊天记录里）和 **反馈可导出**（格式化输出给 AI 或开发，直接驱动下一轮修改）。

审阅不是可选的附加功能，是每个保真度检查点的硬性闸门。没有审阅机制的产物不算交付。

## 交互模式

审阅层与内容层**分离**：设计产物本体保持干净，不被输入框/按钮遮挡。审阅者通过点击页面/区块上的「+」按钮打开弹窗，在弹窗内写反馈、标记、查看上一轮记录。

```
设计产物 HTML（内容层，干净无干扰）
├── 页面区块（按流程分组）
│   ├── 页面 A
│   │   ├── 元信息（名称/状态/复现方式）
│   │   ├── 内容（线框 / 原型截图 / 运行截图）
│   │   └── [+] 审阅按钮 ← 点击打开弹窗
│   ├── 页面 B ...
│   └── [+] 组级审阅按钮
├── 全局工具栏（固定，不遮挡内容）
│   ├── 进度计数（3/15 已审）
│   └── 保存反馈按钮（Markdown，自动写入 design/output/feedback/）
├── 弹窗层（覆盖在最上层，点击 [+] 时打开）
│   ├── 页面元信息（只读）
│   ├── 上一轮反馈（只读）
│   ├── 反馈输入框
│   └── 快捷标记（可以/待改/阻塞）
├── 本地存储层（自动保存所有反馈）
└── 导出层（Markdown，写入 design/output/feedback/ 目录）
```

## 审阅按钮

每个页面/区块右上角有一个「+」按钮，是审阅的入口：

| 按钮状态 | 含义 | 视觉 |
|---------|------|------|
| 默认 | 该项未审阅 | 灰色「+」 |
| 已标记「可以」 | 该项通过 | 绿色「✓」 |
| 已标记「待改」 | 有修改意见 | 黄色「！」 |
| 已标记「阻塞」 | 有严重问题 | 红色「✕」 |
| 有反馈但未标记 | 写了反馈未定状态 | 蓝色「+」 |

- 按钮状态实时反映该页的审阅状态，一眼看出哪些审了、哪些没审
- 按钮不遮挡核心内容，固定在区块右上角
- 组级审阅按钮同理，放在每组末尾

## 弹窗

点击「+」按钮打开弹窗，弹窗内容：

### 元信息（只读）

弹窗顶部显示该页/区块的元信息，让审阅者确认在看什么：

| 字段 | 说明 | 示例 |
|------|------|------|
| 页面名称 | 屏幕的业务名称 | 商品详情页 |
| 当前状态 | 该屏处于什么状态 | 加载中 / 空数据 / 错误 / 默认 |
| 复现方式 | 怎么操作到这个状态 | 首页 -> 搜索 -> 无结果 |

低保真阶段复现方式写「线框第 X 屏」；高保真写「点击 XX 按钮后」；实现后写实际操作路径。

### 上一轮反馈（只读，若有）

新一轮走查时，弹窗内显示上一轮的反馈原话（只读，不可编辑），让审阅者对照验证是否已修复。

### 反馈输入框

弹窗内一个文本输入框，审阅者在此写修改意见：

- 内容自动保存到本地（localStorage），弹窗关闭不丢
- 空输入 = 该项无反馈（默认通过）
- 弹窗内输入框不与内容层耦合，关弹窗后页面本体干净

### 快捷标记

弹窗内三个快捷按钮，点击后切换状态并自动保存：

| 标记 | 含义 | 视觉 |
|------|------|------|
| 可以 | 该项通过，无需修改 | 绿色 |
| 待改 | 有修改意见，需在输入框补充 | 黄色 |
| 阻塞 | 有严重问题，阻断后续流程 | 红色 |

快捷标记与输入框配合使用：「待改」时输入框须有内容，「阻塞」时输入框须说明阻塞原因。标记后弹窗内按钮变色，同时页面上的「+」按钮同步变色。

### 已改动标记

新一轮走查时，改动过的页面区块加「已改动」角标（视觉高亮，区别于未改动页面）。弹窗内同时显示上一轮反馈，审阅者逐条对照验证。

## 全局工具栏

页面顶部或底部固定一个工具栏，不遮挡内容：

| 元素 | 功能 |
|------|------|
| 进度计数 | 显示「3/15 已审」，让审阅者知道进度 |
| 保存反馈 | 将有反馈的项保存为 .md，自动写入 `design/output/feedback/` 目录 |
| 清空本轮 | 清空当前轮的所有反馈（需确认） |

## 本地存储

所有反馈（页面级 + 组级）自动保存到浏览器本地：

- 键名按 `产物ID + 页面ID` 组织，支持多轮走查共存
- 页面刷新后自动恢复已填反馈，弹窗重新打开时显示已有内容
- 清空某页反馈 = 删除该键，不是覆盖为空字符串
- 存储键不与页面 DOM 强耦合，页面顺序变化时反馈不丢

## 保存反馈

审阅者完成审阅后，从全局工具栏点「保存反馈」按钮，**仅含有反馈或标记的项**写入 Markdown 文件，未标记项 = 通过，不出现在文件中。不需要 JSON。

### 过滤规则

| 项状态 | 是否保存 |
|--------|---------|
| 有标记（可以/待改/阻塞）+ 有反馈文字 | ✅ 保存 |
| 有标记 + 无反馈文字 | ✅ 保存 |
| 无标记 + 有反馈文字 | ✅ 保存 |
| 无标记 + 无反馈文字 | ❌ 不保存（= 通过） |

### 保存路径

所有反馈文件统一存到 `design/output/feedback/` 目录（与 `design/output/assets/`、`design/output/prompts/` 同级），文件名约定：

```
design/output/feedback/<phase>_<type>_feedback.md

示例：
design/output/feedback/phase1_pagelist_feedback.md
design/output/feedback/phase2_lofi_feedback.md
design/output/feedback/phase3_brand_feedback.md
design/output/feedback/phase3_token_feedback.md
design/output/feedback/phase4_hifi_feedback.md
```

- 使用 File System Access API（Chrome/Edge）：首次保存弹出目录选择，用户选 `design/output/feedback/` 目录后自动写入，后续保存无需再选
- 目录句柄存 IndexedDB，页面刷新后自动恢复绑定
- 不支持时降级为浏览器下载（文件名按约定），用户手动存入 `design/output/feedback/` 目录
- AI 直接读 `design/output/feedback/` 目录下的 .md 文件，无需用户在对话中粘贴

### FSAA 参考实现（生成产物时必须包含）

以下为最小实现骨架，生成审阅 HTML 时直接内联，不得省略：

```js
// 句柄持久化：存 IndexedDB，刷新后复用
async function saveDirHandle(h) { /* put into IndexedDB store 'fsaa', key 'feedbackDir' */ }
async function getDirHandle() { /* read from IndexedDB; null if absent */ }

async function ensureFeedbackDir() {
  let dir = await getDirHandle();
  if (!dir) {
    dir = await showDirectoryPicker({ mode: 'readwrite' }); // 首次：用户选 design/output/feedback/ 目录
    await saveDirHandle(dir);
  }
  if (await dir.queryPermission({ mode: 'readwrite' }) !== 'granted') {
    if (await dir.requestPermission({ mode: 'readwrite' }) !== 'granted') return null; // 用户拒绝 → 降级
  }
  return dir;
}

async function saveFeedback(md, filename) {
  const dir = await ensureFeedbackDir();
  if (dir) { // 主路径：直接写入 design/output/feedback/
    const fh = await dir.getFileHandle(filename, { create: true });
    const w = await fh.createWritable();
    await w.write(md); await w.close();
    return;
  }
  // 降级路径：Blob 下载，用户手动存入 design/output/feedback/
  const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click(); URL.revokeObjectURL(url);
}

// init() 时若 IndexedDB 有句柄则复用，不重复弹目录选择
```

注意：`file://` 协议下 FSAA 不可用（需 http(s) 或让用户直接双击打开本地文件时依赖浏览器策略）；Safari/Firefox 无 `showDirectoryPicker`，自动走降级。

### Markdown 格式

```markdown
# 走查反馈 - <产物名> - 第 N 轮

> 仅含有反馈/标记的项。未标记 = 通过，已排除。

## 页面：<页面名称>
- 状态：<当前状态>
- 复现：<复现方式>
- 标记：待改
- 反馈：按钮位置太靠下，在 375px 屏幕上被手势条遮挡

## 组级反馈
跳转逻辑太绕，建议合并第 2、3 步
```

AI 读取 .md 文件后，按区块标题定位要修改的页面/区块，逐条修正后重新生成产物。

## 上一轮对比

新一轮走查时：

- 弹窗内保留上一轮的反馈原话（只读，不可编辑）
- 改动过的页面区块加「已改动」角标
- 审阅者逐条打开弹窗，对照上一轮反馈验证是否已修复
- 新反馈写在上一轮下方（弹窗内），形成「上一轮原话 -> 本轮验证」的对照

这让回归验证变得简单：不用翻历史记录，打开弹窗一眼看到「上轮说了什么 -> 这轮改了没有」。

## 页面 ID 约定

每个页面区块有唯一 ID，用于反馈绑定与 AI 修改路由：

- 格式：`<流程组号>_<页面序号>`，如 `01_03` 表示第 1 组第 3 屏
- ID 在多轮走查中保持稳定，不随页面顺序调整而变化
AI 读取 .md 文件后，按区块标题定位要修改的页面/区块，逐条修正后重新生成产物。

## 审阅产物技术要求

承载审阅机制的 HTML 产物须满足：

- 单文件，打开即用，不依赖外部资源（CSS/JS 内联）
- 审阅层用原生 JS + localStorage，不引入框架
- 审阅按钮用 `position: absolute` 定位在区块右上角，不遮挡内容
- 弹窗用 `position: fixed` + `z-index` 覆盖最上层，点击遮罩或关闭按钮关闭
- **弹窗必须水平垂直居中**：遮罩层用 flexbox 居中（`display: flex; align-items: center; justify-content: center`），弹窗本体不手算 `top/left` 偏移；手机端弹窗宽度撑满、垂直居中
- 页面区块用语义化 ID（`page_01_03`）绑定反馈
- 保存反馈必须实现 FSAA 写入 + 降级下载两条路径（见下方参考实现），只做 Blob 下载不合格
- 降级下载按钮生成 Blob 下载，不调服务端
- 响应式：审阅者在手机上也能看低保真线框并写反馈（弹窗全屏适配）

### 弹窗居中参考 CSS（生成产物时必须包含）

以下为弹窗居中的最小 CSS 骨架，生成审阅 HTML 时直接内联，**不得省略居中规则**：

```css
/* 遮罩层：fixed 全屏 + flexbox 居中弹窗 */
.review-overlay {
  position: fixed;
  inset: 0;                              /* 等价 top:0;right:0;bottom:0;left:0 */
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;                   /* 垂直居中 */
  justify-content: center;               /* 水平居中 */
  z-index: 9999;
  padding: 16px;                          /* 防止弹窗贴边 */
  box-sizing: border-box;
}

/* 弹窗本体：定宽上限 + 内容自适应 */
.review-modal {
  width: 100%;
  max-width: 480px;                      /* Web/平板上限 */
  max-height: 85vh;                      /* 超长内容可滚动 */
  overflow-y: auto;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* 手机端：弹窗宽度撑满遮罩可用空间，仍垂直居中 */
@media (max-width: 480px) {
  .review-modal { max-width: 100%; max-height: 90vh; }
}
```

- 遮罩用 `display: flex; align-items: center; justify-content: center` 实现**水平垂直双居中**，不依赖 `margin: auto`（某些浏览器对 `position: fixed` 元素的 margin auto 支持不一致）或手算 `top: 50%; transform: translate(-50%, -50%)`（易与 `max-height` 滚动冲突）
- 弹窗宽度用 `width: 100%; max-width: 480px`--窄屏撑满、宽屏不超限，避免出现弹窗偏左/偏右
- `inset: 0` 替代四方向各写一行，遮罩必定覆盖全屏


## 各阶段差异

同一套机制，六个阶段的配置差异：

| 维度 | Phase 1 页面描述 | Phase 2 低保真 | Phase 3 IP 与设计规范 | Phase 4 高保真 | Phase 5 交付 | Phase 6 实现后 |
|------|---------------|--------------|-------------------|--------------|------------|--------------|
| 内容来源 | 页面描述文档 `design/output/pages/*.md`（功能定位/状态/布局结构） | 线框图（黑白灰框线） | 品牌手册 HTML + Token 文档 HTML + IP | UI 原型截图/HTML | 标注/切图/Token/清单 | 实际运行截图 |
| 复现方式 | 页面描述第 X 页 | 线框第 X 屏 | 手册第 X 区块 | 点击 XX 后 | 交付物第 X 项 | 实际操作路径 |
| 反馈去向 | AI 补充页面/状态/布局结构 | AI 修改线框 + 回写页面描述 | AI 修改品牌规范/Token/IP | AI 修改原型 + 同步页面描述 | AI/设计补充交付 | 开发修复实现 |
| 关注点 | 页面完整性/状态覆盖/布局结构 | 布局与页面描述一致性/信息架构/流程 | 色彩/字体/Logo/IP 是否对 | 布局契约一致性/视觉/交互/品牌一致性 | 标注是否够用/切图是否齐全 | 还原度/体验完整性 |
| 导出接收方 | 设计 AI | 设计 AI | 设计 AI | 设计 AI | 设计 AI + 开发 | 开发团队 |

### 独立任务

独立设计任务（非项目流程内）也复用审阅机制：

| 任务 | 审阅 HTML | 内容来源 | 关注点 |
|------|---------|---------|--------|
| 封面矩阵 | 封面矩阵 HTML | 多平台封面并排 | 跨平台一致性/安全区/标题 |
| 图标集 | 图标集 HTML | 整套图标网格 | 线宽/填充/命名/状态一致性 |
| 插画集 | 插画集 HTML | 整套插画并排 | 风格/色彩/场景一致性 |
| 文案集 | 文案集 HTML | UI 文案 + 术语表 | 用词一致性/文案规范 |

## 验收标准

- [ ] 每页/区块右上角有审阅「+」按钮
- [ ] 按钮状态实时反映审阅结果（灰色/绿色/黄色/红色/蓝色）
- [ ] 点击「+」打开弹窗，弹窗含元信息（只读）
- [ ] 弹窗有反馈输入框，内容自动保存到本地
- [ ] 弹窗有「可以/待改/阻塞」三个快捷标记
- [ ] 「待改」时输入框须有内容
- [ ] 「阻塞」时输入框须说明阻塞原因
- [ ] 标记后页面「+」按钮同步变色
- [ ] 每组末尾有组级审阅按钮
- [ ] 全局工具栏有进度计数 + 保存反馈按钮
- [ ] 保存仅含有标记或反馈的项，未标记项排除
- [ ] 保存为 Markdown 格式，不需要 JSON
- [ ] 文件名遵循 `design/output/feedback/<phase>_<type>_feedback.md` 约定
- [ ] 实现了 FSAA 主路径（`showDirectoryPicker` + IndexedDB 句柄复用 + `queryPermission` 复查），并含参考实现骨架
- [ ] 不支持 FSAA **或用户取消目录选择（AbortError）**时降级为浏览器下载——取消是必经分支，未捕获即保存中断且无提示（失败可见或安静降级，不可崩）
- [ ] 新一轮弹窗内保留上一轮反馈原话（只读）
- [ ] 改动页面区块有「已改动」角标
- [ ] 页面 ID 在多轮走查中稳定
- [ ] 单文件 HTML，不依赖外部资源
- [ ] 审阅层用原生 JS + localStorage，不引入框架
- [ ] 弹窗 `position: fixed` 覆盖最上层，不遮挡内容层
- [ ] 弹窗水平垂直双居中（遮罩层 flexbox `align-items: center; justify-content: center`），含参考 CSS 骨架
- [ ] 弹窗窄屏撑满、宽屏不超 `max-width`，不偏移不贴边
- [ ] 响应式，弹窗手机端全屏适配

## 边界与不做项

- 不定义设计产物本身的内容（线框/原型/截图见 `specs/workflow` 各 Phase）
- 不负责 AI 如何消费保存的 .md 修改产物（AI 按自身能力处理）
- 不定义服务端存储（反馈存本地，不上传，除非用户明确要求）
- 流程顺序与阶段检查点见 `specs/workflow/design-workflow.md`
