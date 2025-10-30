'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console (future: send to error tracking service)
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom right, rgb(250 245 255), rgb(255 255 255), rgb(239 246 255)',
          padding: '1rem',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '28rem',
            borderRadius: '0.5rem',
            border: '1px solid rgb(226 232 240)',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            padding: '1.5rem',
          }}>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'rgb(220 38 38)',
              marginBottom: '1rem',
            }}>
              Something went wrong
            </h1>
            <p style={{
              color: 'rgb(100 116 139)',
              marginBottom: '1.5rem',
            }}>
              An unexpected error occurred. Our team has been notified and we&apos;re working to fix it.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div style={{
                borderRadius: '0.375rem',
                backgroundColor: 'rgb(241 245 249)',
                padding: '0.75rem',
                marginBottom: '1.5rem',
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'rgb(220 38 38)',
                }}>
                  Development Error Details:
                </p>
                <p style={{
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  color: 'rgb(220 38 38)',
                }}>
                  {error.message}
                </p>
                {error.digest && (
                  <p style={{
                    marginTop: '0.25rem',
                    fontSize: '0.75rem',
                    color: 'rgb(100 116 139)',
                  }}>
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={reset}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  backgroundColor: 'rgb(30 41 59)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/items')}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  color: 'rgb(30 41 59)',
                  border: '1px solid rgb(226 232 240)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
