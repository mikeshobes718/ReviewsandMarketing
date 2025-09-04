export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Keep (app) routes unguarded here to avoid redirect loops, and apply
  // per-page guards where needed (e.g., dashboard layout enforces Pro).
  return <>{children}</>;
}
