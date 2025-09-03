export const runtime = 'nodejs';
export async function GET() {
  return Response.json({
    status: 'ok',
    sha: process.env.GIT_SHA || null,
    deployedAt: process.env.DEPLOYED_AT || null,
  });
}
