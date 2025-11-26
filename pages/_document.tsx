import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const originalError = console.error;
                console.error = function(...args) {
                  const errorString = args[0]?.toString?.() || '';
                  if (errorString.includes('Connection interrupted while trying to subscribe')) {
                    console.warn('WalletConnect subscription error suppressed');
                    return;
                  }
                  return originalError.apply(console, args);
                };
                
                window.addEventListener('error', (event) => {
                  if (event.message && event.message.includes('Connection interrupted while trying to subscribe')) {
                    event.preventDefault();
                  }
                }, true);
                
                window.addEventListener('unhandledrejection', (event) => {
                  if (event.reason && event.reason.message && event.reason.message.includes('Connection interrupted while trying to subscribe')) {
                    event.preventDefault();
                  }
                }, true);
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
