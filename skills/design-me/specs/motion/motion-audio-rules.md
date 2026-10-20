# Design-me Phase 4 高保真对齐细则 · 动效质感 + 声音质感

> 专业动效与声音质感的进阶细则，作为 phase 4「动效质感 / 声音质感」维度的详细来源与速查行。逐条可作 spec 的「禁止/必须/考虑」行。

---

## 1. 运动语言

**Easing 映射（spec 写语义名，实现层落铜线值）**
- 必须：spec 里用语义 easing 名（`expoOut` / `overshoot` / `spring` / `easeIn` / `easeInOut`），实现端一次映射到铜线值，不在 spec 里散落数值。
- 必须：默认主 easing 用 **`expoOut`**（≈`cubic-bezier(0.16, 1, 0.3, 1)` / CSS `1-2^(-10t)`），不是 `easeOut` 也不是 `linear`。
- 必须：`overshoot`（≈`back.out`，`cubic-bezier(0.34, 1.56, 0.64, 1)`）用于 Toggle 切换、按钮弹出、强调交互。
- 必须：`spring`（≈`elastic.out(1, 0.3)`）用于几何体归位、物理落位、UI 抖弹。
- 必须：入场一律 `expoOut`，出场一律 `easeIn`，持续对称运动（鼠标轨迹插值）用 `easeInOut`。
- 禁止：元素动效上用 `linear`（`linear` 让数字元素像机器）；`linear`/`ease:none` 只允许相机匀速 pan 或 proxy 驱动。
- 禁止：`transition: all 0.3s ease` / `cubic easeOut(1-(1-t)³)`——不够锐，起步不够快、停顿不够稳。

**节奏层级**
- 必须：节奏分三层——微交互 0.1–0.3s（按钮 hover / 卡片 expand / tooltip）、UI 过渡 0.3–0.8s（页面切换 / 模态 / 列表项加入）、叙事段 2–10s（概念解释一段 / 图表 reveal / 场景转换）。
- 必须：单段叙事动画最长 ≤10s；10 秒只讲一件事，讲完换下一件。
- 必须：长动画按 **Slow–Fast–Boom–Stop** 五段配比（15/15/40/20/10%）；自检画 5 个 thumbnail，每段高潮差异大才算做出来。
- 必须：关键结果出现前**悬停 0.5s**（礼让观众反应时间），禁 AI 生成完无缝切结果。
- 禁止：均匀节奏（每秒信息密度一样，观众疲劳）；禁止持续高密度（无峰值无记忆点）。

**一次 orchestrated 的 page load 怎么做**
- 必须：page load 的所有进入元素由**同一条 paused timeline 编排**（`defaults: { ease:"expo.out", duration:0.6 }` + 分元素 stagger），共享一个节奏中心，而非每个元素各自独立一闪。
- 必须：列表/卡片/行入场用 **30ms stagger**（`stagger: 0.03`，可 `from:"center"` 向两侧涌现）。
- 必须：规模感展开用**按距离延迟**（Ripple：`delay = (dist/maxDist)*0.8s`，中心最早、角落最晚，总 1.7s，配 canvas 同步 zoom-out 推远）。
- 必须：scene 间全屏切换用 `autoAlpha` 交叠 + 位移（cross-fade），**禁用 `display` / 裸 `visibility`** 切换（渲染器禁区，show/hide 用 autoAlpha）。
- 必须：连续场景切换的 fade out / fade in 交叉重叠，**禁止 >0.3s 的纯空白画面**（观众以为卡住）。
- 考虑：跨场景用一个「锚点元素」（如主句 / hero 元素）作为视觉连接，切换期间短暂回显。

**禁止 PowerPoint 式逐屏切换**
- 禁止：PowerPoint 式动画 / 逐屏硬切 / 一整块 fade in-out / 每元素同速。
- 禁止：所有入场只 `opacity 0→1`（无方向感）——必须配 `translateY/scale` + Anticipation。
- 禁止：fade to black / 渐弱收尾——落幅应**戛然而止 + hold 最后一帧**，清晰、肯定、有决定感。

---

## 2. 动效语义与叙事

**hero element 跨状态 / 跨片段持续存在**
- 必须：hero 元素作为全程持续存在的锚点，跨状态 / 片段复用同一个元素过渡，不因 scene 切换而割裂消失。
- 必须：聚焦/凝视类叙事用「规模（Ripple）→ 凝视（Multi-Focus ×4，每次 1.7s 间隔 0.6s）→ 淡出」的三拍情绪弧线，表达 Breadth×Depth。

**元素是状态变化而非割裂**
- 必须：同一元素在两种状态间过渡（Shared Element / FLIP，如按钮「膨胀」成输入框），**不是两个元素 cross-fade**。
- 必须：面板/卡片展开用「呼吸式」——前 40% 只拉 width，30% 处起撑 height（先展开再注水），内容在壳展开完成后才浮现；不要同时拉宽高。
- 必须：跨 scene 复用的画面内元素（chapter 标签 / scene 编号 / 时间码 / 水印）**禁止硬编码颜色**，用 `currentColor` / `invert` prop / 基于底色自动对比，保证每幕可见。
- 禁止：焦点切换只降 opacity——完整配方是「背景减弱（brightness + saturate + **blur(4-8px)** + dim）+ 前景锐化 + 150ms Flash 引导」；blur 才让非焦点真的「退到后景」。
- 必须：展示「过程」而非「魔法结果」——AI 文本用 Chunk Reveal（按词/标点切块、不规律 40–120ms），数据用数字 counter（snap 整数），展示 tweak / 报错修复 / 红红绿绿，反「一键魔法」AI slop。

