# iOS 图标实现

> 本文件是 iOS 端图标实现的深潜参考。跨端设计基线见 `specs/icon-system/icon-system-design.md`，Apple HIG 见 `specs/mobile/ios.md`。

## 设计目标

在 iOS 环境中以最佳方式渲染图标系统。iOS 的核心选择是「用 SF Symbols（系统原生）还是自定义图标」，二者有明确的适用场景。

## SF Symbols（系统图标优先）

Apple 提供的 SF Symbols 是一套 5000+ 图标库，覆盖常见功能图标。优先使用 SF Symbols：

- 优点：系统原生、自动适配 Dynamic Type、支持多语言、免费、暗色模式自动跟随
- 缺点：仅限 Apple 生态、风格受 Apple 约束
- 适用：标准功能图标（搜索/分享/编辑/设置等常见操作）

```swift
// SwiftUI
Image(systemName: "magnifyingglass")
    .font(.system(size: 24))
    .foregroundStyle(.primary)

// UIKit
let config = UIImage.SymbolConfiguration(pointSize: 24, weight: .regular)
let image = UIImage(systemName: "magnifyingglass", withConfiguration: config)
```

### SF Symbols 使用规则

- 用语义名（`magnifyingglass`）不用编号（`magnifyingglass.fill` 要看场景）
- 选中态用 `.fill` 变体：`magnifyingglass` -> `magnifyingglass.fill`
- 字重用 Symbol Configuration（`.ultralight` ~ `.black`），不改 SF Symbol 本体
- 颜色用 `.foregroundStyle()` / `tintColor`，不用多色渲染模式（除非需要多色）
- 支持 Dynamic Type：用 `.font(.system(size:))` 或 Symbol Configuration 而非硬编码 frame

## 自定义图标

SF Symbols 不覆盖的图标（品牌专属功能、行业特殊图标）须自定义：

### Asset Catalog 管理

自定义图标放在 Asset Catalog（`.xcassets`）中：

```
Assets.xcassets/
├── ic_action_search.imageset/
│   ├── ic_action_search.svg        ← 单 SVG（iOS 13+ 支持 SVG）
│   └── Contents.json
├── ic_nav_home.imageset/
│   ├── ic_nav_home.svg
│   └── Contents.json
```

- iOS 13+ 支持 SVG，优先用 SVG
- 需兼容 iOS 12 以下时提供 PNG @1x/@2x/@3x
- 一个 imageset 一个图标，命名与 `icon-system-design.md` 的 IC4 一致

### Template Image（着色图标）

需要动态着色的图标设为 Template Image：

```swift
// Asset Catalog 中「Render As」设为 Template Image
// 或代码中：
let image = UIImage(named: "ic_action_search")?.withRenderingMode(.alwaysTemplate)

// 着色
imageView.tintColor = .systemBlue  // 暗色模式自动跟随
```

- Template Image 只识别 alpha 通道，所有像素用 `tintColor` 着色
- 选中态/禁用态/悬停态用 `tintColor` 切换，不每态做一个图标
- 暗色模式：`tintColor` 用系统语义色（`.primary`/`.secondary`），自动跟随

### SVG 适配

- iOS 13+ 原生支持 SVG Asset，但复杂 SVG（含滤镜/渐变/多色）可能渲染异常
- 建议用简化后的 SVG：路径转曲、移除滤镜、单色 + currentColor 语义
- 如 SVG 渲染异常，降级为 PNG @2x/@3x

## 状态变体实现

| 状态 | SF Symbols | 自定义图标 |
|------|-----------|-----------|
| 默认 | 基础名 + `.foregroundStyle(.primary)` | Template Image + `tintColor` |
| 选中 | `.fill` 变体 + `.foregroundStyle(.tint)` | 切换 imageset 或 `tintColor` 变主色 |
| 禁用 | 基础名 + `.foregroundStyle(.secondary)` + `opacity(0.4)` | `tintColor` 降级色 + `alpha(0.4)` |
| 悬停 | iOS 无 hover，不实现 | 不实现 |

- 选中态优先用 SF Symbols 的 `.fill` 变体（如 `heart` -> `heart.fill`）
- 自定义图标的选中态：如果有填充版则切换 imageset，否则只变 `tintColor`

## 无障碍

```swift
// 装饰图标（有文字说明）
Image(systemName: "star.fill").accessibilityHidden(true)

// 功能图标（无文字）
Button(action: {}) {
    Image(systemName: "magnifyingglass")
}
.accessibilityLabel("搜索")
```

- 装饰图标 `accessibilityHidden(true)`，VoiceOver 不朗读
- 功能图标所在控件须有 `accessibilityLabel`
- 自定义图标设 `accessibilityLabel` 在父控件上

## 尺寸与 Dynamic Type

- 用 Symbol Configuration 或 `.font(.system(size:))` 让图标随 Dynamic Type 缩放
- 不用硬编码 `.frame(width: 24, height: 24)`（不响应 Dynamic Type）
- 触控目标不够时用 `.contentShape(Rectangle())` 扩大命中区

## 验收标准

- [ ] 标准功能图标优先用 SF Symbols
- [ ] 自定义图标放 Asset Catalog，命名与 IC4 一致
- [ ] 着色图标设为 Template Image
- [ ] 状态切换用 `tintColor`，不每态做一个图标
- [ ] 支持 Dynamic Type，不硬编码 frame
- [ ] 装饰图标 `accessibilityHidden(true)`
- [ ] 功能图标有 `accessibilityLabel`
- [ ] SVG 简化（路径转曲、单色），渲染异常降级 PNG
- [ ] 暗色模式用系统语义色，自动跟随

## 边界与不做项

- 图标设计原则见 `specs/icon-system/icon-system-design.md`
- Web/Android/鸿蒙实现见 `specs/icon-system/web.md`、`android.md`、`harmony.md`
- App 图标（1024×1024 + 各尺寸）见 `specs/mobile/ios.md`
- SF Symbols 的完整图标清单见 Apple 官方 SF Symbols app
- SwiftUI/UIKit 代码实现由开发负责
