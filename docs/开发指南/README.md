# 开发指南

> 本目录包含 PrismaX-Desktop 开发指南文档

---

## 文档索引

| 文档                                 | 说明                 |
| ------------------------------------ | -------------------- |
| [开发环境配置.md](./开发环境配置.md) | 开发环境搭建指南     |
| [代码规范.md](./代码规范.md)         | 代码风格和规范       |
| [Git工作流.md](./Git工作流.md)       | Git 工作流和提交规范 |
| [测试规范.md](./测试规范.md)         | 测试策略和规范       |
| [部署指南.md](./部署指南.md)         | 打包和分发流程       |

---

## 快速开始

进度与待办：

- 路线图与里程碑：`docs/开发路线图.md`

### 环境要求

- Node.js 20+
- pnpm 10+
- Git

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/your-username/PrismaX-Desktop.git
cd PrismaX-Desktop

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 启动 Electron 开发环境
pnpm dev:electron
```

### 常用命令

```bash
# 开发
pnpm dev           # 启动开发服务器
pnpm dev:electron  # 启动 Electron 开发环境

# 构建
pnpm build         # 构建前端
pnpm build:electron # 构建主进程
pnpm build:all     # 构建所有

# 打包
pnpm package       # 打包应用

# 代码质量
pnpm lint          # 代码检查
pnpm type-check    # 类型检查
pnpm test          # 运行测试
```
