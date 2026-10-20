# Web 图标实现

> 本文件是 Web 端图标实现的深潜参考。跨端设计基线见 `specs/icon-system/icon-system-design.md`，品牌基线见 `specs/brand`。

## 设计目标

在 Web 环境中以最佳方式渲染图标系统。Web 的优势是 SVG 原生支持，劣势是需要兼顾性能（HTTP 请求数）、可维护性（图标增删）、可主题化（动态着色）三者的平衡。

## 实现方式

### SVG 内联（首选）

将 SVG 直接内联在 HTML 中，用 `currentColor` 继承文字色：

```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8" />
  <line x1="21" y1="21" x2="16.65" y2="16.65" />
</svg>
```

- 优点：零 HTTP 请求、支持 `currentColor` 主题化、可 CSS 动画
- 缺点：HTML 体积增大，图标多时不适合全内联
- 适用：高频图标（导航/操作）、首屏关键图标

### SVG Sprite

将所有图标合并到一个 SVG sprite 文件，用 `<use>` 引用：

```html
<!-- sprite 文件 -->
<svg style="display:none">
  <symbol id="ic_action_search" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2" />
  </symbol>
</svg>

<!-- 使用 -->
<svg width="24" height="24"><use href="#ic_action_search" /></svg>
```

- 优点：一次加载、按需引用、支持 currentColor
- 缺点：sprite 文件需维护，新增图标要更新
- 适用：中大型项目、图标数量多

### CSS 背景图（不推荐）

用 CSS `background-image` 引用 PNG/SVG 文件：

- 缺点：不支持 `currentColor`、不可 CSS 动画、每个图标一个 HTTP 请求
- 仅在无法用内联/Sprite 的旧项目中降级使用

### 图标字体（不推荐）

用 icon font（如 Font Awesome）：

- 缺点：不可着色（固定色）、不可局部动画、无障碍差、文件大
- 仅在需要 ligature 或遗留系统兼容时用

## 主题化

Web 图标主题化的核心是 `currentColor`：

```css
/* 默认态 */
.icon { color: var(--color-on-surface); }

/* 选中态 */
.icon--active { color: var(--color-primary); }

/* 禁用态 */
.icon--disabled { color: var(--color-on-surface-disabled); opacity: 0.4; }

/* 悬停态 */
.icon:hover { color: var(--color-primary); }
```

- SVG 内联 + `stroke="currentColor"` 时，CSS 改 `color` 即可全局主题化
- 暗色模式切换 CSS 变量值，图标自动跟随
- 禁用嵌套用 `currentColor` + `opacity`，不额外做灰色图标

## 无障碍

- 装饰性图标（旁边有文字说明）：`aria-hidden="true"`，不朗读
- 独立功能图标（无文字，如纯图标按钮）：须有 `aria-label` 或 `<title>`：

```html
<button aria-label="搜索">
  <svg aria-hidden="true"><use href="#ic_action_search" /></svg>
</button>
```

- SVG 内可加 `<title>` 元素供屏幕阅读器朗读
- 禁用 `aria-hidden` + 无文字 + 无 label 的图标（屏幕阅读器用户完全看不到）

## 性能

- 首屏图标优先内联，非首屏用 Sprite 或懒加载
- SVG 文件移除编辑器元数据（`<metadata>`、`sodipodi`、`inkscape` 命名空间）
- 用 SVGOMG 或 svgo 压缩，移除冗余路径
- 大量小图标考虑 CSS Sprite 或 data URI 内联（< 1KB 的图标）

## 目录与命名

```
src/assets/icons/
├── action/
│   ├── ic_action_search.svg
│   └── ic_action_delete.svg
├── nav/
│   ├── ic_nav_home.svg
│   └── ic_nav_profile.svg
├── status/
│   ├── ic_status_success.svg
│   └── ic_status_error.svg
├── content/
└── system/
```

- 命名遵循 `ic_<类别>_<名称>.svg`（见 `icon-system-design.md` 的 IC4）
- SVG 文件 `fill`/`stroke` 设为 `currentColor`，不含硬编码颜色
- 构建工具可自动生成 sprite 或 React/Vue 组件

## 验收标准

- [ ] 高频图标内联，非首屏用 Sprite
- [ ] SVG 用 `currentColor`，无硬编码颜色
- [ ] 装饰图标 `aria-hidden="true"`
- [ ] 功能图标有 `aria-label` 或 `<title>`
- [ ] SVG 文件已压缩，无编辑器元数据
- [ ] 目录按类别分组
- [ ] 命名遵循 `ic_<类别>_<名称>` 规范
- [ ] 暗色模式切换 CSS 变量，图标自动跟随
- [ ] 状态变体用 CSS class 切换，不每态画一个 SVG

## 边界与不做项

- 图标设计原则（画布/线宽/分类/命名）见 `specs/icon-system/icon-system-design.md`
- iOS/Android/鸿蒙实现见 `specs/icon-system/ios.md`、`android.md`、`harmony.md`
- App 图标（favicon/apple-touch-icon）见 `specs/mobile` 的 M6
- 构建 工具配置（Webpack/Vite）由开发负责
