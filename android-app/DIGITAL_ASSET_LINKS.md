Digital Asset Links setup for verified app links

1) Host assetlinks.json at:
   https://vcarda.com/.well-known/assetlinks.json

2) Example assetlinks.json:
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.gudcity.app",
      "sha256_cert_fingerprints": [
        "REPLACE_WITH_RELEASE_SHA256_FINGERPRINT"
      ]
    }
  }
]

3) Get fingerprint:
keytool -list -v -alias YOUR_RELEASE_ALIAS -keystore YOUR_RELEASE_KEYSTORE.jks

4) After hosting, install the app and visit an https link on vcarda.com; Android should verify and open in-app.


