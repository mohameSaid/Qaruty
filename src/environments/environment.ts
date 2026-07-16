export const environment = {
  production: false,
  // Routed through the ng-serve dev proxy (see proxy.conf.json) to the live Qaryati API,
  // because that API sends no Access-Control-Allow-Origin header and rejects direct
  // browser calls from any localhost origin with a CORS error. Same-origin `/api` avoids it.
  // baseUrl: 'http://localhost:8081',
  // baseUrl: "https://qaryati.onrender.com",

  // baseUrl: "https://qaryati-java-production.up.railway.app",
  baseUrl: "https://qaryati-uat.onrender.com",

  auth: {
    username: "admin",
    password: "admin123",
  },
};
