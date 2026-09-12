import Capacitor
import WebKit

/// Custom bridge view controller for 해뜸.
///
/// NOTE on the offline fallback page:
/// In Capacitor 8 (`@capacitor/ios` 8.5.2, as used by this project),
/// `CAPBridgeViewController` does **not** itself act as the `WKWebView`'s
/// `WKNavigationDelegate`. That role is filled internally by a private
/// `WebViewDelegationHandler` instance created in
/// `CAPBridgeViewController.prepareWebView(...)` and assigned to
/// `webView.navigationDelegate` (see `WebViewDelegationHandler.swift` in
/// `@capacitor/ios`). Because of that, overriding
/// `webView(_:didFailProvisionalNavigation:withError:)` /
/// `webView(_:didFail:withError:)` on this subclass would never be called by
/// WebKit -- it calls those methods on whatever object is actually assigned
/// as the navigation delegate, not on the view controller.
///
/// `WebViewDelegationHandler` already has first-class support for exactly
/// this use case: on both `didFail` and `didFailProvisionalNavigation`, it
/// loads `bridge.config.errorPathURL` if one is configured. That URL is
/// derived from the `server.errorPath` key in `capacitor.config.ts`, which
/// this project sets to `"offline.html"` (see
/// `apps/mobile/capacitor.config.ts`) so that the bundled
/// `public/offline.html` (confirmed present in Task 6) is shown automatically
/// when the remote page fails to load. Re-implementing that behavior here by
/// swapping out `webView.navigationDelegate` was deliberately avoided: doing
/// so would require re-forwarding every `WKNavigationDelegate` callback
/// (including `decidePolicyFor:navigationAction`, which enforces this app's
/// Kakao domain allowlist) and risks silently breaking that logic.
///
/// This subclass is therefore only responsible for enabling the swipe-back
/// navigation gesture, which is a plain `WKWebView` property unrelated to the
/// navigation delegate and safe to set directly.
class MainViewController: CAPBridgeViewController {
  override func viewDidLoad() {
    super.viewDidLoad()
    // WKWebView.allowsBackForwardNavigationGestures defaults to false;
    // enabling it lets users swipe from the left edge to go back, matching
    // standard iOS navigation conventions.
    webView?.allowsBackForwardNavigationGestures = true
  }
}
