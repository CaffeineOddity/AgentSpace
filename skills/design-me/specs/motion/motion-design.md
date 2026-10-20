# 动效系统规范

> 本文件是跨端动效设计的唯一事实来源。各端 spec（web/mobile）只补平台差异，动效原则与 Token 体系在此统一定义，消除碎片化重复。交互声音（UI SFX）与动效同属「动态质感」层，一并在此统一定义。

## 设计目标

为 Web、iOS、Android、鸿蒙各端定义统一的动效语言：时长、缓动、编排原则、状态转场、页面转场。核心是「一套动效 Token，各端各实现」--动效语言跨端一致，各端按平台能力适配。

动效的设计目的不是炫技，是**传达因果关系与空间层次**。每个动效须能回答「它在告诉用户什么」--是状态变化、是页面跳转、是内容加载、还是层级展开。无因果的装饰动效是噪音。

交互动效之外，还需保障**视觉档次与声音质感**：动效不是可用功能，也是产品「动态温度」的载体。边看边动、动若有声，才让产品有完成度。本条是完成度的质量闸门，不是可选项。

## 动效原则

| 原则 | 说明 |
|------|------|
| 因果优先 | 动效传达因果关系，非纯装饰。用户须能从动效理解「发生了什么」 |
| 自然物理 | 用物理曲线（弹簧/惯性），不用线性。物体减速比匀速更自然 |
| 层次表达 | 入场从下方/前方 = 更深层级；退场向下方/后方 = 返回浅层 |
| 可中断 | 动效进行中用户操作须立即响应，动画可被中断重置 |
| 不阻塞 | 动效期间 UI 保持可交互，不锁定输入 |
| 降级尊重 | 尊重 `prefers-reduced-motion` / 系统减弱动效设置，降级为淡入淡出 |

## Token 体系

### 时长 Token

| Token | 值 | 用途 |
|-------|----|------|
| duration-instant | 0ms | 即时反馈，无动画（禁用动效降级时使用） |
| duration-fast | 100-150ms | 微交互：按钮按压、开关切换、选中态 |
| duration-normal | 200-300ms | 常规转场：模态展开、列表项展开、抽屉滑出 |
| duration-slow | 300-400ms | 复杂转场：页面切换、多元素编排 |
| duration-slower | 400-500ms | 全屏转场、大型内容替换（上限） |

- 禁超 500ms，超过则用户感知为卡顿
- 退场比入场快约 60-70%（退场是确认已完成的操作，不需拖沓）；**比例与时长 Token 下限冲突时以 Token 下限为准**（如入场 .3s 的 65% 快 = ~105ms，取 duration-fast 区间下限，不追求精确比例）
- 列表错峰入场 30-50ms/项

### 缓动 Token

| Token | 曲线 | 用途 |
|-------|------|------|
| easing-enter | cubic-bezier(0, 0, 0.2, 1) | 入场：元素出现，快速开始缓慢结束 |
| easing-exit | cubic-bezier(0.4, 0, 1, 1) | 退场：元素消失，缓慢开始快速结束 |
| easing-standard | cubic-bezier(0.4, 0, 0.2, 1) | 对称转场：状态切换、模态移动 |
| easing-spring | spring(1, 100, 10, 0) | 物理感交互：拖拽回弹、卡片缩放 |

- 禁用 `linear`，匀速动效不自然
- iOS 优先弹簧曲线（spring physics），Android 用 Material Motion 曲线
- 缓动 Token 各端实现方式不同，但曲线语义一致

**进阶：语义 easing 名映射**（对标专业动效，任意动效须落在这些语义上）

- **`expoOut`**（≈`cubic-bezier(0.16, 1, 0.3, 1)`）—默认主 easing，入场一律 expoOut（比 easeOut 更快起步、更稳停），替代默认的 easeOut
- **`overshoot`**（≈`cubic-bezier(0.34, 1.56, 0.64, 1)` / back.out）—Toggle 切换、按钮弹出、强调交互
- **`spring`**（≈elastic.out）—几何体归位、物理落位、UI 抖弹
- 入场一律 `expoOut`，出场一律 `easeIn`，持续对称运动（鼠标轨迹插值）用 `easeInOut`
- 语义名 → 铜线值一次映射到实现端，spec 只写语义名不散落数值（DRY）
- 越 0 的 easing（anticipation 先反向下探、spring 过冲）**只能用在 transform（y/scale/rotation）**，禁用在 opacity / 颜色（会推出合法范围）

### 属性 Token

