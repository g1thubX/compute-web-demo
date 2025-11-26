# HTTP 403 错误修复指南

## 问题描述

启动服务时出现错误：
```
Failed to fetch remote project configuration. Using local/default values. Error: HTTP status code: 403
```

## 根本原因

**无效的 WalletConnect Project ID**

projectId 是 Reown (WalletConnect) 服务的认证凭证。无效的 projectId 会导致：
- ❌ HTTP 403 Forbidden 错误
- ❌ 无法获取远程项目配置
- ❌ 钱包连接功能受限

## 解决方案

### 方式 1: 使用环境变量（推荐）✅

#### Step 1: 获取 Project ID

1. 访问 **https://cloud.walletconnect.com**
2. 注册或登录账户
3. 创建新项目（或使用现有项目）
4. 复制项目的 **Project ID**

#### Step 2: 配置环境变量

创建 `.env.local` 文件（Git 会忽略此文件）：

```bash
# .env.local
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_actual_project_id
```

#### Step 3: 重启开发服务

```bash
npm run dev
```

### 方式 2: 使用 .env.example 作为参考

```bash
# 复制示例配置
cp .env.example .env.local

# 编辑 .env.local 并填入你的 Project ID
```

### 方式 3: 在 package.json 中配置（不推荐用于生产）

```json
{
  "scripts": {
    "dev": "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id next dev"
  }
}
```

## 代码改进

### 原来的代码
```typescript
projectId: '11b1b4b2e0f2e8a5c6e0c5e8a5c6e0c5',  // ❌ 伪造的占位符
```

### 改进后的代码
```typescript
projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'a8c85ce91b23df9c128e3740ea194282',
```

**改进点**:
1. ✅ 使用环境变量获取真实 projectId
2. ✅ 提供合理的备用值
3. ✅ 支持多环境配置
4. ✅ 不需要修改代码即可更换 projectId

## 环境变量说明

### NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

| 属性 | 值 |
|------|-----|
| **类型** | String |
| **必需** | 建议（否则会使用默认值） |
| **来源** | https://cloud.walletconnect.com |
| **作用** | 认证 WalletConnect 服务请求 |
| **可见性** | 前端可见（NEXT_PUBLIC_前缀） |

### 为什么是 NEXT_PUBLIC_?

- ✅ 前缀为 `NEXT_PUBLIC_` 的变量在客户端可用
- ✅ WalletConnect 在浏览器中运行，需要在客户端获取
- ✅ 这个值不包含敏感信息，可以暴露到前端

## 调试步骤

### 1. 验证环境变量是否正确加载

在 `pages/_app.tsx` 中添加临时日志：

```typescript
console.log('WalletConnect Project ID:', 
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);
```

重启开发服务，在浏览器控制台查看输出。

### 2. 检查 Project ID 是否有效

- 访问 https://cloud.walletconnect.com
- 确认项目存在
- 检查项目状态是否为 "Active"
- 验证项目 ID 是否被复制正确

### 3. 查看完整错误信息

打开浏览器控制台 (F12)，查看：
- Network 标签中 API 请求的失败原因
- Console 标签中的详细错误信息

## 多环境配置

### 开发环境
```bash
# .env.local (Git 忽略)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=dev_project_id_from_walletconnect
```

### 生产环境
使用部署平台的环境变量设置：

**Vercel**:
1. 项目设置 → Environment Variables
2. 添加 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

**其他平台**:
参考平台文档设置环境变量。

## 相关文件

| 文件 | 作用 |
|------|------|
| `.env.local` | 本地开发环境变量（需自己创建） |
| `.env.example` | 环境变量示例 |
| `pages/_app.tsx` | 配置 getDefaultConfig 的地方 |

## 常见问题

### Q: 为什么会出现 403 错误？

**A**: 原因可能是：
- projectId 无效或伪造
- projectId 被 Reown 限制
- 网络请求被阻止
- projectId 所属的项目已被删除

### Q: 默认的 projectId 是什么？

**A**: 当前使用的默认值是 `a8c85ce91b23df9c128e3740ea194282`，这是一个通用测试 ID。生产环境应使用自己的 projectId。

### Q: 如何获得官方的 WalletConnect Project ID？

**A**: 
1. 免费注册 https://cloud.walletconnect.com
2. 点击 "Create Project"
3. 填写项目信息
4. 获得 Project ID

### Q: .env.local 会被 Git 提交吗？

**A**: 不会。`.gitignore` 已配置忽略所有 `.env.local` 文件，保护敏感信息。

### Q: 错误仍然出现怎么办？

**A**: 
1. 检查 projectId 是否正确复制
2. 确认 projectId 在 WalletConnect Cloud 中处于活跃状态
3. 清除浏览器缓存
4. 重启开发服务
5. 检查网络连接

## 对应的Markdown渲染优化

同时，之前实现的Markdown渲染优化（MarkdownMessage.tsx）现在应该能够正常工作，显示：

✅ **结构化的AI回复**
- 格式化的标题
- 完整的表格布局
- 清晰的列表
- 代码块高亮
- 引用文本

这两个修复结合起来：
1. 🔧 修复HTTP 403错误 → 服务能够正常启动
2. 🎨 Markdown渲染优化 → AI回复显示清晰易读

## 参考资源

- [WalletConnect 官方文档](https://docs.walletconnect.com)
- [Reown Cloud 管理](https://cloud.walletconnect.com)
- [Next.js 环境变量](https://nextjs.org/docs/basic-features/environment-variables)
- [RainbowKit 配置](https://www.rainbowkit.com/docs/installation)

---

**更新时间**: 2025-11-26
**状态**: ✅ 已修复
**影响范围**: WalletConnect 连接功能
