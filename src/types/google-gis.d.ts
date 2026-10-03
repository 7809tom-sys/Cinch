/** Google Identity Services (Sign-In + OAuth token client) */

type GoogleCredentialResponse = { credential?: string };

type GoogleOauthTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleOauthTokenResponse) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

export {};
