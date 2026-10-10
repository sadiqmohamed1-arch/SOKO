// Both conditions are required. `import.meta.env.DEV` is statically `false` in `vite build`,
// so production bundles drop the switcher entirely regardless of any env var.
export const DEMO_MODE_ENABLED: boolean =
  import.meta.env.DEV && import.meta.env.VITE_SOKO_DEMO_MODE === 'true';
