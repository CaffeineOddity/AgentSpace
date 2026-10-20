# Rules

从全局规则 `~/.dsh/AGENTS.md` 拆分而来的模块化规则集：按主题一文件，便于按需引用与复用。

## 规则清单

| 文件 | 主题 |
|---|---|
| [design-principles.md](design-principles.md) | 设计模式与软件原则（SDD、模块组织、原则优先级、SOLID、模式选用、反模式） |
| [code-style.md](code-style.md) | 代码风格 |
| [error-handling.md](error-handling.md) | 错误处理 |
| [documentation.md](documentation.md) | 文档 |
| [dependencies.md](dependencies.md) | 依赖管理 |
| [testing.md](testing.md) | 测试 |
| [terminal.md](terminal.md) | 终端使用 |
| [workflow.md](workflow.md) | 工作流 |
| [git.md](git.md) | Git 规范 |
| [skills.md](skills.md) | Skills 调用 |

## 维护约定

- 每文件只承载一个主题；新增规则优先追加到对应主题文件，不另起松散文件。
- 规则之间重复信息用相对链接引用，不复制内容。
- 以「当前状态」描述，不记录变更史。