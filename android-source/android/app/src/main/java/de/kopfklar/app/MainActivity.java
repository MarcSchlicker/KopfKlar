package de.kopfklar.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // Die React-App führt ihre eigene Navigation. Der Android-Zurückknopf
        // soll daher höchstens zum Kalender führen und die Activity nicht schließen.
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().evaluateJavascript(
                "window.dispatchEvent(new Event('kopfklar-back'));",
                null
            );
        }
    }
}
