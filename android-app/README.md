GudCity Android App

Setup:
- Open in Android Studio (JDK 17)
- Update res/values/strings.xml → web_base_url = https://vcarda.com
- Build and run

Signing & AAB:
- Set env or gradle.properties:
  - RELEASE_STORE_FILE=path/to/keystore.jks
  - RELEASE_STORE_PASSWORD=...
  - RELEASE_KEY_ALIAS=...
  - RELEASE_KEY_PASSWORD=...
- Build AAB: `./gradlew bundleRelease`

Notes:
- MVVM + ViewBinding + Retrofit/OkHttp + Room + WorkManager
- Cookies + CSRF propagated from WebView to Retrofit
- R8 enabled in release; cleartext disabled


