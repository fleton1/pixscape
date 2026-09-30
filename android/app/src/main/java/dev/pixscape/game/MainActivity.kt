package dev.pixscape.game

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.WindowManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat

/**
 * PixScape is a browser game; this activity is a full-screen WebView around the copy of it that the
 * build bundles into assets/game/. The game picks its own portrait or landscape layout from the
 * window size, so rotation only resizes the page (see configChanges in the manifest).
 */
class MainActivity : ComponentActivity() {

    private lateinit var web: WebView

    // Served from a fixed https origin (not file://) so ES modules load and localStorage (the save
    // game) stays with the same origin across updates.
    private val assets by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        web = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            overScrollMode = View.OVER_SCROLL_NEVER
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = false
                allowContentAccess = false
                // The pixel UI is laid out in fixed sizes; system font scaling would break it.
                textZoom = 100
                setSupportZoom(false)
                builtInZoomControls = false
            }
            webViewClient = object : WebViewClientCompat() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    assets.shouldInterceptRequest(request.url)

                // The game never navigates anywhere; keep it that way.
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                    request.url.host != WebViewAssetLoader.DEFAULT_DOMAIN

                override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                    recreate()
                    return true
                }
            }
            // Needed for the game's confirm() ("Delete your save and start over?").
            webChromeClient = WebChromeClient()
        }

        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
            addView(web, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        }
        // Keep the game clear of camera cutouts, any visible system bars and the keyboard.
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val i = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or
                    WindowInsetsCompat.Type.displayCutout() or
                    WindowInsetsCompat.Type.ime()
            )
            v.setPadding(i.left, i.top, i.right, i.bottom)
            WindowInsetsCompat.CONSUMED
        }
        setContentView(root)
        hideSystemBars()

        // Back closes whatever is open in the game (menus, windows, map, side panel); with nothing
        // open it leaves the game running in the background instead of quitting it.
        onBackPressedDispatcher.addCallback(this) {
            web.evaluateJavascript("window.pixBack ? pixBack() : false") { handled ->
                if (handled != "true") moveTaskToBack(true)
            }
        }

        web.loadUrl("https://${WebViewAssetLoader.DEFAULT_DOMAIN}/assets/game/index.html")
    }

    private fun hideSystemBars() {
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        web.evaluateJavascript("window.pixPause && pixPause(false)", null)
    }

    override fun onPause() {
        // Save and silence the game before the WebView is paused.
        web.evaluateJavascript("window.pixPause && pixPause(true)", null)
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
