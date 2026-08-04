# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Required by rustls-platform-verifier, which loads these classes through JNI.
-keep, includedescriptorclasses class org.rustls.platformverifier.** { *; }

# Keep the class name and native declaration aligned with the exported Rust JNI symbol.
# Keeping only the native member is insufficient because R8 may rename the class.
-keep class ru.streetraceing.galactrix.MainActivity { *; }

# The Android keyring backend resolves this Kotlin/JNI bridge at runtime.
-keep class io.crates.keyring.Keyring { *; }
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

