export const dynamic = 'force-dynamic';
export default async function Home() {
  const base = process.env.API_BASE_URL ?? 'http://localhost:5000';
  let apiHealthy = false;
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/api/health`, { cache: 'no-store', signal: AbortSignal.timeout(7000) });
    apiHealthy = response.ok && (await response.json()).ok === true;
  } catch { apiHealthy = false; }
  return <main className="shell"><header className="nav"><strong>◈ Equipora</strong><span>Assignment 9 · D0</span></header><section className="panel"><p className="eyebrow">DEPLOYMENT FOUNDATION</p><h1>Infrastructure before design.</h1><p>Next.js and a separate Express API — first prove the production connection, then build the marketplace.</p><div className="statuses"><div><small>Frontend</small><strong className="good">Ready for testing</strong></div><div><small>Express API</small><strong className={apiHealthy ? 'good' : 'bad'}>{apiHealthy ? 'Health check passed' : 'Not connected yet'}</strong></div><div><small>Database / Auth</small><strong>Not verified</strong></div></div><p className="footnote">This screen is a diagnostic placeholder, not the approved final interface.</p></section><footer>Slate Blue #6C7A89 · White #FFFFFF · Free-hosting-first</footer></main>;
}
