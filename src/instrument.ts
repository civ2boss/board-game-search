import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://433e0f567afa79ace162be196f83b516@o224644.ingest.us.sentry.io/4512294553649152',
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ['localhost', /^\/api/],
});
