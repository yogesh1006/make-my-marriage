import { getHealthStatus } from '@/server/health';

export function GET() {
  return Response.json(
    { data: getHealthStatus() },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Request-Id': crypto.randomUUID(),
      },
    },
  );
}
