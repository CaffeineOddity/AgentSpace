# iOS 设计规范（Apple HIG）

> 本文件是 iOS 平台设计的深潜参考。跨端共用部分见 `specs/mobile/mobile-design.md`，品牌基线见 `specs/brand`。读 `mobile-design.md` 时按目标平台路由到本文件。

## 设计目标

遵循 Apple Human Interface Guidelines，产出感觉「像原生 iOS 应用」的界面。iOS 设计三原则：

- **Clarity（清晰）**：文字可读、图标精确、动效有目的
- **Deference（顺从）**：内容优先，UI 让位于内容，不喧宾夺主
- **Depth（层次）**：用层级、光影、动效传达位置与关系

## 设计语言要点

### 导航结构

| 模式 | 用途 |
|------|------|
| Tab Bar | 顶层导航，底部固定，≤ 5 项，图标 + 文字 |
| Navigation Bar | 页面内层级，顶部，左返回右操作 |
| Sheet | 模态临时任务，下拉关闭，不遮挡主路径 |
| Full-screen modal | 全屏模态，沉浸式任务 |
| Split View | iPad 横屏分栏导航 |

- Tab Bar 仅用于顶层页面，不嵌套子导航
- 返回滑动（swipe-back）须可用且不与内容手势冲突
- 模态优先用 Sheet（非全屏），降低用户迷失感

### 排版系统（Dynamic Type）

使用 iOS 系统字阶，支持 Dynamic Type 自适应缩放：

| 角色 | 用途 |
|------|------|
| Large Title | 页面主标题，大字号滚动时缩为标准 |
| Title 1-3 | 标题层级 |
| Headline | 列表项标题 |
| Body | 正文 |
| Callout / Subhead / Footnote | 辅助文本 |
| Caption | 图片/表单说明 |

- 字体用 SF Pro（系统默认）或品牌定制字体
- 不硬编码字号，用 text style 让系统按 Dynamic Type 缩放
- 正文最小 16pt，正文截断优先换行，用省略号时提供 tooltip/展开
- 数字/价格/计时用 tabular figures

### 色彩与主题

- 使用系统语义色（systemBlue / systemBackground / label 等），自动适配暗色模式
- 品牌色注入时定义语义 Token，映射到 system 色槽
- 暗色模式：降饱和、提亮度，不直接反色，独立验证对比度
- 功能色（error/success）配 SF Symbol 图标，不仅靠颜色

### 触控与手势

- 触控目标 ≥ 44×44pt，图标小于此值用 hitSlop 扩大命中区
- 间距 ≥ 8pt
- 优先系统标准手势：swipe-back、双指缩放、长按
- 不阻挡系统手势（控制中心、通知中心下拉、边缘滑动返回）
- 按压反馈 100ms 内出现（透明度/阴影/缩放）
- 触觉反馈：确认用 light、重要操作用 medium、警告用 heavy，不过度
- 关键操作提供可见控件，不依赖手势

### 控件与组件

优先用系统原生控件，仅在品牌需要时定制：

- **Button**：plain / gray / tinted / filled 四种样式按强调层级选用
- **List**：inset / inset grouped / plain 按信息密度选用
- **Navigation Bar**：大标题滚动缩小、底部工具栏
- **TabView**：底部 Tab Bar 或顶部 Page Style
- **Sheet**：detents（medium / large）、可下拉关闭
- **Alert**：系统样式，按钮 ≤ 3，危险操作红色
- **Toggle / Slider / Stepper**：系统样式，不自绘

### 模态与层级

- Sheet detents：medium（半屏）用于轻量任务，large（全屏）用于复杂任务
- 模态须有明确关闭入口 + 下滑关闭手势
- 模态中有未保存改动时，关闭须确认
- 模态不用于主导航流程

### 无障碍

- VoiceOver：accessibilityLabel / accessibilityHint，阅读顺序与视觉顺序一致
- Dynamic Type：最大字号下布局不破
- Reduce Motion：动画降级为淡入淡出
- Reduce Transparency：模糊降级为纯色
- Voice Control：所有交互元素有无障碍标签
- 对比度：正文 ≥ 4.5:1，大字 ≥ 3:1

## 资源规格

### App 图标

主文件 1024×1024px PNG，裁切为以下尺寸：

| 用途 | 尺寸 |
|------|------|
| App Store | 1024×1024 |
| iPhone | 20pt @2x/@3x、29pt @2x/@3x、40pt @2x/@3x、60pt @2x/@3x |
| iPad | 20pt @1x/@2x、29pt @1x/@2x、40pt @1x/@2x、76pt @1x/@2x、83.5pt @2x |
| Settings | 29pt @2x/@3x |
| Notification | 20pt @2x/@3x |

- 图标圆角由系统裁切，设计稿提交方形
- 安全区：核心元素内缩，避开圆角裁切
- 不含透明背景（Alpha 通道），用纯色填充

### 启动图（Launch Screen）

| 设备 | 尺寸 |
|------|------|
| iPhone SE | 640×1136 |
| iPhone 8 | 750×1334 |
| iPhone X/11 Pro | 1125×2436 |
| iPhone 11/12/13 | 1242×2688 |
| iPad 10.2 | 1620×2160 |
| iPad Pro 12.9 | 2048×2732 |

- 用 Launch Screen Storyboard（已废弃静态启动图），定义一个简洁布局
- 背景非纯白/黑，传达品牌识别
- 不含大量文字，不误导为系统界面

## 验收标准

- [ ] Tab Bar ≤ 5 项，图标 + 文字
- [ ] 触控目标 ≥ 44pt，间距 ≥ 8pt
- [ ] 使用 Dynamic Type text style，非硬编码字号
- [ ] 暗色模式独立验证对比度通过
- [ ] 系统手势不被阻挡（swipe-back / 控制中心）
- [ ] 模态有关闭入口 + 下滑关闭
- [ ] VoiceOver 标签完整，阅读顺序正确
- [ ] Reduce Motion / Reduce Transparency 动效降级正常
- [ ] App 图标覆盖所有尺寸，无透明背景
- [ ] 启动图用 Storyboard，背景非纯色

## 边界与不做项

- 不负责 Android/Material 规范（见 `specs/mobile/android.md`）
- 不负责鸿蒙规范（见 `specs/mobile/harmony.md`）
- 动效原则与 Token 见 `specs/motion/motion-design.md`，本文件仅补充 iOS 平台差异
- 品牌视觉基线见 `specs/brand`，本文件仅定义 iOS 平台适配
- 代码实现（SwiftUI/UIKit）由开发负责，本规范止于设计交付
