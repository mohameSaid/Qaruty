export const environment = {
  production: false,
  // Routed through the ng-serve dev proxy (see proxy.conf.json) to the live Qaryati API,
  // because that API sends no Access-Control-Allow-Origin header and rejects direct
  // browser calls from any localhost origin with a CORS error. Same-origin `/api` avoids it.
  // baseUrl: 'http://localhost:8081',
  baseUrl: "https://qaryati.onrender.com",

  // baseUrl: "https://qaryati-java-production.up.railway.app",
  // baseUrl: "https://qaryati-uat.onrender.com",
  releaseVersion: "0.2.0",
   supabase: {
    url: 'https://jgccwulxllghwumaykdp.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnY2N3dWx4bGxnaHd1bWF5a2RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDAxMjAyMiwiZXhwIjoyMDk5NTg4MDIyfQ.9efkChEk8BcdgruZYjZPjeKIRGU7A3nqgc6Y5XxdGyQ',
  },
};
