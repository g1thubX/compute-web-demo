# 解决方案总结

## 错误信息含义

```
错误: API request failed with status 400: 
{"error":"Provider proxy: handle proxied service, validate request: 
insufficient balance, total fee of 400003600000000000 (including response reservation) 
exceeds the available balance of 0"}
```

### 翻译和解释

- **insufficient balance** = 余额不足
- **total fee of 400003600000000000** = 需要 0.4 个 token
- **available balance of 0** = 当前账户余额为 0

**简单来说：你需要充值账户才能使用 AI 功能**

## 解决步骤 (3 步)

### Step 1️⃣: 打开"账户"标签
- 在应用导航中找到"账户"按钮
- 点击打开账户管理页面

### Step 2️⃣: 充值账户
- 看到"充值金额"输入框
- 输入金额（推荐 **1 或 2**）
- 点击"充值"按钮
- 等待完成（显示"充值 X A0GI 成功"）

### Step 3️⃣: 返回聊天
- 充值完成后回到"聊天"标签
- 正常发送消息
- AI 应该能正常回复

## 为什么需要充值？

0G Serving Broker 是一个去中心化的 AI 服务网络。使用 AI 功能需要支付费用来：
1. 报酬服务提供者（Provider）
2. 支付网络交易费用
3. 预留响应处理费用

这与使用 ChatGPT API 等商业服务类似 - 你使用资源就需要付费。

## 费用详情

| 操作 | 费用 | 推荐余额 |
|------|------|---------|
| 单次聊天消息 | ~0.4 tokens | 1+ tokens |
| 多次调用 | ~0.4 tokens/次 | 5+ tokens |
| 连续使用 | 按调用次数累计 | 10+ tokens |

## 测试 Token 获取

如果你在 **0G 测试网络**：

1. 访问 0G 官方水龙头
2. 输入你的钱包地址
3. 等待 token 发送到账户
4. 然后按上面的 3 步进行充值

## 新增的代码改进

我已经改进了错误处理，现在会更清晰地提示：

```typescript
if (apiError.includes("insufficient balance")) {
  errorMessage = "余额不足：请先在\"账户\"标签中充值，需要至少 0.5 个 token";
}
```

这样用户会看到更友好的错误提示，而不是原始的 JSON 错误。

## 常见问题

**Q: 为什么显示需要 0.4 个 token？**
A: 这是 API 调用的实际成本。不同的请求可能成本略有不同。

**Q: 充值后还是报同样的错误？**
A: 
1. 确认交易已完成（刷新页面）
2. 检查浏览器地址栏中的网络是否正确
3. 查看账户标签中的余额是否确实增加了

**Q: 如何知道我的余额是多少？**
A: 打开"账户"标签，顶部会显示 "余额: X.XXXX A0GI (总计: X.XXXX)"

**Q: 一次充值 0.5 个 token 够用吗？**
A: 够用一次调用。如果要多次使用，建议充值 1-2 个。

## 验证流程

按照以下步骤验证一切正常：

1. ✓ 连接钱包
2. ✓ 获得测试 token （如果在测试网）
3. ✓ 在"账户"标签充值 1-2 个 token
4. ✓ 在"服务"标签选择服务
5. ✓ 点击"验证服务"
6. ✓ 在"聊天"标签发送消息 "你好"
7. ✓ 收到 AI 回复并显示"响应验证成功"

如果全部完成，说明系统工作正常！

## 需要帮助？

查看详细文档：
- `BALANCE_TROUBLESHOOTING.md` - 详细的故障排除指南
- `TESTING_GUIDE.md` - 完整的测试指南
- 浏览器 Console (F12) - 查看详细的日志信息
