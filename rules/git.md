# Git 规范

## 提交行为

- 用户未明确要求时绝不创建 git 提交。
- 优先 `git merge` 而非 `git squash`，除非用户明确要求 squash。
- 未提交的改动是用户的 review 状态——提交前读 diff 再决定提交什么。
- 保持不提交直到被要求，让 diff 干净可审。
- **原子提交**：一次提交只做一件事；拆分无关改动，不要混在一笔里。
- 提交前确保相关测试/构建通过。

## 提交信息格式（Conventional Commits）

```
<type>(<scope>): <subject>

<body(可选)>
```

- `type`：必填，见下表。
- `scope`：可选，受影响模块/包（如 `remote-access`、`host-webserver`）。
- `subject`：祈使句、小写开头、简洁（建议 ≤50 字符）、不带句号。
- `body`：说明为什么、怎么改；破坏性变更用 `BREAKING CHANGE:`。

### Type 类型

| type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 仅文档改动 |
| `style` | 格式/空白/排版，不影响逻辑 |
| `refactor` | 重构，不改行为 |
| `perf` | 性能优化 |
| `test` | 增补/修改测试 |
| `build` | 构建系统/依赖/打包 |
| `ci` | CI 配置与脚本 |
| `chore` | 杂项（脚手架、工具、锁文件等） |
| `revert` | 回滚某提交 |

### 示例

```
feat(remote-access): add token-based login over Cloudflare tunnel
fix(webserver): contain sync-throw from request gate on upgrade path
refactor(ui-layout): device-based mobile sidebar detection
test(access-log): cover newest-first file append
docs: clarify session cookie attributes
revert: revert "feat(x): ..."
```

## 分支命名

- 前缀对应用途，后接短横线小写的简短描述：`<type>/<short-kebab-desc>`。
- 常见：`feat/xxx`、`fix/xxx`、`refactor/xxx`、`docs/xxx`、`test/xxx`、`chore/xxx`、`release/xxx`。
- 示例：`feat/remote-access-tunnel`、`fix/gate-sync-throw`、`docs/login-help`。
- 避免用日期、无意义词作为分支名；保持简短可读。