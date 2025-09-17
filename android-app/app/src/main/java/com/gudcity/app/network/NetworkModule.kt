package com.gudcity.app.network

import android.content.Context
import com.gudcity.app.R
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object NetworkModule {
    @Volatile private var retrofitInstance: Retrofit? = null

    fun provideRetrofit(context: Context): Retrofit {
        val existing = retrofitInstance
        if (existing != null) return existing

        val baseUrl = context.getString(R.string.web_base_url).trimEnd('/') + "/"
        val csrfName = context.getString(R.string.csrf_cookie_name)

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val host = baseUrl.removePrefix("https://").removePrefix("http://").substringBefore('/')
        val pinner = CertificatePinner.Builder()
            // Replace with real pins when available
            //.add(host, "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
            .build()

        val client = OkHttpClient.Builder()
            .addInterceptor(SessionCookieInterceptor(baseUrl, csrfName))
            .addInterceptor(logging)
            .certificatePinner(pinner)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create())
            .build()

        retrofitInstance = retrofit
        return retrofit
    }
}


