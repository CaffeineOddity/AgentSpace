# 规范定制规范

> 本文件是设计规范定制与项目级覆盖的唯一事实来源。当全局 spec 无法完全适配某个项目时，用此规范在不修改全局 spec 的前提下做项目级差异。

## 设计目标

让同一套设计基线（`specs/brand` + 各端 spec）可被多个项目复用，同时允许各项目在不污染全局规范的前提下做局部覆盖。核心模式是 **Master + Overrides**：全局 spec 是 Master，项目级差异是 Override，读取时 Override 优先。

这解决「一套规范 N 个项目，各有微调」的常见需求，避免为每个项目 fork 一整套规范导致维护灾难。

## 操作流程

### S1. 判断是否需要定制

先确认需求是否真的需要定制：

- 需求与全局 spec 完全一致 -> 不定制，直接用
- 仅个别字段/色值/间距不同 -> 项目级 Override
- 需要全新能力或全新流程 -> 先更新全局 spec（遵循 SDD），而非项目级绕过

判断准则：若差异是「同一个领域的参数微调」-> Override；若是「全新领域/全新流程」-> 全局 spec 新增。不要用项目级定制掩盖全局规范的缺口。

### S2. 建立项目规范目录

在项目内创建设计规范目录：

```
<项目根>/
└── design-system/
    ├── MASTER.md           ← 全局基线引用 + 项目级补充
    └── pages/              ← 页面级覆盖（可选）
        ├── home.md
        ├── dashboard.md
        └── checkout.md
```

- `MASTER.md`：项目级总规范，引用全局 spec 作为基线，记录本项目的覆盖项
- `pages/`：页面级覆盖，仅记录与 MASTER 的差异

### S3. Master 级覆盖

`MASTER.md` 结构：

```markdown
# <项目名> 设计规范

## 基线引用
- 品牌基线：见 @design/specs/brand/brand-design.md
- Web 规范：见 @design/specs/web/web-design.md
- 移动端规范：见 @design/specs/mobile/mobile-design.md

## 项目级覆盖

### 色彩
- 主色：#FF6B35（覆盖品牌基线 #E63946，用于本项目暖调定位）
- 原因：本项目面向年轻消费群体，需更高饱和度

### 字体
- 展示字体：Poppins（覆盖基线 Inter Display）
- 原因：本项目需更圆润亲和的品牌人格

### 间距
- 基础栅格：6dp（覆盖基线 8dp，用于信息更密集的工具型界面）

### 不覆盖项
- 圆角、阴影：沿用基线（当前场景无差异需求）
```

每项覆盖须记录：覆盖字段、新值、原因。原因是必须的--无原因的覆盖会在后续维护时成为谜团。

- **Override 方向性约束**：项目覆盖只允许朝「更合规」方向走，**不允许借 Override 绕开其他 spec 的禁令**（如品牌基线 display 字体若为某端 checklist 禁用字体，Override 必须替换为合规值并说明，不得原样保留违禁值）。两条 spec 各自为真、合用即矛盾时，以更严格的约束为准。
- **沿用 = 逐值一致**：声明「沿用基线（不覆盖）」的 Token，项目 tokens.json 中须与基线逐值一致（刻度档位、时长、色值/引用）——凭空档位（如基线刻度外的 md=12）、相近不同值（normal 240 vs 基线 250）、自拟色调 shadow 都属**隐性覆盖**，须转显式覆盖并记原因；引用基线时写真实可达路径（含 Token 基线实体文件），断链=检索链断裂
- **显式声明「不覆盖」**：某领域经 S1 判断无需覆盖时，在 MASTER 对应小节写「沿用基线（不覆盖）+ 一句原因」；不写 = 维护者无法区分「漏考虑」与「有意沿用」。S3 模板因此与页面级 S4 一样含「不覆盖项」节：

### S4. 页面级覆盖

`pages/<page>.md` 仅记录该页面与 MASTER 的差异：

```markdown
# Checkout 页面覆盖

## 覆盖项
- 主 CTA 位置：底部固定栏（覆盖 MASTER 的页面内主 CTA）
- 原因：Checkout 流程需始终可见的提交入口

## 不覆盖项
- 色彩、字体、间距沿用 MASTER
```

### S5. 读取规则（层级检索）

设计某页面时，按以下优先级检索规范：

1. 检查 `design-system/pages/<page>.md` 是否存在
2. 存在 -> 该文件规则优先，覆盖 MASTER
3. 不存在 -> 使用 `design-system/MASTER.md`
4. MASTER 未覆盖的字段 -> 回退到全局 spec

```
检索优先级：
pages/<page>.md  >  MASTER.md  >  全局 specs/*
```

### S6. 设计 Token 落地

将规范中的色彩、字体、间距、圆角、阴影转为可注入代码的 Token：

```json
{
  "color": {
    "primary": "#FF6B35",
    "secondary": "#2EC4B6",
    "surface": "#FFFFFF",
    "on-surface": "#1A1A2E"
  },
  "font": {
    "display": "Poppins",
    "body": "Inter",
    "label": "Inter Medium"
  },
  "spacing": {
    "base": 6,
    "scale": [6, 12, 18, 24, 36, 48, 72]
  },
  "radius": { "sm": 4, "md": 8, "lg": 16 },
  "shadow": { "card": "0 2px 8px rgba(0,0,0,0.08)" }
}
```

- Token 须可被各端消费（Web CSS 变量、移动端主题配置）
- Token 是规范与代码的契约：改 Token = 改规范，二者同步
- 遵循 SDD：先改 spec/Token，再改代码

### S7. 新增规范能力

当项目需要全局 spec 未覆盖的全新设计能力时：

1. 先在全局 `specs/<领域>/` 新增对应 spec 文件（如 `specs/illustration/illustration-design.md`）
2. 在 `SKILL.md` 路由表加入新领域
3. 项目级 MASTER.md 引用新 spec 作为基线
4. 再执行设计

不要在项目级目录里私建一套与全局平行的规范--那会造成孤岛，违背 DRY。

## 验收标准

- [ ] 每项 Override 记录了字段、新值、原因
- [ ] Override 方向合规：未借项目覆盖绕开其他 spec 的禁令（违禁字体/色彩/反 slop 条款）
- [ ] 无需覆盖的领域已显式声明「沿用基线 + 原因」，维护者可区分「漏考虑」与「有意沿用」
- [ ] MASTER.md 引用了全局 spec 作为基线
- [ ] 页面级覆盖仅记录与 MASTER 的差异，不复述基线
- [ ] 层级检索优先级明确（pages > MASTER > 全局）
- [ ] 设计 Token 已落地为可消费的结构化格式
- [ ] Token 与 spec 一致，无脱节；「沿用」声明的 Token 与基线逐值一致（刻度/时长/色值引用），无隐性覆盖
- [ ] MASTER/页面中的可计算主张（对比度、占比等）附计算式与中间值，声称值可复算（禁无源数字）
- [ ] 新增能力已回到全局 spec，未在项目级私建平行规范
- [ ] 无原因的覆盖已补全或移除

## 边界与不做项

- 不负责全局 spec 的编写（全局 spec 由各领域 spec 负责）
- 不负责代码实现（Token 是规范与代码的契约，代码由开发消费）
- 全局 spec 本身有误时，先修全局 spec 再改项目覆盖，不可用项目级覆盖掩盖全局错误
- 定制不等于重造--差异用 Override 表达，不是 fork 整套规范
