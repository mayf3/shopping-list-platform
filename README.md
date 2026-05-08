# Shopping List Platform（购物清单管理平台）

一个基于 Web 的购物清单管理平台，用于管理日常购物需求、预算跟踪、购买记录，支持多用户使用。

## 背景

当前购物清单管家通过飞书群聊 + 本地脚本管理购物清单，存在以下局限：
- 只能通过聊天交互，缺少直观的图形界面
- 无法可视化预算和消费趋势
- 不方便非技术家庭成员使用
- 缺少商品图片、购买链接等富媒体信息

本项目旨在构建一个**独立部署的 Web 应用**，提供完整的购物清单管理体验。

## Quick Start

```bash
# 开发模式
cd web && npm install && npm run dev

# 生产部署
docker-compose up -d
```

## 部署环境

- **目标服务器**: 阿里云 ECS 经济型e实例（2核2G / 3M带宽 / 40G盘）
- **预估成本**: 99元/年
- **用途**: 个人及家庭购物清单管理

## 技术选型

> 具体技术栈由 Codex 开发时确定，以下为建议方案：

### 前端
- React / Vue 3 + TypeScript
- Tailwind CSS 或 Ant Design
- 响应式设计（手机 + 电脑）

### 后端
- Python FastAPI 或 Node.js Express
- SQLite（轻量级，2G内存足够）

### 部署
- Docker + Docker Compose
- Nginx 反向代理
- 免费 SSL 证书（Let's Encrypt）

## 项目边界

- `shopping-list-platform`：Web 应用、API、数据库、前端界面
- 独立部署，不依赖飞书群聊
- 可选：后续提供飞书 Bot 集成

## 目录结构

```
shopping-list-platform/
├── README.md          # 项目说明
├── docs/              # 需求文档、设计文档
│   ├── REQUIREMENTS.md  # 详细需求（给 Codex 的 prompt）
│   └── DESIGN.md        # 设计文档
├── web/               # 前端代码
├── scripts/           # 工具脚本
├── data/              # 本地开发数据
├── schema/            # 数据库 Schema
├── templates/         # 页面模板
├── docker-compose.yml # Docker 部署配置
└── HANDOFF.md         # Codex 交接文档
```

## 当前状态

- [x] 需求梳理
- [ ] Codex 开发
- [ ] 部署上线

---
*创建时间: 2026-05-08*
