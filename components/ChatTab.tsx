
import { useState, useEffect } from 'react';

interface ChatTabProps {
  broker: any;
  selectedProvider: any;
  message: string;
  setMessage: (message: string) => void;
}

export default function ChatTab({ 
  broker, 
  selectedProvider, 
  message, 
  setMessage 
}: ChatTabProps) {

  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingMessageId, setVerifyingMessageId] = useState<string | null>(null);

  // 重置消息历史
  useEffect(() => {
    if (selectedProvider) {
      setMessages([]);
    }
  }, [selectedProvider]);

  // 发送消息（基础版本）
  const sendMessage = async () => {
    if (!broker || !selectedProvider || !inputMessage.trim()) return;

    const userMsg = { role: "user", content: inputMessage };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);
    setMessage("正在准备请求...");

    try {
      console.log("Getting service metadata for:", selectedProvider.address);
      const metadata = await broker.inference.getServiceMetadata(selectedProvider.address);
      
      if (!metadata || !metadata.endpoint || !metadata.model) {
        throw new Error("Invalid service metadata: missing endpoint or model");
      }
      
      console.log("Service metadata:", metadata);

      const messageBody = [userMsg];
      const messageBodyStr = JSON.stringify(messageBody);
      
      console.log("Getting request headers...");
      const headers = await broker.inference.getRequestHeaders(
        selectedProvider.address,
        messageBodyStr
      );
      
      if (!headers || typeof headers !== 'object') {
        throw new Error("Invalid headers returned from getRequestHeaders");
      }
      
      console.log("Headers obtained successfully");

      let account;
      try {
        account = await broker.inference.getAccount(selectedProvider.address);
      } catch (error) {
        try {
          await broker.ledger.transferFund(
            selectedProvider.address,
            "inference",
            BigInt(2e18)
          );
          account = await broker.inference.getAccount(selectedProvider.address);
        } catch (transferError) {
          console.error("转账失败:", transferError);
          setMessage("账户初始化失败，请检查余额");
          setLoading(false);
          return;
        }
      }

      console.log("账户信息:", account);
      if (account && account.balance) {
        console.log("账户余额:", account.balance);
        if (account.balance <= BigInt(1.5e18)) {
          console.log("子账户余额不足，正在充值...");
          try {
            await broker.ledger.transferFund(
              selectedProvider.address,
              "inference",
              BigInt(2e18)
            );
          } catch (transferError) {
            console.error("补充资金失败:", transferError);
          }
        }
      }

      setMessage("正在发送消息到 AI...");

      const requestBody = {
        messages: [userMsg],
        model: metadata.model,
        stream: false,
      };

      const requestBodyStr = JSON.stringify(requestBody);

      console.log("Sending request to:", `${metadata.endpoint}/chat/completions`);
      console.log("Request headers:", headers);
      console.log("Request body:", requestBodyStr);
      console.log("Request body (parsed):", requestBody);

      // Validate request before sending
      if (!requestBody.messages || requestBody.messages.length === 0) {
        throw new Error("No messages in request body");
      }
      if (!requestBody.model) {
        throw new Error("No model specified in request");
      }

      const endpoint = metadata.endpoint.endsWith('/') 
        ? metadata.endpoint + 'chat/completions'
        : metadata.endpoint + '/chat/completions';

      console.log("Final endpoint URL:", endpoint);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...headers 
        },
        body: requestBodyStr,
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Array.from(response.headers.entries()));

      if (!response.ok) {
        let errorText = "";
        try {
          errorText = await response.text();
          console.error("API error response text:", errorText);
        } catch (e) {
          console.error("Failed to read error response text:", e);
        }
        
        const errorMessage = errorText 
          ? `API request failed with status ${response.status}: ${errorText}`
          : `API request failed with status ${response.status}`;
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("API response:", result);

      if (!result || !result.choices || !result.choices[0] || !result.choices[0].message) {
        console.error("Invalid API response structure:", result);
        throw new Error("Invalid response structure from AI API");
      }

      setMessage("收到 AI 回复，正在处理...");

      const aiMsg = {
        role: "assistant",
        content: result.choices[0].message.content,
        id: result.id,
        verified: false,
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (result.id) {
        setVerifyingMessageId(result.id);
        setMessage("正在验证响应...");

        try {
          await broker.inference.processResponse(
            selectedProvider.address,
            aiMsg.content,
            result.id
          );

          setMessages((prev) =>
            prev.map(msg =>
              msg.id === result.id
                ? { ...msg, verified: true }
                : msg
            )
          );
          setMessage("响应验证成功");
        } catch (verifyErr) {
          console.error("验证失败:", verifyErr);
          setMessage("响应验证失败");
          setMessages((prev) =>
            prev.map(msg =>
              msg.id === result.id
                ? { ...msg, verified: false, verifyError: true }
                : msg
            )
          );
        } finally {
          setVerifyingMessageId(null);
          setTimeout(() => setMessage(""), 3000);
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: "错误: " + (err instanceof Error ? err.message : String(err))
      }]);
    }
    setLoading(false);
  };

  if (!selectedProvider) {
    return (
      <div>
        <h2>AI 聊天</h2>
        <p>请先选择并验证服务</p>
      </div>
    );
  }

  return (
    <div>
      <h2>AI 聊天</h2>
      <div style={{ marginBottom: "10px", fontSize: "14px", color: "#666" }}>
        当前服务: {selectedProvider.name} - {selectedProvider.model}
      </div>
      
      <div
        style={{
          height: "300px",
          overflowY: "auto",
          border: "1px solid #ddd",
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: "#666", fontStyle: "italic" }}>
            开始与 AI 对话...
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <strong>{msg.role === "user" ? "你" : "AI"}:</strong> {msg.content}
              {msg.role === "assistant" && msg.id && (
                <span style={{ 
                  marginLeft: "10px", 
                  fontSize: "12px",
                  color: msg.verifyError ? "#dc3545" : 
                         msg.verified ? "#28a745" : 
                         verifyingMessageId === msg.id ? "#ffc107" : "#6c757d"
                }}>
                  {msg.verifyError ? "❌ 验证失败" :
                   msg.verified ? "✓ 已验证" : 
                   verifyingMessageId === msg.id ? "⏳ 验证中..." : "⚠️ 未验证"}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex" }}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
          placeholder="输入消息..."
          style={{ flex: 1, padding: "5px", marginRight: "10px" }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !inputMessage.trim()}
          style={{ padding: "5px 15px" }}
        >
          {loading ? "发送中..." : "发送"}
        </button>
      </div>
    </div>
  );
}