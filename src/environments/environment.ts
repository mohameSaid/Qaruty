export const environment = {
  production: false,
  // Routed through the ng-serve dev proxy (see proxy.conf.json) to the live Qaryati API,
  // because that API sends no Access-Control-Allow-Origin header and rejects direct
  // browser calls from any localhost origin with a CORS error. Same-origin `/api` avoids it.
  // baseUrl: 'http://localhost:8081',
  // baseUrl: "https://qaryati-yh75.onrender.com",

  baseUrl: "https://qaryati-uat-uat.up.railway.app",
  releaseVersion: "8.6.26",
  supabase: {
    url: "https://rzpmtarweaovtnflbyxm.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cG10YXJ3ZWFvdnRuZmxieXhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE4NjEwMCwiZXhwIjoyMTAxNzYyMTAwfQ.HlFUlDKLizaD0iVvV2hH-J4Xnlk2OWmaVvubfYJjfK4",
  },
};
