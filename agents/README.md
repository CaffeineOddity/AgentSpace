# Agents

可复用的 Agent 定义（预设 / 子代理 / 系统提示词），与 `rules/`、`skills/` 配合复用。

## 结构约定

- 每个 Agent 一个独立目录（kebab-case），目录内放该 Agent 的定义文件与说明。
- 定义格式依目标平台而定（如 dsh 预设、Claude Code subagent 等），保持单一事实来源。
- 对外只暴露入口文件与使用说明，不多处复制同一份 Agent 定义。

## 关联

- 行为规则见 [../rules/README.md](../rules/README.md)。
- 可复用技能见 [../skills/](../skills/)。