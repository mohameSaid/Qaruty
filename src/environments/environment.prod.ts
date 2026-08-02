export const environment = {
  production: true,
  baseUrl: 'https://qaryati.onrender.com',
  releaseVersion: '0.1.4',
  supabase: {
    // TODO: confirm this should point at the same Supabase project as dev, or a separate prod project.
    url: 'https://jgccwulxllghwumaykdp.supabase.co',
    anonKey: '<REAL_ANON_KEY_HERE>', // must be the anon/public key — never the service_role key
  },
};