**morph 而非切**
- 必须：Logo / 品牌收尾用**形变收束（Morph / Converge / 坍缩-展开）**，不是淡入：前元素 scale→0.1 + blur→6px 坍缩成色块 → 色块膨胀成 wordmark，150ms 快切 + motion blur 过渡。
- 必须：品牌 wordmark 收束可用**字重渐变**（font-variation-settings Thin→Bold，0.9s）+ letter-spacing 微调，比放大缩小更电影感（需 variable font）。

---

## 3. 动效陷阱清单

**装饰性微交互 vs 信息性**
- 必须：动画是 **signal 不是装饰**——只 fade 强调「这里重要」的元素；什么都 fade 则 signal 失效。
- 必须：区分信息性 cue（P0：打字、点击/选择、焦点切换、Logo reveal——省略有违和感）与装饰性微交互（P2：hover / focus-in / 进度 tick / 装饰 ambient——多了会乱）。
- 禁止：画面内出现「伪 chrome」装饰（进度条 / 时间码 / 底部署名条 / 章节计数）撞车 Stage scrubber；凡既不属于任一幕、又不是真 chrome 的元素一律删（filler slop）。

**每屏都 fade-up 的坑**
- 必须：不要每屏都无差别 fade-up——无方向感、无记忆点；用 Anticipation + 位移 + 差异化 stagger。
- 必须：克制——全片只有一处「120% 精致」，其余 80% 恰到好处；到处炫技是廉价信号。

**时长 / 缓动越界**
- 禁止：`>0.3s` 的场景间纯空白；`transition: all`（所有元素同速）；元素动效用 `linear`。
- 必须：跨越 0 的 easing（anticipation 先反向下探、spring 过冲）**只能用在 transform（y/scale/rotation）**，禁止用在 opacity / 颜色（会推出合法范围）。
- 必须：blur 大面积元素半径 ≤24px，优先「dim + 适度 blur」而非拉满，`will-change:filter` 只加在真动 blur 的元素上。
- 禁止：渲染路径上用 CSS `transition` + class 切换（走墙钟、seek 不确定）——状态变化一律写成 `tween/l` 的纯函数。

**物理感**
- 必须：元素按三段走 **Anticipation → Action → Follow-through**（预备缩小 → 主动过冲 → spring 回弹落定）；只有 Action 没有预备+跟随 = PowerPoint 动画。
- 必须：入场落位追求「**落**」得稳而非「停」在那里——expoOut 前 30% 冲 90% 的阻尼感，模拟有重量/惯性的物体。
- 必须：动画是物理学不是曲线——每选一条 easing 都是在回答「这个元素多重、摩擦多大」。
- 考虑：鼠标/movement 轨迹用弧线（贝塞尔）+ 叠加手抖（两条不可通约频率正弦），不用直线插值（潜意识机器感）。

---

## 4. 声音 · SFX 设计

**SFX 密度配比**
- 必须：按产品性格定密度——**发布/信息密集类 ~6–9 个 /10s**（SFX 驱动节奏）；**工具/专注类 0–3 个 /10s 甚至 0**（纯 BGM + 决定性时刻）；办公/生产力平衡类 ~4 个 /10s。
- 必须：不要填满每个视觉 beat——删掉 30–50% 的 cue 会让剩下的更有戏剧性；留白比密集高级。
- 考虑：工具类可走「0 SFX + 纯 Lo-fi BGM」，让 UI 动作踩 BGM 的 kick/snare 瞬态——「音乐律动即交互音效」。

**频段隔离 / 横幅**
- 必须：**SFX 推高频（highpass 800Hz+），BGM 压中低频（lowpass 4kHz）**，两轨频谱各占一方（P1 硬优化）。
- 必须：为何——人耳对 2–5kHz（presence 频段）最敏感，SFX 若被 BGM 全频覆盖会被遮盖；频段分层让 SFX 清晰度上一档。
- 必须：SFX 主轨音量 1.0、BGM 0.40–0.50；**响度差 SFX peak − BGM peak = −6 到 −8 dB**（靠差突出，不靠 SFX 绝对响度）。
- 必须：`amix … normalize=0`（保留动态范围，绝不 `normalize=1` 压平）。
- 必须：同一时间点并发 SFX ≤2 个（BGM<0.3 时可到 3）；品牌 impact 时清空其他 SFX（留 0.2s 再落点）。

---

## 5. 声音 · 清单与命名

