/**
 * Cloudflare Workers VLESS 协议代理（简化版）
 * ================================
 *
 * 功能特性:
 * - VLESS 协议支持（无加密的轻量级代理协议）
 * - WebSocket 数据转发
 * - NAT64 IPv6 转换（将 IPv4 地址转换为 NAT64 IPv6）
 * - SOCKS5 代理支持
 * - 多种连接模式：直连、SOCKS5、代理、NAT64、自动模式
 * - 自动生成 VLESS 订阅链接
 * - DNS over HTTPS (DoH) 代理
 *
 * 项目特色:
 * - 单文件架构，无需构建工具
 * - 可直接在 Cloudflare Workers 上部署
 * - 支持自动回退机制
 * - 优选域名自动配置
 */

// ============ 导入 Cloudflare Workers API ============

// 导入 socket 连接模块，用于建立 TCP/UDP 连接
import { connect } from "cloudflare:sockets";

// ============ 配置常量 ============

// VLESS 用户 ID（UUID 格式）
const UUID = "1f9d104e-ca0e-4202-ba4b-a0afb969c747";

// 默认代理服务器 IP
// 当直连失败时的备用代理服务器
const DEFAULT_PROXY_IP = "bestproxy.030101.xyz:443"; // 来源：https://ipdb.030101.xyz/bestdomain/

// NAT64 IPv6 前缀
// Cloudflare 的 NAT64 前缀，用于将 IPv4 地址转换为 IPv6
const NAT64_PREFIX = "2602:fc59:b0:64::";

// 优选域名/IP 列表
// 用于生成 VLESS 订阅链接，提供多个配置选项
const BEST_DOMAINS = [
  "bestcf.030101.xyz:443",   // 优选 CF 域名
  "japan.com:443",           // 日本节点
  "www.visa.com.sg:443",     // 新加坡签证网站
  "www.visa.com.hk:443",     // 香港签证网站
  "icook.hk:443",            // 香港 iCook 网站
  "icook.tw:443",            // 台湾 iCook 网站
];

// ============ 主入口函数 ============

/**
 * Cloudflare Workers 主请求处理函数
 * 每个 HTTP 请求都会调用此函数
 * @param {Request} req - 传入的 HTTP 请求
 * @returns {Response} HTTP 响应
 */
