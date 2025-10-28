package com.gudcity.app.ui.viewmodels

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class MainViewModelTest {
    @Test
    fun title_defaults_to_app() = runTest {
        val vm = MainViewModel()
        assertEquals("GudCity", vm.title.first())
    }
}


