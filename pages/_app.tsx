import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';
import { useEffect } from 'react';

// 定义 0G 测试网
const zgTestnet = defineChain({
  id: 16602,
  name: '0G Testnet',
  nativeCurrency: {
    decimals: 18,
    name: '0G',
    symbol: '0G',
  },
  rpcUrls: {
    default: {
      http: ['https://evmrpc-testnet.0g.ai'],
    },
  },
  blockExplorers: {
    default: {
      name: '0G Testnet Explorer',
      url: 'https://chainscan-newton.0g.ai',
    },
  },
  testnet: true,
});

const config = getDefaultConfig({
  appName: '0G Broker Starter Kit',
  projectId: '11b1b4b2e0f2e8a5c6e0c5e8a5c6e0c5',
  chains: [zgTestnet],
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('Connection interrupted while trying to subscribe')) {
        console.warn('WalletConnect subscription error caught and suppressed:', event.message);
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleUnhandledError);
    return () => {
      window.removeEventListener('error', handleUnhandledError);
    };
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Component {...pageProps} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;