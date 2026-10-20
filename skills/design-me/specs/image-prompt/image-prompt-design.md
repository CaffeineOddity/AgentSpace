# 图像生成 Prompt 撰写规范

> 本文件是 design-me 通过 `scripts/toapis.py` 生成图像/视频素材时，Prompt 撰写的唯一事实来源。凡用 toapis 出设计效果图（图标、icon、UI、IP 形象、封面、插画、品牌情绪板等），**必须先写 Prompt 文件（`xxx_prompt.md`），审阅确认后再交给 toapis 生成**。Prompt 是设计决策的一部分，和线框、Token 一样可被审阅、可迭代，不靠 AI 临时发挥。

## 设计目标

让每次 toapis 生成都有**可审阅、可复用、可回归**的 Prompt。核心解决三个问题：

1. **Prompt 先于生成**：先落成 `.md` 文件，不是临场在命令行里 `--prompt "..."` 即兴写
2. **品牌基线绑定**：Prompt 显式引用品牌色 hex、字体、IP 特征与风格语义，不凭想象
3. **`--ref` 风格统一**：图生图场景下，Prompt 描述变体/表情/场景，不擅自改风格

## 何时必须先生成 Prompt 文件

以下出「设计效果图」的场景，**生成前必须先产出 `xxx_prompt.md`**：

| 场景 | 典型素材 | 路由 spec |
|------|---------|----------|
| 品牌视觉 | Logo 概念图、情绪板、IP 基础形象、IP 表情、品牌应用示例 | `specs/brand` |
| UI 界面 | App/Web 效果图、界面 mockup 视觉稿（非低保真线框） | `specs/mobile` / `specs/web` |
| 图标系统 | UI 图标集、icon 单个、图标探索稿 | `specs/icon-system` |
| 插画/空状态 | 空状态、引导页、错误页、加载、文章配图 | `specs/illustration` |
| 封面/头图 | 公众号/小红书/YouTube/Bilibili 封面头图缩略图 | `specs/cover` |

排除：低保真线框（HTML 手写）、纯 HTML/CSS 可实现的图标（SVG 手写见 `specs/icon-system`）不强制走此流程；但若用 toapis 生成视觉位图即适用。

## Prompt 文件规范

### 文件命名与存放

所有 prompt 统一存到 `design/output/prompts/` 目录，与生成图（`design/output/assets/...`）分目录。

```
design/output/prompts/<素材类型>/<素材名>_prompt.md

示例：
design/output/prompts/brand/ip_base_prompt.md
design/output/prompts/brand/ip_expr_1_prompt.md
design/output/prompts/illustration/ill_empty_home_prompt.md
design/output/prompts/cover/cover_wechat_prompt.md
design/output/prompts/icon/ic_dashboard_prompt.md
```

- 目录按素材类型细分（`brand` / `illustration` / `cover` / `icon` / `ui` / `video` 等），素材名与对应生成图同名（`<素材名>_prompt.md` ↔ `<素材名>.png`）
- 每张图一个 prompt 文件，不合并；`--ref` 图生图批次可每个变体各一个
- Prompt 文件本身是可审阅产物，可纳入 Phase 审阅迭代，不算临时文件
- 生成图仍存 `design/output/assets/` 对应子目录，prompt 与其分开放，避免污染资产生成目录

### 结构模板

每个 `xxx_prompt.md` 按以下结构组织，缺项则说明原因：

