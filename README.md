# PrismaX

> Next-generation AI chat assistant — Feature-rich, Flexible deployment, Excellent experience

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

[English](./README.md) | [简体中文](./docs/zh/README.md)

## Features

- **Multi-model Support** - OpenAI, Claude, Gemini, Qwen, DeepSeek, Ollama local models, and more
- **Knowledge Base RAG** - Vector search, document Q&A, intelligent retrieval
- **Agent System** - Tool calling, automated tasks, MCP protocol support
- **Plugin System** - Third-party plugin extensions
- **Multi-platform** - Desktop app, Web service, Mobile (planned)
- **Cloud Sync** - Cross-device data synchronization
- **Docker Deployment** - One-click deployment, simple maintenance

## Deployment Options

| Method | Description | Status |
|--------|-------------|--------|
| Desktop App | Windows / macOS / Linux | In Development |
| Web Service | Docker one-click deployment | In Development |
| Mobile App | iOS / Android | Planned |

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend Framework | Next.js 15 + React 19 |
| UI Components | shadcn/ui + Radix UI + Tailwind CSS |
| State Management | Zustand |
| Desktop Framework | Electron |
| Backend | Next.js API Routes + tRPC |
| Database | PostgreSQL + pgvector / SQLite |
| Cache | Redis |

## Documentation

See the [docs/](./docs/) directory for detailed documentation:

- [Project Overview](./docs/项目概述.md)
- [Tech Stack](./docs/技术选型/)
- [Architecture](./docs/架构设计/)
- [Feature Planning](./docs/功能规划/)
- [Development Guide](./docs/开发指南/)

## Quick Start

> Project is under development, stay tuned...

```bash
# Clone the repository
git clone https://github.com/your-username/PrismaX.git

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Contributing

Contributions are welcome! Please see [Contributing Guide](./CONTRIBUTING.md) for details.

## License

[Apache-2.0](./LICENSE)
