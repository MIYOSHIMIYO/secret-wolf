declare module 'capacitor-app-tracking-transparency' {
  export interface AppTrackingTransparencyPlugin {
    requestTrackingPermission(): Promise<string>;
    getTrackingStatus(): Promise<string>;
  }

  export const AppTrackingTransparency: AppTrackingTransparencyPlugin;
}