| Token | 说明 |
|-------|------|
| property-transform | 只动 transform/opacity，不动 width/height/top/left |
| property-scale | 缩放反馈 0.95-1.05，按压缩小释放回弹 |
| property-translate | 位移用于入场/退场方向表达 |

## 编排规则

### 状态转场

状态变化（hover/active/expanded/collapsed/modal-open）须平滑过渡，不硬切：

- 按压：scale 0.95-1.05 + 透明度变化，duration-fast
- 选中：背景色淡入 + 边框变化，duration-normal
- 展开：高度/透明度 + 子元素错峰入场
- 模态：从触发源 scale+fade 入场，背板 fade 入场

### 页面转场

| 方向 | 动效 | 语义 |
|------|------|------|
| 前进导航 | 从右侧滑入 / 从底部升起 | 进入更深层级 |
| 后退导航 | 向右滑出 / 向下降落 | 返回浅层 |
| 模态弹出 | 从触发源 scale+fade 或从底部升起 | 临时任务层 |
| 模态关闭 | 缩回触发源 或下滑消失 | 返回原位 |
| 内容替换 | 交叉淡入淡出 | 同层内容切换 |

- 前进用 ease-out（快速进入后减速）
- 后退用 ease-in（缓慢开始后加速离开）
- 共享元素转场：前后页面共享的元素做位移动画，保持视觉连续

### 加载动效

| 场景 | 动效 |
|------|------|
| < 300ms | 不显示加载动效（用户感知不到） |
| 300ms-1s | 骨架屏 / 微光闪烁 |
| > 1s | 进度条 / 明确进度指示 |

- 骨架屏形状须与最终内容轮廓一致，减少布局跳动
- 禁用长时间阻塞式转圈（spinner），用骨架屏或渐进式加载

### 滚动与手势

- 拖拽须实时跟随手指，无延迟（手势反馈 = 手势位移）
- 滚动减速用物理惯性曲线
- 下拉刷新：阻尼随下拉距离增大，松手回弹或触发刷新
- 视差效果克制使用，尊重 reduced-motion，不致眩晕

## 进阶编排（对标专业动效）

### Orchestration：编排而非散落各自一闪

- 页面进入的多个元素由**同一条 paused timeline 编排**（`defaults: { ease:"expo.out", duration:0.6 }` + 分元素 stagger），共享一个节奏中心，不是每个元素各自独立闪
- **无框架（纯 CSS/原生 JS）产物的等价判定**：同一场景的入场动画共享一个统一的动画序列与 delay 链（CSS animation + delay 序列 / JS setTimeout 链），一处改动可整体移调节奏，即视为「单条 timeline」；逐元素各写各的 keyframe+独立时长则不合规
- 列表/卡片/行入场用 **30ms stagger**（可 `from:"center"` 向两侧涌现）
- scene 间全屏切换用 `autoAlpha` 交叠 + 位移（cross-fade），**禁用 `display` / 裸 `visibility`** 切换（渲染器禁区，show/hide 用 autoAlpha）
- 连续场景切换的 fade out / fade in 交叉重叠，**禁 >0.3s 的纯空白画面**（观众以为卡住）
- 长段节奏分三层：微交互 0.1-0.3s / UI 过渡 0.3-0.8s / 叙事段 2-10s；单段叙事 ≤10s，关键结果出现前**悬停 0.5s**
- 关键结果**戛然而止 + hold 最后一帧**，禁 fade to black / 渐弱收尾

### 状态变化：一个元素过渡，非两个元素 cross-fade

- 同一元素跨状态用 **Shared Element / FLIP**（如按钮「膨胀」成输入框），不是两个元素交叉淡入淡出
- **FLIP 竞态细则**：源元素自身在过渡中（页面刚返回/列表回位）时，禁止拿瞬时 `getBoundingClientRect` 算起点（运动中值→起点跳变）；改用 `offsetLeft/Top` 布局锚点（不含 transform），并按**中心差**补偿（`transform-origin` 默认 center，topleft 差带 `(源宽-落点宽)/2` 系统偏差）
- **JS 驱动的动效须自带降级**：CSS `@media (prefers-reduced-motion)` 管不到 JS 内联 transition/animation；脚本内动效前须 `matchMedia('(prefers-reduced-motion: reduce)')` 分支直接落位
- **结果性动效防抖**：提交/收藏等带完成态反馈的动作进行中重复触发须忽略（防按钮态卡死、toast/提示重复计时）
- **场景焦点归还**：转场关闭后焦点归还到来源元素（如列表项），键盘用户不落到 body
- 面板/卡片展开用「呼吸式」：前 40% 只拉 width，30% 处起撑 height，内容在壳展开完成后才浮现；勿同时拉宽高
- 焦点切换完整配方：背景减弱（`brightness + saturate + blur(4-8px) + dim`）+ 前景锐化 + 150ms Flash；**blur 才让非焦点真的退到后景**，不只降 opacity
- 展示「过程」而非「魔法结果」：AI 文本用 Chunk Reveal（按词/标点切块、40-120ms）、数据用数字 counter（snap 整数），反「一键魔法」

