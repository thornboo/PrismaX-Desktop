# 开发指南

> 本目录包含 PrismaX 项目的开发指南文档

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [开发环境.md](./开发环境.md) | 开发环境搭建指南 |
| [代码规范.md](./代码规范.md) | 代码风格与规范 |
| [Git规范.md](./Git规范.md) | Git 工作流与提交规范 |
| [测试规范.md](./测试规范.md) | 测试策略与规范 |
| [部署指南.md](./部署指南.md) | 部署方案与流程 |

---

## 快速开始

### 环境要求

- Node.js 20+
- pnpm 8+
- Git

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/your-username/PrismaX.git
cd PrismaX

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev:web      # Web 版
pnpm dev:desktop  # 桌面版
```

### 常用命令

```bash
# 开发
pnpm dev:web        # 启动 Web 开发服务器
pnpm dev:desktop    # 启动桌面应用开发

# 构建
pnpm build          # 构建所有包
pnpm build:web      # 构建 Web 版
pnpm build:desktop  # 构建桌面版

# 代码质量
pnpm lint           # 代码检查
pnpm type-check     # 类型检查
pnpm test           # 运行测试
```
