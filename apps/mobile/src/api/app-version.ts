import Constants from 'expo-constants';

// The release version of this build: app.json's `version`, the one the app is
// released as in the stores. The API refuses builds below its minimum, so it
// must be sent with every request (see appFetch).
export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';
