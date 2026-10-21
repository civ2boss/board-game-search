import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://433e0f567afa79ace162be196f83b516@o224644.ingest.us.sentry.io/4512294553649152',
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ['localhost', /^\/api/],
  // Session Replay: 100% of sessions in dev, 10% in prod,
  // plus 100% of sessions where an error occurs
  replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,
});