export default {
  async fetch(req) {
    const u = new URL(req.url);

    // 处理 WebSocket 请求（VLESS 代理的主要流量）
    if (req.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      return await handle_ws(req);
    }
    // 处理 HTTP GET 请求
    else if (req.method === "GET") {
      // 根路径：返回成功页面
      if (u.pathname === "/") {
        const html = "<h1>success</h1>";
        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      // 订阅路径：生成 VLESS 订阅链接
      // 格式: /{UUID}
      else if (u.pathname.toLowerCase().includes(`/${UUID}`)) {
        return await handle_sub(req);
      }
    }

    // 其他情况返回 404 错误
    return new Response("error", { status: 404 });
  },
};

// ============ 订阅链接处理 ============

/**
 * 处理订阅链接请求
 * 访问 /{UUID} 时调用，返回 Base64 编码的 VLESS 订阅链接
 * @param {Request} req - HTTP 请求
 * @returns {Response} 订阅链接响应
 */
async function handle_sub(req) {
  const url = new URL(req.url);
  // 获取当前 Workers 的域名
  const workerDomain = url.hostname;

  // 生成 VLESS 订阅链接
  let links = gen_links(workerDomain);

  // 将链接数组转换为 Base64 编码的文本
  // 这是标准 VLESS 订阅格式
  let content = btoa(links.join("\n"));

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

/**
 * 生成 VLESS 订阅链接
 * 根据优选域名列表生成多个 VLESS 配置链接
 * @param {string} workerDomain - 当前 Workers 域名
 * @returns {Array<string>} VLESS 链接数组
 */
function gen_links(workerDomain) {
  let links = [];
  let i = 0;

  // WebSocket 路径（使用 2048 字节的 Early Data）
  const wsPath = encodeURIComponent("/?ed=2048");

  // 解码协议类型（Base64 编码的 "vless"）
  const proto = atob("dmxlc3M=");

  // 遍历优选域名列表，为每个域名生成一个 VLESS 链接
  BEST_DOMAINS.forEach((item) => {
    i += 1;
    // 生成配置名称
    let name = "snippet_" + i;

    // WebSocket 参数配置
    const wsParams = new URLSearchParams({
      encryption: "none",      // 无加密（VLESS 特性）
      security: "tls",         // 使用 TLS 加密
      sni: workerDomain,       // SNI 指纹
      fp: "chrome",            // 浏览器指纹
      type: "ws",              // WebSocket 类型
      host: workerDomain,      // 主机头
      path: wsPath,            // WebSocket 路径
    });

    // 拼接 VLESS 链接
    // 格式: vless://UUID@server:port?params#name
    links.push(
      `${proto}://${UUID}@${item}?${wsParams.toString()}#${
        encodeURIComponent(name)
      }`,
    );
  });

  return links;
}

// ============ NAT64 IPv6 转换函数 ============

/**
 * 将 IPv4 地址转换为 NAT64 IPv6 地址
 * NAT64 是一种 IPv6 转换技术，将 IPv4 地址嵌入到 IPv6 前缀中
 * 例如: 192.168.1.1 → 2602:fc59:b0:64::c0a8:0101
 * @param {string} ipv4Address - IPv4 地址字符串
 * @returns {string} NAT64 IPv6 地址（带方括号）
 * @throws {Error} IPv4 格式无效
 */
function convertToRouteX(ipv4Address) {
  // 分割 IPv4 地址
  const parts = ipv4Address.trim().split(".");
  if (parts.length !== 4) {
    throw new Error("Invalid IPv4 address");
  }

  // 验证每个段并转换为十六进制
  const hexParts = parts.map((part) => {
    const num = Number(part);
    if (!/^\d+$/.test(part) || isNaN(num) || num < 0 || num > 255) {
      throw new Error(`Invalid IPv4 segment: ${part}`);
    }
    // 转换为两位十六进制，不足补零
    return num.toString(16).padStart(2, "0");
  });

  // 构造 IPv6 的后缀部分
  // 格式: aabb:ccdd (每两个字节一组)
  const ipv6Tail = `${hexParts[0]}${hexParts[1]}:${hexParts[2]}${hexParts[3]}`
    .toLowerCase();

  // 组合完整的 IPv6 地址
  const fullIPv6 = `${NAT64_PREFIX}${ipv6Tail}`;

  // 返回带方括号的 IPv6 地址（符合 RFC 标准）
  return `[${fullIPv6}]`;
}

/**
 * 解析域名到 NAT64 IPv6 地址
 * 通过 DNS over HTTPS 查询域名的 A 记录，然后转换为 NAT64 IPv6
 * @param {string} domain - 要解析的域名
 * @returns {Promise<string>} NAT64 IPv6 地址
 * @throws {Error} 域名解析失败
 */
async function resolveDomainToRouteX(domain) {
  try {
    // 使用 Cloudflare DoH 服务查询 A 记录
    const response = await fetch(
      `https://1.1.1.1/dns-query?name=${domain}&type=A`,
      {
        headers: {
          Accept: "application/dns-json",
        },
      },
    );

    // 检查 DNS 查询响应
    if (!response.ok) {
      throw new Error(`DNS query failed with status code: ${response.status}`);
    }

    // 解析 DNS 响应
    const result = await response.json();

    // 查找 A 记录（type = 1）
    const aRecord = result?.Answer?.find((record) =>
      record.type === 1 && record.data
    );

    if (!aRecord) {
      throw new Error("No valid A record found");
    }

    // 获取 IPv4 地址并转换为 NAT64 IPv6
    const ipv4 = aRecord.data;
    const ipv6 = convertToRouteX(ipv4);
    return ipv6;
  } catch (err) {
    throw new Error(`Domain resolution failed: ${err.message}`);
  }
}

// ============ WebSocket 处理函数 ============

/**
 * 处理 WebSocket 连接（VLESS 代理的核心逻辑）
 * 负责解析 VLESS 协议、建立连接、转发数据
 * @param {Request} req - WebSocket 请求
 * @returns {Response} WebSocket 响应
 */
async function handle_ws(req) {
  // 创建 WebSocket 对
  const [client, ws] = Object.values(new WebSocketPair());
  ws.accept();

  const u = new URL(req.url);

  // 修复处理 URL 编码的查询参数
  // 处理路径中包含 %3F (?) 的情况
  if (u.pathname.includes("%3F")) {
    const decoded = decodeURIComponent(u.pathname);
    const queryIndex = decoded.indexOf("?");
    if (queryIndex !== -1) {
      u.search = decoded.substring(queryIndex);
      u.pathname = decoded.substring(0, queryIndex);
    }
  }

  // ============ 解析连接参数 ============

  // 连接模式：direct、s5、proxy、nat64、auto
  const mode = u.searchParams.get("mode") || "proxy";
  // SOCKS5 代理参数
  const s5Param = u.searchParams.get("s5");
  // 代理服务器参数
  const proxyParam = u.searchParams.get("proxyip");

  // 提取路径中的 SOCKS5 配置或使用参数
  const path = s5Param ? s5Param : u.pathname.slice(1);

  // ============ 解析 SOCKS5 配置 ============
  // 格式: user:pass@host:port 或 host:port
  const socks5 = path.includes("@")
    ? (() => {
      const [cred, server] = path.split("@");
      const [user, pass] = cred.split(":");
      const [host, port = 443] = server.split(":");
      return {
        user,
        pass,
        host,
        port: +port,
      };
    })()
    : null;

  // 设置代理服务器 IP
  const PROXY_IP = proxyParam ? String(proxyParam) : DEFAULT_PROXY_IP;

  // ============ 获取连接顺序 ============
  // auto 模式根据 URL 参数位置确定回退顺序
  const getOrder = () => {
    // proxy 模式默认: 直连 → 代理
    if (mode === "proxy") return ["direct", "proxy"];
    // 非 auto 模式只使用指定模式
    if (mode !== "auto") return [mode];

    // auto 模式：按参数出现顺序确定
    const order = [];
    const searchStr = u.search.slice(1);
    for (const pair of searchStr.split("&")) {
      const key = pair.split("=")[0];
      if (key === "direct") order.push("direct");
      else if (key === "s5") order.push("s5");
      else if (key === "proxyip") order.push("proxy");
      else if (key === "nat64") order.push("nat64");
    }
    // 没有参数时默认 direct
    return order.length ? order : ["direct"];
  };

  // ============ 状态变量 ============

  let remote = null,      // 远程连接 socket
    udpWriter = null,      // UDP 写入器（用于 DNS 代理）
    isDNS = false;         // 是否为 DNS 请求

  // ============ SOCKS5 连接函数 ============

  /**
   * 建立 SOCKS5 代理连接
   * @param {string} targetHost - 目标主机
   * @param {number} targetPort - 目标端口
   * @returns {Promise<Socket>} 连接的 socket 对象
   */
  const socks5Connect = async (targetHost, targetPort) => {
    // 连接到 SOCKS5 代理服务器
    const sock = connect({
      hostname: socks5.host,
      port: socks5.port,
    });
    await sock.opened;

    const w = sock.writable.getWriter();
    const r = sock.readable.getReader();

    // 步骤1: 发送 SOCKS5 greeting（版本5，支持认证）
    await w.write(new Uint8Array([5, 2, 0, 2]));

    // 步骤2: 处理认证方法协商
    const auth = (await r.read()).value;
    // 如果服务器要求认证 (方法 0x02)
    if (auth[1] === 2 && socks5.user) {
      const user = new TextEncoder().encode(socks5.user);
      const pass = new TextEncoder().encode(socks5.pass);

      // 发送用户名密码认证请求
      await w.write(
        new Uint8Array([1, user.length, ...user, pass.length, ...pass]),
      );

      // 等待认证结果
      await r.read();
    }

    // 步骤3: 发送连接请求 (CONNECT command)
    const domain = new TextEncoder().encode(targetHost);
    await w.write(
      new Uint8Array([
        5,                  // SOCKS 版本 5
        1,                  // CONNECT 命令
        0,                  // 保留
        3,                  // 地址类型：域名
        domain.length,      // 域名长度
        ...domain,          // 域名
        targetPort >> 8,    // 端口高字节
        targetPort & 0xff,  // 端口低字节
      ]),
    );

    // 等待连接结果
    await r.read();

    // 释放资源
    w.releaseLock();
    r.releaseLock();

    return sock;
  };

  // ============ WebSocket 数据流处理 ============

  // 创建可读流处理 WebSocket 数据
  new ReadableStream({
    start(ctrl) {
      // 监听 WebSocket 消息
      ws.addEventListener("message", (e) => ctrl.enqueue(e.data));
      // WebSocket 关闭时清理资源
      ws.addEventListener("close", () => {
        remote?.close();
        ctrl.close();
      });
      // WebSocket 错误时清理资源
      ws.addEventListener("error", () => {
        remote?.close();
        ctrl.error();
      });

      // 处理 Early Data (0-RTT)
      // 用于减少连接延迟的预加载数据
      const early = req.headers.get("sec-websocket-protocol");
      if (early) {
        try {
          // Base64 解码并转换为 ArrayBuffer
          ctrl.enqueue(
            Uint8Array.from(
              atob(early.replace(/-/g, "+").replace(/_/g, "/")),
              (c) => c.charCodeAt(0),
            ).buffer,
          );
        } catch {}
      }
    },
  }).pipeTo(
    // 可写流：处理 VLESS 协议和数据转发
    new WritableStream({
      async write(data) {
        // ============ 数据转发逻辑 ============

        // 如果是 DNS 请求，使用 UDP 写入器
        if (isDNS) return udpWriter?.write(data);

        // 如果已建立远程连接，直接转发数据
        if (remote) {
          const w = remote.writable.getWriter();
          await w.write(data);
          w.releaseLock();
          return;
        }

        // 数据太短，不是有效的 VLESS 协议数据
        if (data.byteLength < 24) return;

        // ============ 解析 VLESS 请求头 ============

        // 验证 UUID（位置: 1-16 字节）
        const uuidBytes = new Uint8Array(data.slice(1, 17));
        const expectedUUID = UUID.replace(/-/g, "");
        for (let i = 0; i < 16; i++) {
          if (
            uuidBytes[i] !== parseInt(expectedUUID.substr(i * 2, 2), 16)
          ) return;
        }

        // 解析 VLESS 协议头
        const view = new DataView(data);
        const optLen = view.getUint8(17);            // 选项长度
        const cmd = view.getUint8(18 + optLen);       // 命令类型 (1=TCP, 2=UDP)

        // 只支持 TCP CONNECT 和 UDP 关联
        if (cmd !== 1 && cmd !== 2) return;

        // ============ 解析目标地址 ============

        let pos = 19 + optLen;                       // 起始位置
        const port = view.getUint16(pos);            // 端口号
        const type = view.getUint8(pos + 2);         // 地址类型
        pos += 3;

        let addr = "";                               // 目标地址
        if (type === 1) {
          // IPv4 地址 (4 字节)
          addr = `${view.getUint8(pos)}.${view.getUint8(pos + 1)}.${
            view.getUint8(pos + 2)
          }.${view.getUint8(pos + 3)}`;
          pos += 4;
        } else if (type === 2) {
          // 域名 (1 字节长度 + 字符串)
          const len = view.getUint8(pos++);
          addr = new TextDecoder().decode(data.slice(pos, pos + len));
          pos += len;
        } else if (type === 3) {
          // IPv6 地址 (16 字节)
          const ipv6 = [];
          for (let i = 0; i < 8; i++, pos += 2) {
            ipv6.push(
              view.getUint16(pos)
                .toString(16),
            );
          }
          addr = ipv6.join(":");
        } else return; // 不支持的地址类型

        // 提取协议头和负载数据
        const header = new Uint8Array([data[0], 0]);  // 响应头
        const payload = data.slice(pos);              // 实际负载

        // ============ 处理 UDP DNS 请求 ============

        // UDP 命令：DNS 代理（端口 53）
        if (cmd === 2) {
          if (port !== 53) return;  // 只允许 DNS 端口
          isDNS = true;

          let sent = false;
          // 创建转换流拆分 UDP 数据包
          const {
            readable,
            writable,
          } = new TransformStream({
            transform(chunk, ctrl) {
              // 解析 UDP 包长度前缀
              for (let i = 0; i < chunk.byteLength;) {
                const len = new DataView(chunk.slice(i, i + 2))
                  .getUint16(0);
                ctrl.enqueue(chunk.slice(i + 2, i + 2 + len));
                i += 2 + len;
              }
            },
          });

          // 将 DNS 查询转发到 DoH 服务
          readable.pipeTo(
            new WritableStream({
              async write(query) {
                try {
                  const resp = await fetch(
                    "https://1.1.1.1/dns-query",
                    {
                      method: "POST",
                      headers: {
                        "content-type": "application/dns-message",
                      },
                      body: query,
                    },
                  );
                  if (ws.readyState === 1) {
                    const result = new Uint8Array(
                      await resp.arrayBuffer(),
                    );
                    // 发送 DNS 响应
                    ws.send(
                      new Uint8Array([
                        ...(sent ? [] : header),
                        result.length >> 8,  // 长度高字节
                        result.length & 0xff, // 长度低字节
                        ...result,
                      ]),
                    );
                    sent = true;
                  }
                } catch {}
              },
            }),
          );
          udpWriter = writable.getWriter();
          return udpWriter.write(payload);
        }

        // ============ 处理 TCP 连接 ============

        // 尝试各种连接方式直到成功
        let sock = null;
        for (const method of getOrder()) {
          try {
            // 方式1: 直连
            if (method === "direct") {
              sock = connect({
                hostname: addr,
                port,
              });
              await sock.opened;
              break;
            }
            // 方式2: SOCKS5 代理
            else if (method === "s5" && socks5) {
              sock = await socks5Connect(addr, port);
              break;
            }
            // 方式3: 代理服务器
            else if (method === "proxy" && PROXY_IP) {
              const [ph, pp = port] = PROXY_IP.split(":");
              sock = connect({
                hostname: ph,
                port: +pp || port,
              });
              await sock.opened;
              break;
            }
            // 方式4: NAT64 模式
            else if (method === "nat64") {
              let targetHost = addr;

              // 如果是域名，解析为 NAT64 IPv6
              if (type === 2) {
                targetHost = await resolveDomainToRouteX(addr);
              } else if (type === 1) {
                // 如果是 IPv4，转换为 NAT64 IPv6
                targetHost = convertToRouteX(addr);
              }
              // 如果是 IPv6，直接使用

              sock = connect({
                hostname: targetHost,
                port,
              });
              await sock.opened;
              break;
            }
          } catch {}
        }

        // 所有方式都失败
        if (!sock) return;

        // ============ 建立数据流转发 ============

        remote = sock;
        const w = sock.writable.getWriter();
        await w.write(payload);  // 发送初始数据
        w.releaseLock();

        let sent = false;
        // 转发远程数据到 WebSocket
        sock.readable.pipeTo(
          new WritableStream({
            write(chunk) {
              if (ws.readyState === 1) {
                ws.send(
                  sent
                    ? chunk
                    : new Uint8Array([...header, ...new Uint8Array(chunk)]),
                );
                sent = true;
              }
            },
            close: () => ws.readyState === 1 && ws.close(),
            abort: () => ws.readyState === 1 && ws.close(),
          }),
        ).catch(() => {});
      },
    }),
  ).catch(() => {});

  // 返回 WebSocket 响应
  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}
