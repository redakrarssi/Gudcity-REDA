package com.gudcity.app.data.repositories

import com.gudcity.app.data.api.ApiService
import com.gudcity.app.data.api.AwardPointsRequest
import com.gudcity.app.domain.repositories.PointsRepository
import com.squareup.moshi.Moshi
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

class PointsRepositoryImplTest {
    private lateinit var server: MockWebServer
    private lateinit var repo: PointsRepository

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        val retrofit = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .client(OkHttpClient())
            .addConverterFactory(MoshiConverterFactory.create(Moshi.Builder().build()))
            .build()
        val api = retrofit.create(ApiService::class.java)
        repo = PointsRepositoryImpl(api)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun awardPoints_returns_true_on_success() {
        server.enqueue(MockResponse().setBody("{\"success\":true}").setResponseCode(200))
        val ok = runBlocking { repo.awardPoints("cust", 1) }
        assertTrue(ok)
        val recorded = server.takeRequest()
        assertTrue(recorded.path!!.contains("/api/points/award"))
    }
}


