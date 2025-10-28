package com.gudcity.app.data.prefs

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object SecureTokenStore {
    private const val PREFS_NAME = "secure_prefs"
    private const val KEY_AUTH_TOKEN = "auth_token"

    fun saveAuthToken(context: Context, token: String) {
        val prefs = getPrefs(context)
        prefs.edit().putString(KEY_AUTH_TOKEN, token).apply()
    }

    fun getAuthToken(context: Context): String? {
        val prefs = getPrefs(context)
        return prefs.getString(KEY_AUTH_TOKEN, null)
    }

    fun clearAuthToken(context: Context) {
        val prefs = getPrefs(context)
        prefs.edit().remove(KEY_AUTH_TOKEN).apply()
    }

    private fun getPrefs(context: Context) = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
}


