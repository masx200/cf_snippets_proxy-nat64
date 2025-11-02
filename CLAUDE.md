# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是一个基于 Cloudflare Workers 的 VLESS
协议代理实现。项目采用单文件架构（`snippets.js`），无需构建工具，可直接部署到
Cloudflare Workers 平台。

## 代码架构

### 核心组件

**主入口**（snippets.js:16-35）

- `fetch` 处理器：路由 HTTP 请求和 WebSocket 连接
  - WebSocket 请求 → `handle_ws` 函数
  - GET / → 返回 "success" 页面
  - GET /{UUID} → `handle_sub` 函数生成订阅链接

**WebSocket 处理**（snippets.js:78-369）

- `handle_ws`：VLESS 协议核心实现
  - UUID 验证（snippets.js:210-217）
  - 支持多种连接模式：direct、socks5、proxy、auto
  - 解析 SOCKS5 认证信息（snippets.js:99-112）
  - 连接策略排序（snippets.js:115-129）
  - 支持 TCP 连接和 UDP DNS 代理（snippets.js:253-309）
  - 数据流双向传输（snippets.js:173-363）

**订阅链接生成**（snippets.js:37-76）

- `handle_sub`：生成 VLESS 订阅链接
- `gen_links`：根据域名生成多个配置的 VLESS 链接，使用预设的优选域名列表

### 配置常量（snippets.js:1-14）

- `UUID`：VLESS 协议用户标识，需自定义修改
- `DEFAULT_PROXY_IP`：默认代理服务器地址
- `BEST_DOMAINS`：优选域名/IP 列表，用于订阅链接生成

### 连接模式

支持四种模式（snippets.js:94-129）：

- `direct`：直连
- `s5`：SOCKS5 代理（格式：`user:pass@host:port` 或 `@host:port`）
- `proxy`：反向代理 IP
- `auto`：自动模式，可根据 URL 参数顺序灵活组合回退策略

## 常用操作

### 部署到 Cloudflare Workers

1. 登录 Cloudflare Dashboard
2. 选择域名 → 规则(Rule) → Snippets
3. 创建新片段
4. 粘贴 `snippets.js` 代码
5. 修改 `UUID` 常量
6. 保存并部署

### 配置订阅链接

访问 `https://your-worker-domain.workers.dev/{UUID}` 获取 VLESS
订阅链接，客户端导入即可使用。

### 自定义配置

在 `snippets.js` 顶部修改：

- `UUID`：更改为你的 UUID
- `DEFAULT_PROXY_IP`：设置代理服务器
- `BEST_DOMAINS`：添加或修改优选域名

### 连接测试

使用不同参数测试连接模式：

- `/?mode=direct` - 仅直连
- `/?mode=s5&s5=user:pass@host:port` - 仅 SOCKS5
- `/?mode=auto&direct&s5=user:pass@host:port` - 直连优先，回退 SOCKS5

## 更新历史

- **20250906**：移除"仅ProxyIP"模式
- **20250905**：添加多种代理模式配置
- **20250718**：移除 NAT64，添加 SOCKS5 支持
- **20250527**：添加 NAT64 功能
- **20240417**：修复错误代码 1101

## 技术要点

- 使用 Cloudflare Workers 的 `cloudflare:sockets` API 进行 TCP 连接
- WebSocket 协议升级处理
- VLESS 协议头部解析（snippets.js:219-251）
- SOCKS5 协议认证和连接（snippets.js:135-171）
- UDP DNS 查询代理（snippets.js:253-309）
- Base64 编码订阅链接（snippets.js:42）

## 项目结构

```
cf_snippets_proxy-nat64/
├── snippets.js          # 单一源文件，包含所有逻辑
├── README.md            # 项目说明
└── LICENSE              # MIT 许可证
```
