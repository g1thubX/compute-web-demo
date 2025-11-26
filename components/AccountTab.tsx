
import { useState, useEffect } from 'react';

interface AccountTabProps {
  broker: any;
  message: string;
  setMessage: (message: string) => void;
  selectedProvider?: any;
}

interface BalanceInfo {
  main: {
    total: number;
    available: number;
  };
  inference?: {
    balance: number;
  };
}

export default function AccountTab({ broker, message, setMessage, selectedProvider }: AccountTabProps) {

  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // 获取主账户和推理子账户余额
  const fetchBalance = async () => {
    if (!broker) return;

    try {
      // 获取主账户余额
      const { ledgerInfo } = await broker.ledger.ledger.getLedgerWithDetail();
      const mainTotal = Number(ledgerInfo[0]) / 1e18;
      const mainLocked = Number(ledgerInfo[1]) / 1e18;

      const balanceInfo: BalanceInfo = {
        main: {
          total: mainTotal,
          available: mainTotal - mainLocked,
        },
      };

      // 如果有选择的服务提供者，尝试获取推理子账户余额
      if (selectedProvider?.address) {
        try {
          const inferenceAccount = await broker.inference.getAccount(selectedProvider.address);
          if (inferenceAccount && inferenceAccount.balance) {
            balanceInfo.inference = {
              balance: Number(inferenceAccount.balance) / 1e18,
            };
          }
        } catch (err) {
          console.log("推理子账户不存在或获取失败:", err);
          // 子账户可能不存在，不影响主账户显示
        }
      }

      setBalance(balanceInfo);
    } catch (err) {
      console.error("获取余额失败:", err);
      setBalance(null);
    }
  };

  // 充值
  const handleDeposit = async () => {
    if (!broker || !depositAmount) return;

    setLoading(true);
    setMessage("正在处理充值...");
    try {
      const amount = parseFloat(depositAmount);

      // 检查是否有账本
      let hasLedger = false;
      try {
        await broker.ledger.ledger.getLedgerWithDetail();
        hasLedger = true;
      } catch {}

      if (hasLedger) {
        console.log("向主账户充值", amount, "个 token");
        await broker.ledger.depositFund(amount);
      } else {
        console.log("创建主账户并充值", amount, "个 token");
        await broker.ledger.addLedger(amount);
      }

      setMessage(`✓ 充值 ${amount} A0GI 成功`);
      setDepositAmount("");
      
      // 等待一下让交易生效
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 重新获取余额
      await fetchBalance();

      // 如果有选择的服务提供者，自动转账到推理子账户
      if (selectedProvider?.address && balance?.main?.available) {
        setMessage("✓ 充值成功，正在初始化推理子账户...");
        try {
          console.log("自动转账到推理子账户");
          await broker.ledger.transferFund(
            selectedProvider.address,
            "inference",
            BigInt(1e18) // 转 1 个 token
          );
          setMessage("✓ 充值成功，推理子账户已初始化");
          
          // 再等一下并刷新余额
          await new Promise(resolve => setTimeout(resolve, 1000));
          await fetchBalance();
        } catch (transferErr) {
          console.log("推理子账户初始化失败（可能已存在）:", transferErr);
          await fetchBalance();
        }
      }
    } catch (err) {
      console.error("充值失败:", err);
      setMessage("充值失败: " + (err instanceof Error ? err.message : String(err)));
    }
    setLoading(false);
  };

  // 手动转账到推理子账户
  const handleTransferToInference = async () => {
    if (!broker || !selectedProvider?.address) {
      setMessage("请先选择服务");
      return;
    }

    setLoading(true);
    setMessage("正在转账到推理子账户...");
    try {
      console.log("手动转账 1 个 token 到推理子账户");
      await broker.ledger.transferFund(
        selectedProvider.address,
        "inference",
        BigInt(1e18)
      );
      setMessage("✓ 成功转账 1 个 token 到推理子账户");
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchBalance();
    } catch (err) {
      console.error("转账失败:", err);
      setMessage("转账失败: " + (err instanceof Error ? err.message : String(err)));
    }
    setLoading(false);
  };

  // 自动获取余额
  useEffect(() => {
    fetchBalance();
  }, [broker, selectedProvider]);

  
  
  return (
    <div>
      <h2>账户余额</h2>
      
      {balance ? (
        <div style={{ marginBottom: "20px" }}>
          {/* 主账户余额 */}
          <div style={{ 
            padding: "10px", 
            background: "#f0f0f0", 
            marginBottom: "10px",
            borderRadius: "4px",
            border: "1px solid #ddd"
          }}>
            <strong>主账户 (Main Account):</strong>
            <div style={{ marginTop: "5px", fontSize: "14px" }}>
              可用: {balance.main.available.toFixed(4)} A0GI
            </div>
            <div style={{ marginTop: "2px", fontSize: "14px", color: "#666" }}>
              总计: {balance.main.total.toFixed(4)} A0GI
            </div>
          </div>

          {/* 推理子账户余额 */}
          <div style={{ 
            padding: "10px", 
            background: balance.inference ? "#e8f5e9" : "#fff3e0",
            marginBottom: "10px",
            borderRadius: "4px",
            border: "1px solid " + (balance.inference ? "#4caf50" : "#ff9800")
          }}>
            <strong>推理子账户 (Inference Sub-Account):</strong>
            <div style={{ marginTop: "5px", fontSize: "14px" }}>
              {balance.inference ? (
                <>
                  余额: {balance.inference.balance.toFixed(4)} A0GI
                  {balance.inference.balance >= 0.5 ? (
                    <span style={{ color: "#4caf50", marginLeft: "10px" }}>✓ 充足</span>
                  ) : (
                    <span style={{ color: "#ff9800", marginLeft: "10px" }}>⚠ 不足</span>
                  )}
                </>
              ) : (
                <span style={{ color: "#666" }}>未初始化（需要转账）</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p>暂无账本</p>
      )}

      {/* 充值区域 */}
      <div style={{ 
        padding: "15px", 
        background: "#f9f9f9", 
        borderRadius: "4px",
        border: "1px solid #ddd",
        marginBottom: "15px"
      }}>
        <strong>充值主账户:</strong>
        <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="输入充值金额"
            style={{ 
              padding: "8px", 
              flex: 1,
              border: "1px solid #ccc",
              borderRadius: "4px"
            }}
          />
          <button
            onClick={handleDeposit}
            disabled={loading}
            style={{ 
              padding: "8px 20px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "处理中..." : "充值"}
          </button>
        </div>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
          推荐充值金额: 2-5 个 token
        </div>
      </div>

      {/* 手动转账到子账户 */}
      {selectedProvider?.address && (
        <div style={{ 
          padding: "15px", 
          background: "#f3e5f5", 
          borderRadius: "4px",
          border: "1px solid #ce93d8"
        }}>
          <strong>推理子账户初始化:</strong>
          <div style={{ marginTop: "10px" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
              当前服务: <span style={{ color: "#7c4dff" }}>{selectedProvider.name || selectedProvider.address.substring(0, 10) + "..."}</span>
            </p>
            <button
              onClick={handleTransferToInference}
              disabled={loading || !balance?.main?.available || balance.main.available < 1}
              style={{ 
                padding: "8px 20px",
                background: (balance?.inference && balance.inference.balance >= 0.5) ? "#4caf50" : "#ff9800",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: (loading || !balance?.main?.available || balance.main.available < 1) ? 0.6 : 1
              }}
            >
              {(balance?.inference && balance.inference.balance >= 0.5) ? "✓ 已充足" : loading ? "转账中..." : "转账 1 token 到推理子账户"}
            </button>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
              {balance?.main?.available && balance.main.available < 1 
                ? "❌ 主账户余额不足，请先充值"
                : "✓ 会将 1 个 token 转移到推理子账户"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}