### Signal 非装饰：克制与信息性

- 动效是 **signal 不是装饰**——只 fade 强调重要的；什么都 fade 则 signal 失效
- 区分**信息性 cue**（P0：打字 / 点击 / 焦点 / Logo reveal，省略有违和）与**装饰性微交互**（P2：hover / 进度 tick / 环境动效，多了会乱）
- 画面内「伪 chrome」装饰（进度条 / 时间码 / 署名条 / 章节计数）属 filler slop，能删则删
- 全片只有一处「120% 精致」，其余恰到好处；到处炫技是廉价信号

## 各端差异补充

动效 Token 在各端的实现差异：

| 维度 | Web | iOS | Android | 鸿蒙 |
|------|-----|-----|---------|------|
| 物理曲线 | CSS transition + cubic-bezier | UIKit spring / SwiftUI spring | Material Motion / spring | 鸿蒙动画框架 |
| reduced-motion | `prefers-reduced-motion` | `UIAccessibility.isReduceMotionEnabled` | `Animator.areAllAnimatorsDisabled()` | 系统减弱动效设置 |
| 页面转场 | View Transition API / 库 | NavigationStack 转场 | Navigation 转场 + Shared Element | 页面路由转场 |
| 手势反馈 | pointer events / touch-action | UIKit手势 / SwiftUI手势 | MotionEvent | 鸿蒙手势 |

- 各端 spec 补充该端特有的动效实现要点，但时长/缓动/原则引用本 spec
- 禁在各端 spec 中重新定义时长范围或缓动曲线（DRY）

## 交互声音质感（UI SFX）

声音是「动态质感」的另一半。无声的高保真原型在 demo 场景下会被感知为廉价。声音用于**加强因果关系**（与动效同责）：操作要有可辨识的听觉反馈，但要克制、可关。

### 声音原则

| 原则 | 说明 |
|------|------|
| 因果优先 | 声音反馈操作结果（点击/成功/错误/完成），不是背景音乐 |
| 克制 | 高频交互（hover）不加音，只有结果性动作（提交/切换/成功/错误）才出声 |
| 频段隔离 | 反馈声在中高频，柔和不刺耳；低频与 BGM 冲突则去 BGM 或错开 |
| 可关 | 提供静音开关，尊重系统静音/音量 |
| 与动效同步 | 声音节奏与动效时长一致（如 150ms 反馈声配 duration-fast 按压缩放） |

### 交互声音清单（按触发动作，非按页面）

| 动作 | 声音类型 | 时长 | 说明 |
|------|---------|------|------|
| 按钮按压 | 短促低频 click | 80-150ms | 反馈「按下了」，配 scale 0.95 释放回弹 |
| 开关切换 | 中频 toggle | 150-200ms | 明确的开/关切换 |
| 列表/选项选中 | 高频 pop | 100-150ms | 轻快的「选中了」 |
| 模态/弹窗打开 | 短 whoosh | 200-300ms | 配模态 scale+fade 入场 |
| 提交成功 | 上行和弦 chime | 400-600ms | 明确「完成」的意思 |
| 操作错误 | 低频 error 音 | 200-400ms | 只能用于错误打断，不可滥用 |
| 通知/提醒 | 中频 notification pop | 200-300ms | 新消息到达 |

- 声音都是**短促、一次性的结果反馈**，不是循环 BGM/音频流
- 音量从低起，不霸占操作系统音量级别
- 同类动作全站统一一个声音，禁止每个页面各自发明
- **SFX 密度按性格**：发布/信息密集类约 6-9 个/10s，工具/专注类 0-3 个/10s；交付前删 30-50% 冗余 cue（克制）
- **时钟对齐**：优先排 SFX 时间轴，视觉再适配 SFX 节奏，避免对不齐违和（±1 帧）
- **一处素材库全站统一**：音源统一放 `design/output/assets/sfx/`，SFX 按语义分类集中复用同套素材库，禁止每页各自发明（命名按触发动作，见清单）
- SFX 与 BGM 双轨时各自由频段隔离（SFX 高频 / BGM 中低频），本 spec 只承担结果性 SFX

### 声音 Token

