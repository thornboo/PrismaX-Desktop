# Git 规范

> 本文档描述 PrismaX 项目的 Git 工作流与提交规范

---

## 分支策略

### 主要分支

| 分支 | 说明 | 保护规则 |
|------|------|----------|
| `main` | 主分支，生产环境代码 | 禁止直接推送，需要 PR |
| `develop` | 开发分支，最新开发代码 | 禁止直接推送，需要 PR |

### 功能分支

| 分支类型 | 命名规范 | 示例 |
|----------|----------|------|
| 功能开发 | `feature/<描述>` | `feature/add-knowledge-base` |
| Bug 修复 | `fix/<描述>` | `fix/message-render-error` |
| 热修复 | `hotfix/<描述>` | `hotfix/critical-security-fix` |
| 重构 | `refactor/<描述>` | `refactor/chat-store` |
| 文档 | `docs/<描述>` | `docs/api-documentation` |

---

## 提交规范

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（不是新功能也不是修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具相关 |
| `ci` | CI/CD 相关 |

### Scope 范围

| Scope | 说明 |
|-------|------|
| `web` | Web 应用 |
| `desktop` | 桌面应用 |
| `ui` | UI 组件库 |
| `core` | 核心逻辑 |
| `ai-sdk` | AI SDK |
| `database` | 数据库 |
| `shared` | 共享工具 |

### 示例

```bash
# 新功能
feat(web): add knowledge base management page

# Bug 修复
fix(desktop): resolve window close event handling

# 文档
docs: update API documentation

# 重构
refactor(core): simplify message processing logic

# 性能优化
perf(ui): optimize chat list rendering with virtualization
```

---

## 工作流程

### 1. 开始新功能

```bash
# 从 develop 分支创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/add-knowledge-base
```

### 2. 开发过程

```bash
# 定期提交
git add .
git commit -m "feat(web): add knowledge base list component"

# 保持与 develop 同步
git fetch origin
git rebase origin/develop
```

### 3. 完成功能

```bash
# 推送到远程
git push origin feature/add-knowledge-base

# 创建 Pull Request
# - 目标分支：develop
# - 填写 PR 描述
# - 请求 Code Review
```

### 4. Code Review

- 至少需要 1 个 Approve
- 所有 CI 检查通过
- 解决所有 Review 意见

### 5. 合并

```bash
# 使用 Squash and Merge
# 合并后删除功能分支
```

---

## Pull Request 规范

### PR 标题

遵循 Commit Message 格式：

```
feat(web): add knowledge base management
```

### PR 描述模板

```markdown
## 概述

简要描述这个 PR 做了什么。

## 改动内容

- 添加了知识库列表页面
- 实现了文档上传功能
- 添加了相关测试

## 测试

- [ ] 单元测试通过
- [ ] E2E 测试通过
- [ ] 手动测试通过

## 截图（如有 UI 改动）

[添加截图]

## 相关 Issue

Closes #123
```

---

## Git Hooks

项目使用 Husky + lint-staged 进行提交前检查：

### pre-commit

```bash
# 运行 lint-staged
pnpm lint-staged
```

### commit-msg

```bash
# 验证 commit message 格式
pnpm commitlint --edit $1
```

### lint-staged 配置

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

---

## 版本发布

### 版本号规范

遵循 [Semantic Versioning](https://semver.org/)：

- `MAJOR.MINOR.PATCH`
- `1.0.0` -> `1.0.1` (Patch: Bug 修复)
- `1.0.0` -> `1.1.0` (Minor: 新功能，向后兼容)
- `1.0.0` -> `2.0.0` (Major: 破坏性变更)

### 发布流程

```bash
# 1. 创建发布分支
git checkout develop
git checkout -b release/v1.0.0

# 2. 更新版本号
pnpm changeset version

# 3. 更新 CHANGELOG
# 自动生成

# 4. 提交
git add .
git commit -m "chore: release v1.0.0"

# 5. 合并到 main
git checkout main
git merge release/v1.0.0

# 6. 打标签
git tag v1.0.0
git push origin v1.0.0

# 7. 合并回 develop
git checkout develop
git merge main
```

---

## 常用命令

```bash
# 查看提交历史
git log --oneline --graph

# 修改最后一次提交
git commit --amend

# 交互式 rebase
git rebase -i HEAD~3

# 暂存当前改动
git stash
git stash pop

# 撤销未提交的改动
git checkout -- .

# 撤销已提交的改动（创建新提交）
git revert <commit-hash>

# 重置到某个提交（谨慎使用）
git reset --hard <commit-hash>
```
