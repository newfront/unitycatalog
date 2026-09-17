import { useQuery } from "@tanstack/react-query";

// AppConfig is the runtime config the Rust bridge exposes to the SPA at GET
// /config. The SPA learns which auth providers and optional client features are
// enabled without an image rebuild.
export type AppConfig = {
  // authEnabled gates the whole login flow. When false the SPA renders the app
  // directly (the bridge proxies UC without requiring a session cookie).
  authEnabled: boolean;
  // googleClientId, when set, enables the Google Identity Services button.
  googleClientId: string;
  oktaEnabled: boolean;
  keycloakEnabled: boolean;
  features: {
    rpcRequestValidation: boolean;
  };
};

const EMPTY: AppConfig = {
  authEnabled: false,
  googleClientId: "",
  oktaEnabled: false,
  keycloakEnabled: false,
  features: {
    rpcRequestValidation: false,
  },
};

let current = EMPTY;

export function isRpcRequestValidationEnabled(): boolean {
  return current.features.rpcRequestValidation;
}

async function loadAppConfig(): Promise<AppConfig> {
  try {
    const res = await fetch("/config");
    if (!res.ok) return (current = EMPTY);
    const config = (await res.json()) as Partial<AppConfig>;
    return (current = {
      ...EMPTY,
      ...config,
      features: { ...EMPTY.features, ...config.features },
    });
  } catch {
    return (current = EMPTY);
  }
}

// useAppConfig fetches the bridge's runtime SPA config once. It never throws — a
// missing/erroring endpoint yields auth-disabled defaults so the SPA still loads.
export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    staleTime: Infinity,
    queryFn: loadAppConfig,
  });
}
