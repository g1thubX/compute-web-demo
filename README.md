# 0G Broker Starter Kit

这是一个使用 0G Serving Broker 的简单示例项目，专为初学者设计，展示如何构建去中心化 AI 应用。

## 功能概览

本项目实现了 0G Serving Broker 的核心功能：

1. **Broker 实例构建** - 创建和初始化 broker 连接
2. **账户充值** - 管理账本和充值 A0GI 代币
3. **服务验证** - 验证 AI 服务提供者
4. **Chat 对话** - 与 AI 模型进行交互
5. **内容验证** - 验证 AI 回复的真实性
6. **Binance FAPI 交易机器人** - 实时获取加密货币价格数据，使用 AI 模型分析并提供交易建议

## 核心概念

### 1. Broker 实例
```typescript
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';

// 使用钱包签名者创建 broker
const broker = await createZGComputeNetworkBroker(signer);
```

### 2. 账本管理
```typescript
// 创建账本并充值
await broker.ledger.addLedger(amount);

// 为已有账本充值
await broker.ledger.depositFund(amount);

// 查询账本信息
const { ledgerInfo } = await broker.ledger.ledger.getLedgerWithDetail();
```

### 3. 服务验证
```typescript
// 获取服务元数据
const metadata = await broker.inference.getServiceMetadata(providerAddress);

// 验证服务（acknowledge）
await broker.inference.acknowledge(providerAddress);

// 检查是否已验证
const isAcknowledged = await broker.inference.userAcknowledged(providerAddress);
```

### 4. Chat 对话
```typescript
// 获取请求头（包含认证信息）
const headers = await broker.inference.getRequestHeaders(
  providerAddress,
  JSON.stringify(messages)
);

// 发送请求到 AI 服务
const response = await fetch(`${endpoint}/chat/completions`, {
  method: 'POST',
  headers: { ...headers },
  body: JSON.stringify({ messages, model, stream: true })
});
```

### 5. 内容验证
```typescript
// 处理响应并验证内容
const isValid = await broker.inference.processResponse(
  providerAddress,
  responseContent,
  chatId
);
```

### 6. Binance FAPI 交易机器人
```typescript
// 从 Binance FAPI 获取最新价格
const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/price');
const priceData = await response.json();

// 使用 AI 模型分析价格数据并生成建议
const analysisPrompt = `Based on these cryptocurrency prices: ${priceData}, provide trading recommendations.`;

// 通过 Broker 调用 AI 服务进行分析
const headers = await broker.inference.getRequestHeaders(
  providerAddress,
  JSON.stringify([{ role: "user", content: analysisPrompt }])
);

const aiResponse = await fetch(`${metadata.endpoint}/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify({
    messages: [{ role: "user", content: analysisPrompt }],
    model: metadata.model,
    stream: false,
  }),
});
```

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 配置项目

1. 在 `pages/_app.tsx` 中设置 WalletConnect Project ID：
```typescript
const config = getDefaultConfig({
  appName: '0G Broker Starter Kit',
  projectId: 'YOUR_PROJECT_ID', // 从 https://cloud.walletconnect.com 获取
  chains: [zgTestnet], // 0G 测试网
  ssr: true,
});
```

### 运行项目
```bash
pnpm run dev
```

访问 http://localhost:3000

## 使用流程

1. **连接钱包** - 使用 MetaMask 或其他钱包连接到 0G 测试网
2. **创建账本** - 在"账户管理"标签页创建账本并充值 A0GI
3. **验证服务** - 在"服务验证"标签页选择并验证 AI 服务提供者
4. **开始对话** - 在"Chat 对话"标签页与 AI 进行交互
5. **验证内容** - 点击"验证内容"按钮验证 AI 回复的真实性
6. **使用交易机器人** - 在"交易机器人"标签页查询 Binance FAPI 价格数据并获取 AI 驱动的交易建议

## 交易机器人功能说明

### Binance FAPI 交易机器人

交易机器人（Trading Bot）功能允许用户实时获取 Binance FAPI 价格数据，并使用 AI 模型分析市场趋势来提供交易建议。

#### 主要功能：

1. **实时价格获取** - 从 Binance FAPI 端点获取主流交易对的最新价格
   - 支持的交易对：BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT, ADAUSDT, XRPUSDT

2. **AI 驱动的交易分析** - 使用计算网络中的 AI 模型对价格数据进行分析
   - 自动调用 broker 的 inference 服务
   - 获取 AI 模型的置信度和分析建议

3. **交易建议** - 针对每个交易对提供 BUY/SELL/HOLD 建议
   - 置信度指示（0-100%）
   - 详细的分析理由

4. **自动刷新** - 可启用自动刷新功能，定期更新价格和建议
   - 默认每 30 秒刷新一次

5. **交互式界面** - 用户可以：
   - 点击"获取并分析"按钮手动更新价格和建议
   - 从下拉菜单选择特定交易对查看详细信息
   - 启用/禁用自动刷新功能
   - 查看实时更新时间

#### 使用步骤：

1. 在"服务"标签页验证 AI 服务提供者
2. 导航到"交易机器人"标签页
3. 点击"获取并分析"按钮获取最新价格并进行分析
4. 查看返回的交易建议和置信度
5. 可选：启用自动刷新功能以持续监控市场
6. 点击特定交易对卡片以查看详细信息

#### 技术实现：

- **Binance FAPI 集成** - 通过公开 API 获取实时价格数据
- **Compute Network SDK** - 使用 @0glabs/0g-serving-broker SDK 的 inference 接口
- **自动资金管理** - 自动检查和补充子账户余额
- **响应验证** - 通过 processResponse 方法验证 AI 响应的真实性

## 项目结构

```
0g-broker-starter-kit/
├── components/                 # React 组件
│   ├── AccountTab.tsx          # 账户管理组件
│   ├── ServiceTab.tsx          # 服务验证组件
│   ├── ChatTab.tsx             # Chat 对话组件
│   └── TradingBotTab.tsx       # Binance FAPI 交易机器人组件
├── pages/                      # Next.js 页面
│   ├── _app.tsx                # 应用配置和 Wagmi/RainbowKit 设置
│   └── index.tsx               # 主页
├── styles/                     # 样式文件
│   └── globals.css             # 全局样式
├── demo-snippets/              # 教程代码片段
├── next.config.js              # Next.js 配置
├── tailwind.config.js          # Tailwind CSS 配置
├── tsconfig.json               # TypeScript 配置
└── package.json                # 项目依赖
```

## 相关资源

- [0G Labs 文档](https://docs.0g.ai)
- [0G Serving Broker NPM](https://www.npmjs.com/package/@0glabs/0g-serving-broker)
- [WalletConnect](https://cloud.walletconnect.com)
