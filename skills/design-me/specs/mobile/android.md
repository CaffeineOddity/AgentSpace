# Android 设计规范（Material Design 3）

> 本文件是 Android 平台设计的深潜参考。跨端共用部分见 `specs/mobile/mobile-design.md`，品牌基线见 `specs/brand`。读 `mobile-design.md` 时按目标平台路由到本文件。

## 设计目标

遵循 Material Design 3（Material You），产出感觉「像原生 Android 应用」的界面。Material 3 核心理念：

- **Expressive（表达力）**：色彩、形状、动效有情感张力，不冰冷
- **Adaptive（自适应）**：从手机到折叠屏到大屏，布局自动适配
- **Personal（个性化）**：动态取色让每个用户的界面因壁纸而独特

## 设计语言要点

### 导航结构

| 模式 | 屏幕宽度 | 用途 |
|------|---------|------|
| Bottom Navigation | < 600dp | 手机顶层导航，≤ 5 项 |
| Navigation Rail | 600-840dp | 折叠屏/小平板，左侧竖向导航 |
| Navigation Drawer | ≥ 840dp | 平板/桌面，展开式侧栏 |
| Top App Bar | 全尺寸 | 页面内标题 + 操作 |
| Bottom Sheet | 全尺寸 | 模态临时任务，可下拉关闭 |

- 底部导航 ≤ 5 项，图标 + 文字
- 大屏（≥ 600dp）优先 Navigation Rail / Drawer，底部导航退场
- 顶层导航用底部导航或 Navigation Rail，二级用 Drawer
- 返回行为支持 Predictive Back Gesture（Android 14+），有动画预览
- 深度链接可达所有关键页面

### 排版系统（Type Scale）

Material 3 字阶，按角色而非场景命名：

| 角色 | 用途 |
|------|------|
| Display (Large/Medium/Small) | 超大标题，英雄区 |
| Headline (Large/Medium/Small) | 页面标题 |
| Title (Large/Medium/Small) | 区块标题 |
| Body (Large/Medium/Small) | 正文 |
| Label (Large/Medium/Small) | 按钮、标签、说明 |

- 不硬编码字号，用 type role 让主题缩放
- 正文字号 ≥ 16sp，行高 1.5-1.75
- 标题用 weight 600-700，正文 400，标签 500
- 数字/价格/计时用 tabular figures

### 色彩与主题

Material 3 色彩角色系统，自动适配暗色模式：

| 角色 | 用途 |
|------|------|
| Primary | 主操作、选中态 |
| On Primary | Primary 上的文字/图标 |
| Primary Container | 选中态容器背景 |
| Secondary / Tertiary | 辅助强调 |
| Surface / On Surface | 卡片背景与文字 |
| Background / On Background | 页面背景与文字 |
| Error / On Error | 错误状态 |

- 品牌色注入到 Primary 槽，系统自动衍生 Container 变体
- 支持 Dynamic Color（Material You），从壁纸取色生成主题
- 暗色模式：Surface 降饱和提亮度，不反色，独立验证对比度
- 功能色配图标，不仅靠颜色

### 触控与手势

- 触控目标 ≥ 48×48dp，图标小于此值用最小触控区扩大命中
- 间距 ≥ 8dp
- State Layers（状态层）：hover 8% / focus 12% / pressed 12% 叠加色
- 不依赖 hover（移动端无 hover），主交互用点击
- 支持 Predictive Back Gesture，返回有动画预览
- 不重定义系统手势（返回、分屏、通知下拉）
- 按压反馈用涟漪（Ripple）或状态层，100ms 内出现
- 触觉反馈：确认用 light、重要操作用 medium，不过度

### 组件

优先用 Material Components，按 Material 3 规范定制：

- **Button**：Filled / Tonal / Outlined / Text 按强调层级选用
- **Card**：Filled / Outlined / Elevated 三种变体
- **Chip**：Assist / Filter / Input / Suggestion
- **Navigation Bar / Rail / Drawer**：按屏宽自适应切换
- **Floating Action Button (FAB)**：每页一个主操作，Standard / Extended / Small
- **Search**：Search Bar + Search View，持久搜索入口
- **Slider / Switch**：系统样式，不自绘
- **Dialog**：基础对话框 / 全屏对话框，危险操作用 error 色

### 自适应布局

- 窗口大小类（Compact / Medium / Expanded）决定布局策略
- 折叠屏：内屏单列，外屏双列，铰链处避免可交互元素
- 大屏：可多用 List-Detail 双栏，减少层级跳转
- 内容自适应：文字宽度限制（max-width），不撑满大屏

### 无障碍

- TalkBack：contentDescription，阅读顺序与视觉顺序一致
- 文字缩放：最大字号下布局不破
- Reduce Motion：动画降级
- 高对比度主题：系统可切换，验证对比度
- 对比度：正文 ≥ 4.5:1，大字 ≥ 3:1

## 资源规格

### 自适应图标（Adaptive Icon）

前景 + 背景双层，108×108dp 渲染区（432×432px @xxxhdpi）：

| 层 | 用途 |
|----|------|
| 前景 | 品牌图形，占 66% 安全区 |
| 背景 | 纯色或品牌底图，铺满 |

密度目录全覆盖：

| 密度 | 前缀 | 渲染尺寸 |
|------|------|---------|
| mdpi | @1x | 108×108px |
| hdpi | @1.5x | 162×162px |
| xhdpi | @2x | 216×216px |
| xxhdpi | @3x | 324×324px |
| xxxhdpi | @4x | 432×432px |

- 前景须考虑安全区，系统按不同形状（圆/方/泪滴）裁切
- 提供 monochrome 版本用于主题着色

### 启动图（Splash Screen）

- 用 SplashScreen API（Android 12+），主题背景图已废弃
- 图标居中，底部可选品牌图
- 背景用品牌色，图标用自适应图标前景
- 防拉伸：图标固定尺寸，背景自适应
- 低端机保留旧 theme-splash 兼容

## 验收标准

- [ ] 底部导航 ≤ 5 项，图标 + 文字
- [ ] 触控目标 ≥ 48dp，间距 ≥ 8dp
- [ ] 状态层（hover/focus/pressed）已实现
- [ ] 大屏（≥ 600dp）切换到 Navigation Rail / Drawer
- [ ] 支持 Predictive Back Gesture
- [ ] 暗色模式独立验证对比度通过
- [ ] 色彩角色（Primary/Container/Surface）已定义，无裸 hex
- [ ] TalkBack contentDescription 完整
- [ ] 自适应图标前景 + 背景 + monochrome 齐全
- [ ] 启动图用 SplashScreen API，背景用品牌色
- [ ] 折叠屏铰链处无可交互元素

## 边界与不做项

- 不负责 iOS/Apple HIG 规范（见 `specs/mobile/ios.md`）
- 不负责鸿蒙规范（见 `specs/mobile/harmony.md`）
- 动效原则与 Token 见 `specs/motion/motion-design.md`，本文件仅补充 Android 平台差异
- 品牌视觉基线见 `specs/brand`，本文件仅定义 Android 平台适配
- 代码实现（Jetpack Compose / XML）由开发负责，本规范止于设计交付