**按触发动作的声音类型（九类 / 37 个预制）**
- 必须：SFX 按触发动作分类命名 `<category>/<name>.mp3`：`keyboard/`（type, enter, delete-key…）、`ui/`（click, focus, toggle…）、`transition/`（whoosh, slide-in, dissolve…）、`container/`（card-snap, modal-open…）、`feedback/`（success-chime, error-tone, notification-pop, achievement…）、`progress/`（loading-tick, complete-done…）、`impact/`（logo-reveal-v2 1.5s, brand-stamp…）、`magic/`（sparkle, ai-process, transform…）、`terminal/`（command-execute, output-appear…）。
- 必须：选型按动作语义走决策树——tactile 动作→keyboard/ui；进场出场→transition；容器层→container；状态反馈→feedback；进度/时间→progress；品牌落点→impact；AI 变换→magic；命令行/代码→terminal。

**短促一次性的结果反馈**
- 必须：SFX 短促一次性——单条 0.5–1.5s（一般 ≤0.5s），相邻 cue 间隔 ≥0.2s，禁止 cue 过密导致重叠成糊（只有 Logo impact 可 1.5s 长尾）。
- 必须：结果反馈用一次性短音——成功 `success-chime(1.0s)` / `complete-done(0.8s)`、失败 `error-tone(0.7s)`、通知 `notification-pop(0.6s)`、AI 完成 `sparkle` → `complete-done`。
- 必须：时间戳对齐——点击/焦点/Logo 落定**同帧（0ms）**；快速 whoosh **前置 1–2 帧（−33ms）** 给心理预期；物体落地/impact **后置 1–2 帧（+33ms）** 符合物理。

**全站统一**
- 必须：全站 / 整个 hero 复用同一套 SFX 库（37 个），声音语言统一，禁止换片子混搭风格；同套音色贯穿 terminal 提示、卡片选中、cursor、品牌落点等所有视觉锚点。
- 必须：SFX 音色与视觉风格匹配——暖米/纸感→木质柔和（paper snap, soft click）；冷黑科技→金属数字（beep, pulse）；手绘童趣→卡通夸张（boing, pop, zap）。

---

## 6. 声音 · BGM 与 SFX 双轨制

**为什么只做一项是「1/3 完成度」**
- 必须：动画音频**必须分两层独立设计**——SFX（节拍层，0.2–2s 短促，帧级强同步视觉 beat）+ BGM（氛围底，连续 20–60s，段落级弱同步情绪铺底）。
- 必须：**只做 BGM 的动画是残废的**——观众潜意识感知「画在动但没音效响应」，这是廉价感根源；缺 SFX = 节奏层缺失，缺 BGM = 氛围层缺失，两层缺一都不是完整设计。
- 必须：**两个单层各自听都要自洽**——关 BGM 只听 SFX 要有节奏感、关 SFX 只听 BGM 要有情绪起伏；「只有两层叠加一起才好听」= 没做好。
- 必须：完整度 = 视觉 + SFX + BGM 三角协同（Slow-Fast-Boom-Stop 节奏 / SFX 密度 / BGM 情绪三者一一对应）。

**何时该有 / 何时无 BGM**
- 必须：动画定长含 motion capture 阶段就配音频；可选无 BGM 的场景——时长 <10s（BGM 建立不起来）、产品性格「专注/冥想」、场景自带环境音/讲解声、SFX 密度已很高（避免听觉过载）。
- 必须：BGM fade-in 0.3s、fade-out `N−1.5→1.5s` 长尾（避免硬切/突然断）；SFX 自带 envelope 不需额外 fade。
- 考虑：工具/冥想类可走纯 Lo-fi BGM + 0 SFX（也很高级）；纯氛围长镜头可「无 BGM + 3–5 个精心 cue」——每个 SFX 都是主角。

**静音 / 系统尊重**
- 必须：尊重平台自动静音——公众号 mp4 常 mute auto-play，属正常，用户点开才有声，不必视为错误；GIF 本就无声。
- 考虑：优先 SFX 时间轴驱动视觉对齐（SFX 每个 cue 是「钟表 tick」优先做），再让视觉适配 SFX 节奏；避免视觉先定、SFX 后追导致的 ±1 帧对不齐违和。

---

### 速查（直接可用为验收行）
- [ ] 主 easing = expoOut，非 easeOut / linear
- [ ] page load 由单条 paused timeline orchestrated，含 30ms stagger 或距离延迟
- [ ] 场景切换 autoAlpha 交叠，无 >0.3s 空白；禁止 PowerPoint 逐屏硬切
- [ ] hero / 锚点元素跨片段持续；状态变化用 Shared Element，非两元素 cross-fade
- [ ] Logo 用 morph 收束，非淡入；收尾戛然而止，无 fade to black
- [ ] 焦点切换含 blur（不只 opacity）；文字非逐字蹦、数字非匀速 setInterval
- [ ] SFX 密度符合性格（发布 6–9 vs 工具 0–3 /10s），删 30–50% cue
- [ ] BGM lowpass 4kHz + SFX highpass 800Hz；响度差 −6~−8dB；amix normalize=0
- [ ] SFX 按九类命名、一处素材库全站统一；结果反馈一次性短促音
- [ ] SFX 与 BGM 双轨各自单听均自洽（视觉+SFX+BGM 三角齐备）