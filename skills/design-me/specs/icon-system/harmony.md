# 鸿蒙图标实现

> 本文件是鸿蒙（HarmonyOS）端图标实现的深潜参考。跨端设计基线见 `specs/icon-system/icon-system-design.md`，HarmonyOS UX 见 `specs/mobile/harmony.md`。

## 设计目标

在鸿蒙环境中以最佳方式渲染图标系统。鸿蒙的图标实现使用系统资源引用机制（`$r()`），支持矢量（SVG）与位图（PNG）两种格式，通过资源限定词目录适配多设备。

## 实现方式

### SVG 矢量（首选）

鸿蒙支持 SVG 格式的图标资源，优先使用：

```
entry/src/main/resources/
├── base/
│   └── media/
│       ├── ic_action_search.svg
│       ├── ic_nav_home.svg
│       ├── ic_status_success.svg
│       └── ic_system_back.svg
```

- SVG 放在 `resources/base/media/` 目录
- 通过 `$r('app.media.ic_action_search')` 引用
- 支持矢量缩放，适配多设备（手机/平板/智慧屏）
- SVG 须简化：路径转曲、单色、移除滤镜/渐变

### PNG 位图（降级）

不支持 SVG 的场景或复杂多色图标用 PNG，按密度分目录：

```
resources/
├── base/media/                    ← 默认
├── phone-mdpi/media/              ← 手机 mdpi
├── phone-hdpi/media/              ← 手机 hdpi
├── phone-xhdpi/media/             ← 手机 xhdpi
├── phone-xxhdpi/media/            ← 手机 xxhdpi
├── phone-xxxhdpi/media/           ← 手机 xxxhdpi
├── tablet/media/                  ← 平板
└── tv/media/                      ← 智慧屏
```

- 同一图标在多个密度目录提供对应尺寸 PNG
- 鸿蒙按设备类型 + 密度自动选择资源
- 命名与 `icon-system-design.md` 的 IC4 一致

## 资源引用

在 ArkTS/ArkUI 中用 `$r()` 引用图标：

```typescript
// Image 组件引用图标
Image($r('app.media.ic_action_search'))
  .width(24)
  .height(24)
  .fillColor($r('app.color.on_surface'))  // 着色

// 选中态变色
Image($r('app.media.ic_nav_home'))
  .fillColor($r('app.color.primary'))
```

- `$r('app.media.<name>')` 引用 media 目录下的图标
- `.fillColor()` 动态着色，类似 iOS 的 `tintColor` / Android 的 `tint`
- 颜色用 `$r('app.color.*')` 语义色，暗色模式自动跟随

## 状态变体实现

| 状态 | 实现方式 |
|------|---------|
| 默认 | 基础图标 + `fillColor(on_surface)` |
| 选中 | 切换填充版资源 或 `fillColor(primary)` |
| 禁用 | `fillColor(on_surface_disabled)` + `opacity(0.4)` |
| 悬停 | 鸿蒙无独立 hover 图标态，用 State Layer 叠加 |

- 选中态：有填充版则切换资源（`ic_nav_home` -> `ic_nav_home_filled`），否则只变 `fillColor`
- 禁用态用 `opacity` + 降级色，不额外做灰色图标
- 状态切换用 `fillColor`，不每态做一个图标文件（除非线框/填充形状不同）

## 无障碍

```typescript
Image($r('app.media.ic_action_search'))
  .width(24)
  .height(24)
  .alt('搜索')  // 无障碍朗读文本

// 装饰图标
Image($r('app.media.ic_decoration'))
  .alt(null)  // 装饰图标不朗读
```

- 功能图标 `.alt()` 必填，供屏幕朗读
- 装饰图标 `.alt(null)` 或不设，不朗读

## 多设备适配

鸿蒙的核心能力是多设备自适应，图标也须适配：

| 设备 | 策略 |
|------|------|
| 手机 | 标准 24vp 画布 |
| 平板 | 同一 SVG 等比放大，不需额外资源 |
| 智慧屏 | 大尺寸（48-64vp），线宽档位可调粗 |
| 手表 | 小尺寸（16-20vp），线宽调细，简化细节 |
| 车机 | 中尺寸（32vp），方向键聚焦须有焦点态 |

- SVG 矢量优先，一套资源多设备适配
- 需要不同线宽时，在各设备资源目录放对应 SVG
- PNG 位图须在各密度/设备目录提供对应文件

## 暗色模式

```
resources/
├── base/media/                    ← 亮色图标
│   └── ic_action_search.svg
├── dark/media/                    ← 暗色图标（如需独立适配）
│   └── ic_action_search.svg
└── base/element/                 ← 颜色定义
    ├── color.json                ← 亮色色值
    └── dark/element/color.json   ← 暗色色值
```

- 优先用 `fillColor` + 语义色（`on_surface`），暗色模式自动跟随，不需独立图标
- 仅当图标本身需要不同形状/线宽时，才在 `dark/media/` 放独立 SVG
- 颜色定义在 `element/color.json`，暗色在 `dark/element/color.json`

## 验收标准

- [ ] SVG 放在 `resources/base/media/`，通过 `$r()` 引用
- [ ] SVG 简化（路径转曲、单色、移除滤镜）
- [ ] PNG 降级时在各密度/设备目录提供对应文件
- [ ] 着色用 `fillColor` + `$r('app.color.*')` 语义色
- [ ] 状态切换用 `fillColor`，不每态做一个文件
- [ ] 选中态有填充版资源或 `fillColor(primary)`
- [ ] 功能图标 `.alt()` 必填
- [ ] 装饰图标 `.alt(null)`
- [ ] 暗色模式优先用语义色自动跟随，仅必要时独立 SVG
- [ ] 命名遵循 `ic_<类别>_<名称>.svg`

## 边界与不做项

- 图标设计原则见 `specs/icon-system/icon-system-design.md`
- Web/iOS/Android 实现见 `specs/icon-system/web.md`、`ios.md`、`android.md`
- App 图标（162×162px + 分层前景背景）见 `specs/mobile/harmony.md`
- ArkTS/ArkUI 代码实现由开发负责
- 鸿蒙系统图标库（如有）参考华为官方文档
