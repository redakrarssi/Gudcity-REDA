-keep class com.gudcity.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn com.squareup.moshi.**

# Retrofit
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keep class retrofit2.converter.** { *; }
-keepattributes Signature

# Moshi
-keep class com.squareup.moshi.** { *; }
-keep @com.squareup.moshi.JsonClass class * { *; }
-keepclassmembers class ** {
    @com.squareup.moshi.* <fields>;
}

# OkHttp
-keep class okhttp3.** { *; }

# Room
-dontwarn androidx.room.**
-keep class androidx.room.** { *; }
-keep class * extends androidx.room.RoomDatabase

# WorkManager
-dontwarn androidx.work.**
-keep class androidx.work.** { *; }

# Firebase Messaging
-dontwarn com.google.firebase.messaging.**
-keep class com.google.firebase.messaging.** { *; }


