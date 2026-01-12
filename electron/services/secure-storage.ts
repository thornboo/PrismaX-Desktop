/**
 * 安全存储服务
 *
 * 使用 Electron 的 safeStorage API 加密敏感数据
 * safeStorage 使用操作系统的密钥链（macOS Keychain, Windows DPAPI, Linux Secret Service）
 */

import { safeStorage } from "electron";

/**
 * 检查加密是否可用
 */
export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

/**
 * 加密字符串
 * @returns Base64 编码的加密数据，如果加密不可用则返回原文
 */
export function encryptString(plainText: string): string {
  if (!plainText) return "";

  if (!safeStorage.isEncryptionAvailable()) {
    console.warn("[SecureStorage] 加密不可用，将以明文存储");
    return plainText;
  }

  try {
    const encrypted = safeStorage.encryptString(plainText);
    // 添加前缀标识这是加密数据
    return `encrypted:${encrypted.toString("base64")}`;
  } catch (error) {
    console.error("[SecureStorage] 加密失败:", error);
    return plainText;
  }
}

/**
 * 解密字符串
 * @returns 解密后的明文
 */
export function decryptString(encryptedText: string): string {
  if (!encryptedText) return "";

  // 检查是否是加密数据
  if (!encryptedText.startsWith("encrypted:")) {
    // 不是加密数据，直接返回（兼容旧数据）
    return encryptedText;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    console.warn("[SecureStorage] 加密不可用，无法解密");
    return "";
  }

  try {
    const base64Data = encryptedText.slice("encrypted:".length);
    const buffer = Buffer.from(base64Data, "base64");
    return safeStorage.decryptString(buffer);
  } catch (error) {
    console.error("[SecureStorage] 解密失败:", error);
    return "";
  }
}
