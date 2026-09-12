package kr.haetteum.app;

import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  // Note: no WebViewClient/offline-retry override here. Verified against the
  // installed @capacitor/android 8.5.2 sources (com.getcapacitor.Bridge /
  // BridgeWebViewClient): the stock Bridge already installs a
  // BridgeWebViewClient that, on main-frame onReceivedError/onReceivedHttpError,
  // loads bridge.getErrorUrl() — which is derived from capacitor.config.ts's
  // server.errorPath ("offline.html", already configured) and correctly
  // resolves through the bridge's local server. That behavior is already
  // active for every Bridge instance by default, so subclassing
  // BridgeWebViewClient here to loadUrl("file:///android_asset/public/offline.html")
  // would be redundant and would actually bypass the correct local-server
  // resolution (different origin, no bridge JS injection). See
  // task-4-report.md for the full trace.

  @Override
  public void onBackPressed() {
    WebView webView = getBridge().getWebView();
    if (webView.canGoBack()) {
      webView.goBack();
      return;
    }
    super.onBackPressed();
  }
}
