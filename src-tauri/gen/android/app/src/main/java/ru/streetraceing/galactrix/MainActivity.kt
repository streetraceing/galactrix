package ru.streetraceing.galactrix

import android.content.Context
import android.os.Bundle
import android.util.Log
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import io.crates.keyring.Keyring

class MainActivity : TauriActivity() {
  private external fun initializeRustlsPlatformVerifier(context: Context)

  override fun onCreate(savedInstanceState: Bundle?) {
    System.loadLibrary("galactrix_lib")
    runCatching { initializeRustlsPlatformVerifier(applicationContext) }
      .onFailure { error -> Log.e(TAG, "Failed to initialize Android TLS verifier", error) }
    runCatching { Keyring.initializeNdkContext(applicationContext) }
      .onFailure { error -> Log.e(TAG, "Failed to initialize Android secure storage", error) }
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    val contentView = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(contentView) { view, windowInsets ->
      val systemArea = windowInsets.getInsets(
        WindowInsetsCompat.Type.systemBars() or
          WindowInsetsCompat.Type.displayCutout(),
      )
      val keyboardArea = windowInsets.getInsets(WindowInsetsCompat.Type.ime())
      view.setPadding(
        systemArea.left,
        systemArea.top,
        systemArea.right,
        maxOf(systemArea.bottom, keyboardArea.bottom),
      )
      windowInsets
    }
    ViewCompat.requestApplyInsets(contentView)
  }

  private companion object {
    const val TAG = "Galactrix"
  }
}