```markdown
# <素材名> Prompt

## 用途
该素材用在哪个 Phase / 页面 / 区块（如「Phase 3 品牌手册 B2 Logo 区」

## 内容画布
- 画布规格：（toapis 参数，如 `--size 16:9` / `--background transparent`）
- 模型：<gpt-image-2 / 其他>
- 参考图（--ref）：无 或 <路径/URL>

## 主体与构图
- 主体：<要画的核心对象；Icon 则描述图形语义、线宽、网格>\
- 构图：<居中 / 三分 / 留白比例；主体占画面多少>

## 场景与风格
- 场景：<放什么环境/背景；封面则含标题占位、信息层级>
- 风格语义：<扁平 / 拟物 / 玻璃拟态 / 3D / 插画手绘…；一句话风格基调>

## 品牌基线绑定
- 主色：<hex>（引用 Phase 3 色板语义名）
- 辅助色：<hex>
- 字体/字族特征：<封面/UI 需要时写明，如字形圆润/科技感>
- IP 特征：（若为 IP 衍生，写明 IP 的可辨识细节：五官/配色/造型件，供 --ref 复核）

## 光线 / 材质 / 细节（视素材类型可选）
- <扁平图标可写「纯色、无内阴影、无渐变」；插画/封面写光线与材质>

## 负面词（Negative）
- <明确不要什么：禁文字水印、禁多余元素、禁错字、禁过曝等>

## toapis 命令
```bash
python3 scripts/toapis.py image --model <model> --prompt "$(cat design/output/prompts/<素材类型>/<素材名>_prompt.md)" [--ref ...] --background ... --size ... --save design/output/assets/<素材类型>/<素材名>.png
```
```

### 撰写要点

- **一条 prompt 一个主体**：混入多个无关主体会让生成失控
- **品牌基线必绑**：涉及品牌的素材必须写 hex 与风格语义，禁止用「企业蓝」「现代感」等模糊词
- **Prompt 文件即模型输入全文**：`--prompt-file`（toapis.py 支持，与 `--prompt` 二选一）直接以文件原文为模型输入——流程/回归说明（「不实际调用」「仅供审阅」等元信息）不得写进 Prompt 文件，放 SELF-CHECK；含元信息即污染生成
- **展示环境声明**：生成前声明素材展示环境（浅色/暗色模式、尺寸容器），浅色底图不得直接用于暗色空状态等错配场景；暗色变体另出或声明适配策略
- **负面词必给**：至少 3 条与素材类型相关的 negative（如图标禁渐变、封面禁错别字、UI 禁占位 Lorem ipsum、IP 禁多手指）
- **`--ref` 场景**：当用 `--ref` 保风格统一时，prompt 只写**变体差异**（表情、动作、场景、构图），不重述基底风格；基底特征在「IP 特征」栏复核 `--ref` 是否到位
- **尺寸/透明**：透明底素材（Logo/IP/图标）写 `--background transparent`；封面按平台规格 `--size`

## 生成前审阅

Prompt 文件写好后，**先自审或交用户审阅**再生成：

- 自审清单：主体唯一？品牌基线已绑 hex？负面词 ≥3？`--ref` 语义正确？尺寸/透明参数对？
- 用户可修改 prompt 文件后再生，避免反复生成浪费
- 生成结果不理想 → 改 `xxx_prompt.md` 后再生成，不在生成后反复改图（改 prompt 是源头修正）

## 验收标准

- [ ] toapis 生成对应素材前，`design/output/prompts/<素材类型>/` 下已有 `<素材名>_prompt.md`（自测/回归产物同理存 `design/regression/<能力域>/`，与真实项目产物分目录，两处都不与生成图混放）
- [ ] Prompt 文件含至少：用途、主体与构图、场景与风格、品牌基线绑定、负面词、toapis 命令
- [ ] 模板中的可选节（如「光线/材质」对扁平图标）缺失时，文件内已标注缺项原因；验收时缺项且有说明 = 通过，缺项无说明 = 不通过
- [ ] 涉及品牌素材时，Prompt 显式引用 hex 与风格语义，无模糊色词
- [ ] 负面词 ≥ 3 条且与素材类型相关
- [ ] Prompt 文件内无流程/回归元信息（文件全文即模型输入）；展示环境（浅/暗色）已声明
- [ ] `--ref` 场景下 Prompt 只写变体差异，可复核基底
- [ ] Prompt 统一存专属目录，与生成图分目录，可审阅可回归

## 边界与不做项

- 本规范只约束**toapis 图像/视频生成的 Prompt 撰写**，不定义具体设计规范（色彩/字体/构图见 `specs/brand`、`specs/icon-system` 等各领域 spec）
- 不负责把 Prompt 翻译成 toapis 命令行参数细节（见 `scripts/toapis.py` 用法），本规范只管 Prompt 内容与流程
- 视频生成（品牌片头等）同样先写 `xxx_prompt.md` 再生成，本规范通用
- 纯代码/HTML 可实现的视觉（SVG 图标、CSS 插画、低保真线框）不走此流程