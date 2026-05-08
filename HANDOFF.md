# Codex 交接文档

## 项目信息
- **项目名**: shopping-list-platform（购物清单管理平台）
- **类型**: Web 全栈应用
- **部署目标**: 阿里云 ECS（2核2G/3M带宽/40G盘）
- **状态**: 等待开发

## 关键文件
- `docs/REQUIREMENTS.md` — 完整需求文档，**开发前必读**
- `README.md` — 项目概览
- `schema/` — 数据库 Schema（待创建）

## 开发指引

### 启动 Codex 的建议 Prompt

```
请阅读 docs/REQUIREMENTS.md 中的完整需求文档，然后：

1. 先实现 Phase 1（MVP）的所有功能
2. 使用轻量级技术栈（React + Vite + Fastify/Hono + SQLite）
3. 前后端分离，API 风格 RESTful
4. 移动端响应式设计
5. Docker 部署支持

优先跑通核心流程：添加物品 → 查看 → 标记购买 → 历史记录
```

### 约束
- 服务器只有 2G 内存，应用内存占用控制在 512MB 以内
- 带宽只有 3M，前端资源需要压缩
- SQLite 数据库，不需要 PostgreSQL/MySQL
- 不需要复杂的用户系统，简单用户名密码即可

### 数据迁移
现有购物清单数据在飞书群聊中，后续可通过 API 批量导入。

---
*创建时间: 2026-05-08*
