import 'server-only';

export function getHealthStatus() {
  return { status: 'ok' } as const;
}
