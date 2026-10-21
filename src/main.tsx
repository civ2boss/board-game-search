// Sentry initialization must be imported first!
import './instrument';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import posthog from 'posthog-js';
import { PostHogProvider } from '@posthog/react';
import * as Sentry from '@sentry/react';

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN, {
  api_host: '/ph',
  ui_host: 'https://us.posthog.com',
  defaults: '2026-01-30',
  capture_pageleave: true,
  capture_performance: true,
  persistence: 'memory',
});

const root = createRoot(document.getElementById('root')!, {
  // Callback called when an error is thrown and not caught by an ErrorBoundary.
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Uncaught error', error, errorInfo.componentStack);
  }),
  // Callback called when React catches an error in an ErrorBoundary.
  onCaughtError: Sentry.reactErrorHandler(),
  // Callback called when React automatically recovers from errors.
  onRecoverableError: Sentry.reactErrorHandler(),
});

root.render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <App />
    </PostHogProvider>
  </StrictMode>,
);