```
sound-duration-click: 100ms
sound-duration-toggle: 180ms
sound-duration-pop: 120ms
sound-duration-modal: 250ms
sound-duration-success: 500ms
sound-duration-error: 300ms
sound-duration-notify: 250ms
```

- 声音时长与对应动效 Token 配对（`duration-fast`↔click/toggle/pop，`duration-normal`↔modal，`duration-slow`↔success）
- 音源统一放 `design/output/assets/sfx/<category>/`，命名按动作语义（`/ui/click.mp3`, `/feedback/success.mp3`），不按页码

### 实现要点

- HTML 高保真原型用 `<audio>` + WebAudio 播放预制 `.mp3`；浏览器自动播放策略下，**首次用户交互（任意 click/keydown）后解锁 AudioContext**，解锁前的结果性反馈静默跳过（不报错），解锁后自动恢复
- 音源缺失/解码失败的兜底：播放失败静默跳过该 cue，不让 JS 报错拖垮交互（`pageerror` 硬闸门优先于声音）；交付前无音源时明说「声音待补」而非假装已实现。**无音源单文件原型可用 WebAudio 合成短音作占位，但须在产物中显式标注「合成占位，正式音源待补」**——显式标注不算假装已实现，无标注的合成音才算
- 每个人都可关：全局静音开关（默认关即开），关闭后不播放任何反馈音
- 尊重系统减弱/静音设置；无声设备自动跳过，不报错

## 验收标准

逐条打勾；**按产物形态分组判定**：A 组通用必查；B 组仅 deck/叙事场景产物适用；C 组仅含 AI 文本/数据展示的产物适用。不适用组标 `N/A（<场景>）`，禁硬勾也禁漏记。

**A 组 · 通用 UI 原型必查**
- [ ] 时长 Token 已定义（fast/normal/slow），禁超 500ms
- [ ] 退场比入场快 60-70%
- [ ] 缓动 Token 已定义，禁用 linear
- [ ] 只动 transform/opacity，不动 width/height
- [ ] 入场用 ease-out（expoOut），退场用 ease-in
- [ ] 列表错峰 30-50ms/项
- [ ] 尊重 reduced-motion，降级为淡入淡出
- [ ] 动效可中断，不阻塞输入
- [ ] 加载 > 300ms 用骨架屏，禁长时间 spinner
- [ ] 页面转场方向与导航层级语义一致
- [ ] 每个动效能回答「它告诉用户什么」
- [ ] 结果性动作（提交/切换/成功/错误/弹窗）有对应 UI 声音，且与动效时长配对
- [ ] 高频交互（hover）不加音，只有结果性动作出声
- [ ] 声音短促一次性，非循环 BGM
- [ ] 提供静音开关（页面内可操作控件），尊重系统静音/减弱设置
- [ ] page load 由单条 timeline orchestrated（无框架等价写法适用），含 30-50ms stagger
- [ ] 场景切换 autoAlpha 交叠，无 >0.3s 空白；非 PowerPoint 逐屏硬切
- [ ] 音频解锁：AudioContext 在首次用户交互后解锁，解锁前静默跳过；音源缺失/播放失败静默兜底不产生 JS 报错
- [ ] SFX 密度符合性格（发布 6-9 vs 工具 0-3 /10s），一处素材库全站统一

**B 组 · deck/叙事场景适用**
- [ ] hero/锚点元素跨片段持续
- [ ] 焦点切换含 blur（不只 opacity）
- [ ] 关键结果戛然而止 + hold 末帧，长段节奏三层（微 0.1-0.3 / UI 0.3-0.8 / 叙事 2-10s）

**C 组 · AI 文本/数据展示适用**
- [ ] 状态变化用 Shared Element，非两元素 cross-fade（通用 UI 中涉及时也查）
- [ ] AI 文字非逐字蹦（Chunk Reveal 40-120ms）、数字非匀速 setInterval（counter snap）

## 边界与不做项

- 不定义品牌视觉（色彩/字体见 `specs/brand`）
- 不定义 Token 架构与组件（见 `specs/design-system`，动效 Token 归属设计系统）
- 各端平台特有动效实现（如 iOS 转场 API、Android Shared Element）由各端 spec 补充
- 动效代码实现由开发负责，本规范止于动效设计
- **声音只做「结果性交互反馈」**，不定义背景音乐/电影配乐编排（那是内容生产场景，见 `specs/media` 音频管线，不在本规范内）；本规范不承担 BGM、解说、音效设计脚本等叙事型音频，也不承接 BGM lowpass/amix 工程、Slow-Fast-Boom-Stop 叙事配比、decks 逐屏模型——BGM/叙事音频与 decks 链保持不迁移
