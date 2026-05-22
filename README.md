# Shopping List Platform（购物清单管理平台）

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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
# 安装依赖
npm install

# 开发模式：后端 http://localhost:3001，前端 http://localhost:5173
npm run dev

# 生产构建
npm run build

# Docker 部署
docker-compose up -d
```

默认账号通过环境变量配置，未设置时会初始化：

- 管理员：`admin` / `admin123`
- 家庭用户：`family` / `family123`

## 部署环境

- **目标服务器**: 阿里云 ECS 经济型e实例（2核2G / 3M带宽 / 40G盘）
- **预估成本**: 99元/年
- **用途**: 个人及家庭购物清单管理

## 技术选型

### 前端
- React + Vite + TypeScript
- Tailwind CSS
- 响应式设计（手机优先）

### 后端
- Node.js + Hono
- SQLite + better-sqlite3
- JWT 登录认证

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
├── docs/              # 需求文档
│   └── REQUIREMENTS.md  # 详细需求（给 Codex 的 prompt）
├── web/               # Vite React 前端
├── server/            # Hono REST API
├── schema/            # SQLite schema
├── data/              # SQLite 数据目录
├── docker-compose.yml # Docker 部署配置
└── HANDOFF.md         # Codex 交接文档
```

## 当前状态

- [x] 需求梳理
- [x] Phase 1 MVP：登录、物品 CRUD、分类管理、标记购买、Docker 部署
- [ ] 部署上线

---
*创建时间: 2026-05-08*
