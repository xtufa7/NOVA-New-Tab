declare const __BUILD__: {
  version: string;
  buildId: string;
  commit: string;
  timestamp: string;
  profile: string;
};
interface Window {
  documentPictureInPicture?: {
    requestWindow(options?: {
      width?: number;
      height?: number;
      preferInitialWindowPlacement?: boolean;
    }): Promise<Window>;
    window: Window | null;
  };
}
