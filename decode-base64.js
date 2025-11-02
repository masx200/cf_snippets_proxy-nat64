#!/usr/bin/env node

/**
 * Base64 解码工具
 * 用于解码 worker.js 和 snippets.js 中的 atob() 调用
 */

console.log("=== Base64 解码结果 ===\n");

// 解码函数
function decodeBase64(encoded) {
  try {
    const decoded = atob(encoded);
    console.log(`编码: ${encoded}`);
    console.log(`解码: ${decoded}`);
    console.log("---");
    return decoded;
  } catch (e) {
    console.error(`解码失败: ${encoded}`, e.message);
    return null;
  }
}

// 解码 worker.js 中的内容
console.log("【worker.js 解码结果】\n");

// 从代码中提取的 atob() 调用
const workerBase64Strings = [
  "ZWM4NzJkOGYtNzJiMC00YTA0LWI2MTItMDMyN2Q4NWUxOGVk", // UUID
  "NDQz", // 端口号 443
  "cHJveHlpcC5hbWNsdWJzLmNhbWR2ci5vcmc=", // proxy.amclubs.camdrv.org
  "cHJveHlpcC5hbWNsdWJzLmtvem93LmNvbQ==", // proxy.amclubs.kozow.com
  "aHR0cHM6Ly8xLjEuMS4xL2Rucy1xdWVyeQ==", // https://1.1.1.1/dns-query
  "MjYwMjpmYzU5OmIwOjY0Ojo=", // NAT64前缀: 2602:fc59:b0:64::
  "aHR0cHM6Ly9za3kucmV0aGlua2Rucy5jb20vMTotUGZfX19fXzlfOEFfQU1BSWdFOGtNQUJWRERtS09IVEFLZz0=", // 某个DNS服务URL
  "5pWw5a2X5aWX5Yip", // "amclubs" (中文名)
  "EBMbCxUX", // "datatype" (XOR编码)
  "aHR0cHM6Ly95b3V0dWJlLmNvbS9AYW1fY2x1YnM/c3ViX2NvbmZpcm1hdGlvbj0x", // YouTube URL
  "aHR0cHM6Ly90Lm1lL2FtX2NsdWJz", // Telegram URL
  "aHR0cHM6Ly9naXRodWIuY29tL2FtY2x1YnMvYW0tY2YtdHVubmVs", // GitHub URL
  "aHR0cHM6Ly9hbWNsdWJzcy5jb20=", // Blog URL
  "UFJPVF9UWVBF", // "PROT_TYPE" (XOR编码)
];

console.log("ID/UUID:");
decodeBase64(workerBase64Strings[0]);

console.log("端口号:");
decodeBase64(workerBase64Strings[1]);

console.log("代理服务器地址:");
decodeBase64(workerBase64Strings[2]);
decodeBase64(workerBase64Strings[3]);

console.log("DNS查询服务:");
decodeBase64(workerBase64Strings[4]);

console.log("NAT64前缀:");
decodeBase64(workerBase64Strings[5]);

console.log("项目名称:");
decodeBase64(workerBase64Strings[7]);

console.log("相关链接:");
decodeBase64(workerBase64Strings[9]); // YouTube
decodeBase64(workerBase64Strings[10]); // Telegram
decodeBase64(workerBase64Strings[11]); // GitHub
decodeBase64(workerBase64Strings[12]); // Blog

// 解码 snippets.js 中的内容
console.log("\n\n【snippets.js 解码结果】\n");

const snippetsBase64Strings = [
  "dmxlc3M=", // "vl ess" (VLESS协议)
];

console.log("协议类型:");
decodeBase64(snippetsBase64Strings[0]);

console.log("\n=== 解码完成 ===");
console.log("\n这些字符串主要用于:");
console.log("1. 隐藏敏感配置信息 (UUID、服务器地址等)");
console.log("2. 缩短代码长度");
console.log("3. 防止简单的字符串搜索");
console.log("4. 保护项目信息 (链接、名称等)");
