# Android 图标实现

> 本文件是 Android 端图标实现的深潜参考。跨端设计基线见 `specs/icon-system/icon-system-design.md`，Material 3 见 `specs/mobile/android.md`。

## 设计目标

在 Android 环境中以最佳方式渲染图标系统。Android 的核心选择是「用 Material Icons（系统原生）还是自定义 Vector Drawable」，二者有明确的适用场景。

## Material Icons（系统图标优先）

Google 提供的 Material Icons 是一套图标库，覆盖常见功能图标。优先使用 Material Icons：

- 优点：系统原生、Material 3 风格、免费、支持动态着色
- 缺点：风格受 Material 约束、覆盖面不如 SF Symbols 广
- 适用：标准功能图标（搜索/分享/编辑/设置等常见操作）

### Jetpack Compose 使用

```kotlin
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Search

// 默认态（线框）
Icon(Icons.Outlined.Search, contentDescription = "搜索")

// 选中态（填充）
Icon(Icons.Filled.Search, contentDescription = "搜索", tint = MaterialTheme.colorScheme.primary)
```

### XML 使用

```xml
<ImageView
    android:src="@drawable/ic_search"
    app:tint="?attr/colorOnSurface" />
```

### Material Icons 使用规则

- 默认态用 `Outlined` 变体，选中态用 `Filled` 变体
- 着色用 `tint`，不用多色矢量
- 颜色用 `MaterialTheme.colorScheme.*` 语义色，暗色模式自动跟随
- 不硬编码颜色值

## 自定义 Vector Drawable

Material Icons 不覆盖的图标须自定义，用 Vector Drawable 格式：

```xml
<!-- res/drawable/ic_action_search.xml -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24"
    android:tint="?attr/colorOnSurface">
    <path
        android:fillColor="@android:color/white"
        android:pathData="M11,11m-8,0a8,8,0,1,1,16,0a8,8,0,1,1,-16,0" />
</vector>
```

- Vector Drawable 是 Android 原生 SVG 等效格式，支持缩放不失真
- `android:tint` 用主题属性（`?attr/colorOnSurface`），动态着色
- `fillColor` 用白色占位（`@android:color/white`），实际色由 `tint` 决定
- 路径数据从 SVG 转换（用 Android Studio 的 Vector Asset 工具或 SVGO）

### SVG -> Vector Drawable 转换

- Android Studio：右键 `res/drawable` -> New -> Vector Asset -> Local file -> 选 SVG
- 命令行：用 `svg2vector` 或在线工具
- 转换后检查：渐变/滤镜/多 path 是否正确保留
- 复杂 SVG（含渐变/滤镜）Vector Drawable 支持有限，可能需简化

## 资源目录与密度

Vector Drawable 放在 `res/drawable/`，不需要分密度（矢量自动缩放）。

```
res/drawable/
├── ic_action_search.xml
├── ic_nav_home.xml
├── ic_status_success.xml
├── ic_content_file.xml
└── ic_system_back.xml
```

- 仅用 Vector Drawable，不分密度目录
- 如需降级为 PNG（不支持 Vector 的旧设备），放 `drawable-mdpi/` ~ `drawable-xxxhdpi/`
- 命名遵循 `ic_<类别>_<名称>.xml`（见 `icon-system-design.md` 的 IC4）

## 状态变体实现

| 状态 | Material Icons | 自定义 Vector |
|------|---------------|--------------|
| 默认 | `Outlined` 变体 + `colorOnSurface` | Vector + `tint=?attr/colorOnSurface` |
| 选中 | `Filled` 变体 + `colorPrimary` | 切换 Vector 或 `tint=?attr/colorPrimary` |
| 禁用 | 基础 + `colorOnSurfaceDisabled` + `alpha=0.4` | `tint` 降级色 + `alpha` |
| 悬停 | State Layer 叠加（Android 无独立 hover 图标态） | 同左 |

- 选中态优先用 Material Icons 的 Filled 变体
- 自定义图标的选中态：有填充版则切换 drawable，否则只变 `tint`
- 禁用态用 `alpha` + 降级色，不额外做灰色图标

## 无障碍

```kotlin
// Compose
Icon(
    imageVector = Icons.Filled.Search,
    contentDescription = "搜索",    // 功能图标必须
)

// 装饰图标
Icon(
    imageVector = Icons.Filled.Star,
    contentDescription = null,      // 装饰图标用 null
)
```

```xml
<!-- XML -->
<ImageView
    android:src="@drawable/ic_search"
    android:contentDescription="搜索"
    android:importantForAccessibility="yes" />

<!-- 装饰图标 -->
<ImageView
    android:src="@drawable/ic_decoration"
    android:importantForAccessibility="no" />
```

- 功能图标 `contentDescription` 必填
- 装饰图标 `contentDescription = null`（Compose）或 `importantForAccessibility="no"`（XML）

## 主题化

```kotlin
// Compose
Icon(
    imageVector = Icons.Outlined.Search,
    contentDescription = "搜索",
    tint = MaterialTheme.colorScheme.onSurface,  // 暗色模式自动跟随
)

// 选中态
tint = MaterialTheme.colorScheme.primary
```

- 用 `MaterialTheme.colorScheme.*` 语义色，暗色模式自动跟随
- Vector Drawable 的 `tint` 用主题属性 `?attr/colorOnSurface`
- 禁用 `@ColorInt` 硬编码颜色

## 验收标准

- [ ] 标准功能图标优先用 Material Icons
- [ ] 自定义图标用 Vector Drawable，不用 PNG 位图（除非降级）
- [ ] Vector Drawable 的 `tint` 用主题属性，不硬编码色
- [ ] 状态切换用 `tint` 或变体切换，不每态做一个 drawable
- [ ] 资源放 `res/drawable/`，不分密度（Vector 自动缩放）
- [ ] 命名遵循 `ic_<类别>_<名称>.xml`
- [ ] 功能图标 `contentDescription` 必填
- [ ] 装饰图标 `contentDescription = null`
- [ ] 颜色用 `MaterialTheme.colorScheme.*`，暗色模式自动跟随
- [ ] SVG -> Vector 转换后检查路径完整性

## 边界与不做项

- 图标设计原则见 `specs/icon-system/icon-system-design.md`
- Web/iOS/鸿蒙实现见 `specs/icon-system/web.md`、`ios.md`、`harmony.md`
- App 自适应图标（Adaptive Icon）见 `specs/mobile/android.md`
- Material Icons 完整清单见 Material Icons 官方库
- Compose/XML 代码实现由开发负责
