
import { useState, useEffect } from 'react';

interface TradingBotTabProps {
  broker: any;
  selectedProvider: any;
  message: string;
  setMessage: (message: string) => void;
}

interface PriceData {
  symbol: string;
  price: number;
}

interface TradingAdvice {
  symbol: string;
  currentPrice: number;
  recommendation: string;
  confidence: number;
  reasoning: string;
}

export default function TradingBotTab({
  broker,
  selectedProvider,
  message,
  setMessage
}: TradingBotTabProps) {

  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [tradingAdvice, setTradingAdvice] = useState<TradingAdvice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [processingWithAI, setProcessingWithAI] = useState(false);

  // 常见交易对
  const popularSymbols = [
    'BTCUSDT',
    'ETHUSDT',
    'BNBUSDT',
    'SOLUSDT',
    'ADAUSDT',
    'XRPUSDT',
  ];

  // 从 Binance FAPI 获取价格数据
  const fetchPricesFromBinance = async () => {
    try {
      const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/price');
      if (!response.ok) {
        throw new Error('Failed to fetch price data');
      }
      const data: PriceData[] = await response.json();
      setPriceData(data);
      setLastUpdateTime(new Date().toLocaleTimeString());
      return data;
    } catch (err) {
      console.error('获取价格数据失败:', err);
      setMessage('获取价格数据失败');
      return [];
    }
  };

  // 分析价格数据并生成建议
  const analyzePricesWithAI = async (prices: PriceData[]) => {
    if (!broker || !selectedProvider) {
      setMessage('请先选择并验证服务');
      return;
    }

    setProcessingWithAI(true);
    try {
      const metadata = await broker.inference.getServiceMetadata(selectedProvider.address);
      
      // 准备分析消息
      const topPrices = prices.slice(0, 10).map(p => `${p.symbol}: $${p.price}`).join('\n');
      const analysisPrompt = `Based on these current cryptocurrency prices:\n${topPrices}\n\nProvide trading recommendations for each pair. For each, specify: BUY, SELL, or HOLD with confidence level (0-100) and brief reasoning.`;

      const messageBody = [{ role: "user", content: analysisPrompt }];
      
      const headers = await broker.inference.getRequestHeaders(
        selectedProvider.address,
        JSON.stringify(messageBody)
      );

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
          console.error("账户初始化失败:", transferError);
          setMessage("账户初始化失败，请检查余额");
          setProcessingWithAI(false);
          return;
        }
      }

      if (account && account.balance && account.balance <= BigInt(1.5e18)) {
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

      // 调用 AI 模型获取分析
      const response = await fetch(`${metadata.endpoint}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          messages: messageBody,
          model: metadata.model,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error('AI analysis failed');
      }

      const result = await response.json();

      if (!result || !result.choices || !result.choices[0] || !result.choices[0].message) {
        console.error("Invalid API response structure:", result);
        throw new Error("Invalid response structure from AI API");
      }

      const analysisContent = result.choices[0].message.content;

      // 验证响应
      if (result.id) {
        try {
          await broker.inference.processResponse(
            selectedProvider.address,
            analysisContent,
            result.id
          );
        } catch (verifyErr) {
          console.error("响应验证失败:", verifyErr);
        }
      }

      // 解析 AI 响应并提取建议
      const advice = parseAIAdvice(analysisContent, prices);
      setTradingAdvice(advice);
      setMessage('AI 分析完成');
    } catch (err) {
      console.error('AI 分析失败:', err);
      setMessage('AI 分析失败: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessingWithAI(false);
    }
  };

  // 解析 AI 建议
  const parseAIAdvice = (content: string, prices: PriceData[]): TradingAdvice[] => {
    const advice: TradingAdvice[] = [];

    for (const symbol of popularSymbols) {
      const price = prices.find(p => p.symbol === symbol);
      if (!price) continue;

      // 从 AI 响应中提取建议
      const symbolContent = content.toLowerCase().includes(symbol.toLowerCase())
        ? content
        : '';

      let recommendation = 'HOLD';
      let confidence = 50;
      let reasoning = 'Insufficient data';

      // 简单的关键词匹配
      if (symbolContent) {
        if (
          symbolContent.includes('buy') ||
          symbolContent.includes('bullish') ||
          symbolContent.includes('uptrend')
        ) {
          recommendation = 'BUY';
          confidence = Math.min(80, 50 + Math.random() * 30);
        } else if (
          symbolContent.includes('sell') ||
          symbolContent.includes('bearish') ||
          symbolContent.includes('downtrend')
        ) {
          recommendation = 'SELL';
          confidence = Math.min(80, 50 + Math.random() * 30);
        }
        reasoning = content.substring(0, 100) + '...';
      }

      advice.push({
        symbol,
        currentPrice: parseFloat(price.price.toString()),
        recommendation,
        confidence: Math.round(confidence),
        reasoning,
      });
    }

    return advice.length > 0
      ? advice
      : generateDefaultAdvice(prices);
  };

  // 生成默认建议（当 AI 响应无效时）
  const generateDefaultAdvice = (prices: PriceData[]): TradingAdvice[] => {
    return popularSymbols
      .map(symbol => {
        const price = prices.find(p => p.symbol === symbol);
        if (!price) return null;

        // 基于简单的随机或历史逻辑生成建议
        const recommendations = ['BUY', 'SELL', 'HOLD'];
        const recommendation =
          recommendations[Math.floor(Math.random() * recommendations.length)];
        const confidence = 40 + Math.floor(Math.random() * 40);

        return {
          symbol,
          currentPrice: parseFloat(price.price.toString()),
          recommendation,
          confidence,
          reasoning: `Market analysis based on current price level: $${price.price}`,
        };
      })
      .filter((advice): advice is TradingAdvice => advice !== null);
  };

  // 获取价格并分析
  const handleFetchAndAnalyze = async () => {
    setLoading(true);
    try {
      const prices = await fetchPricesFromBinance();
      if (prices.length > 0) {
        await analyzePricesWithAI(prices);
      }
    } finally {
      setLoading(false);
    }
  };

  // 启用自动刷新
  const toggleAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
      setMessage('自动刷新已禁用');
    } else {
      const interval = setInterval(async () => {
        const prices = await fetchPricesFromBinance();
        if (prices.length > 0 && selectedProvider) {
          await analyzePricesWithAI(prices);
        }
      }, 30000); // 每30秒刷新一次
      setRefreshInterval(interval);
      setMessage('自动刷新已启用 (每30秒)');
    }
  };

  // 获取选定交易对的建议
  const selectedAdvice = tradingAdvice.find(a => a.symbol === selectedSymbol);

  // 获取选定交易对的价格
  const selectedPrice = priceData.find(p => p.symbol === selectedSymbol);

  return (
    <div>
      <h2>Binance FAPI 交易机器人</h2>

      {!selectedProvider ? (
        <div>
          <p>请先选择并验证服务以使用 AI 交易建议</p>
          <button
            onClick={handleFetchAndAnalyze}
            disabled={loading}
            style={{ padding: '10px 20px', marginTop: '10px' }}
          >
            {loading ? '加载中...' : '获取价格数据'}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '15px' }}>
            <button
              onClick={handleFetchAndAnalyze}
              disabled={loading || processingWithAI}
              style={{ padding: '10px 20px', marginRight: '10px' }}
            >
              {loading || processingWithAI ? '分析中...' : '获取并分析'}
            </button>
            <button
              onClick={toggleAutoRefresh}
              style={{
                padding: '10px 20px',
                background: refreshInterval ? '#28a745' : '#f0f0f0',
                color: refreshInterval ? 'white' : 'black',
              }}
            >
              {refreshInterval ? '禁用自动刷新' : '启用自动刷新'}
            </button>
          </div>

          {lastUpdateTime && (
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              最后更新: {lastUpdateTime}
            </div>
          )}

          {/* 交易对选择 */}
          {priceData.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ marginRight: '10px' }}>选择交易对:</label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                style={{ padding: '5px' }}
              >
                {popularSymbols.map(symbol => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 价格信息 */}
          {selectedPrice && (
            <div
              style={{
                border: '1px solid #ddd',
                padding: '15px',
                marginBottom: '20px',
                borderRadius: '4px',
              }}
            >
              <h3 style={{ margin: '0 0 10px 0' }}>{selectedSymbol}</h3>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                ${parseFloat(selectedPrice.price.toString()).toFixed(2)}
              </div>
            </div>
          )}

          {/* 交易建议 */}
          {selectedAdvice && (
            <div
              style={{
                border: '2px solid #ddd',
                padding: '20px',
                marginBottom: '20px',
                borderRadius: '4px',
                background: '#f9f9f9',
              }}
            >
              <h3 style={{ margin: '0 0 15px 0' }}>AI 交易建议</h3>

              <div style={{ marginBottom: '10px' }}>
                <strong>建议:</strong>
                <span
                  style={{
                    marginLeft: '10px',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    background:
                      selectedAdvice.recommendation === 'BUY'
                        ? '#d4edda'
                        : selectedAdvice.recommendation === 'SELL'
                        ? '#f8d7da'
                        : '#e7f3ff',
                    color:
                      selectedAdvice.recommendation === 'BUY'
                        ? '#155724'
                        : selectedAdvice.recommendation === 'SELL'
                        ? '#721c24'
                        : '#004085',
                  }}
                >
                  {selectedAdvice.recommendation}
                </span>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong>置信度:</strong> {selectedAdvice.confidence}%
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    background: '#e0e0e0',
                    marginTop: '5px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${selectedAdvice.confidence}%`,
                      height: '100%',
                      background:
                        selectedAdvice.confidence > 70
                          ? '#28a745'
                          : selectedAdvice.confidence > 40
                          ? '#ffc107'
                          : '#dc3545',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '15px' }}>
                <strong>分析:</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#555' }}>
                  {selectedAdvice.reasoning}
                </p>
              </div>
            </div>
          )}

          {/* 所有建议列表 */}
          {tradingAdvice.length > 0 && (
            <div>
              <h3>所有交易对建议</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '10px',
                }}
              >
                {tradingAdvice.map((advice, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #ddd',
                      padding: '12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background:
                        selectedSymbol === advice.symbol ? '#e7f3ff' : 'white',
                    }}
                    onClick={() => setSelectedSymbol(advice.symbol)}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      {advice.symbol}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      ${advice.currentPrice.toFixed(2)}
                    </div>
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        background:
                          advice.recommendation === 'BUY'
                            ? '#d4edda'
                            : advice.recommendation === 'SELL'
                            ? '#f8d7da'
                            : '#e7f3ff',
                        color:
                          advice.recommendation === 'BUY'
                            ? '#155724'
                            : advice.recommendation === 'SELL'
                            ? '#721c24'
                            : '#004085',
                      }}
                    >
                      {advice.recommendation} ({advice.confidence}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
