# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是一个基于 Cloudflare Workers 的 VLESS
协议代理实现。项目采用单文件架构（`snippets.js`），无需构建工具，可直接部署到
Cloudflare Workers 平台。

## 代码架构

### 核心组件

**主入口**（snippets.js:18-37）

- `fetch` 处理器：路由 HTTP 请求和 WebSocket 连接
  - WebSocket 请求 → `handle_ws` 函数
  - GET / → 返回 "success" 页面
  - GET /{UUID} → `handle_sub` 函数生成订阅链接

**WebSocket 处理**（snippets.js:124-416）

- `handle_ws`：VLESS 协议核心实现
  - UUID 验证（snippets.js:213-218）
  - 支持多种连接模式：direct、socks5、proxy、nat64、auto
  - 解析 SOCKS5 认证信息（snippets.js:146-158）
  - 连接策略排序（snippets.js:162-176）
  - 支持 TCP 连接和 UDP DNS 代理（snippets.js:256-356）
  - 数据流双向传输（snippets.js:175-410）

**订阅链接生成**（snippets.js:39-51）

- `handle_sub`：生成 VLESS 订阅链接
- `gen_links`：根据域名生成多个配置的 VLESS 链接，使用预设的优选域名列表

**NAT64 转换**（snippets.js:80-122）

- `convertToRouteX`：将 IPv4 地址转换为 NAT64 IPv6 地址（snippets.js:81-97）
- `resolveDomainToRouteX`：解析域名并转换为 NAT64 IPv6
  地址（snippets.js:100-122）

### 配置常量（snippets.js:1-16）

- `UUID`：VLESS 协议用户标识，需自定义修改
- `DEFAULT_PROXY_IP`：默认代理服务器地址
- `NAT64_PREFIX`：NAT64 IPv6 前缀（默认：`2602:fc59:b0:64::`）
- `BEST_DOMAINS`：优选域名/IP 列表，用于订阅链接生成

### 连接模式

支持五种模式（snippets.js:140-176）：

- `direct`：直连
- `s5`：SOCKS5 代理（格式：`user:pass@host:port` 或 `@host:port`）
- `proxy`：反向代理 IP
- `nat64`：NAT64 模式，将域名或 IPv4 转换为 NAT64 IPv6
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
- `NAT64_PREFIX`：设置 NAT64 IPv6 前缀
- `BEST_DOMAINS`：添加或修改优选域名

### 连接测试

使用不同参数测试连接模式：

- `/?mode=direct` - 仅直连
- `/?mode=s5&s5=user:pass@host:port` - 仅 SOCKS5
- `/?mode=nat64` - 仅 NAT64（将域名/IPv4 转换为 NAT64 IPv6）
- `/?mode=auto&direct&s5=user:pass@host:port` - 直连优先，回退 SOCKS5
- `/?mode=auto&nat64&direct` - NAT64 优先，回退直连
- `/?mode=auto&direct&nat64&s5=user:pass@host:port` - 组合模式示例

## 更新历史

- **20251102**：重新添加 NAT64 模式支持，参考 worker.js 实现
- **20250906**：移除"仅ProxyIP"模式
- **20250905**：添加多种代理模式配置
- **20250718**：移除 NAT64，添加 SOCKS5 支持
- **20250527**：添加 NAT64 功能
- **20240417**：修复错误代码 1101

## 技术要点

- 使用 Cloudflare Workers 的 `cloudflare:sockets` API 进行 TCP 连接
- WebSocket 协议升级处理
- VLESS 协议头部解析（snippets.js:221-253）
- SOCKS5 协议认证和连接（snippets.js:182-218）
- UDP DNS 查询代理（snippets.js:256-356）
- NAT64 IPv6 地址转换（snippets.js:81-122）
- 域名到 NAT64 的 DNS 解析（snippets.js:100-122）
- Base64 编码订阅链接（snippets.js:44）

## 项目结构

```
cf_snippets_proxy-nat64/
├── snippets.js          # 单一源文件，包含所有逻辑
├── nat64Prefix.txt      # NAT64 前缀配置文件
├── README.md            # 项目说明
├── CLAUDE.md            # Claude Code 指导文档
└── LICENSE              # MIT 许可证
```
