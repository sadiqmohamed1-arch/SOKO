// Real RPC submits stay off until staging is verified and this flag is set for that environment.
export const CONTACT_SUBMISSIONS_ENABLED =
  import.meta.env.VITE_CONTACT_SUBMISSIONS_ENABLED === 'true';
