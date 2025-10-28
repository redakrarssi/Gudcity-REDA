package com.gudcity.app.ui.viewmodels

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class MainViewModel : ViewModel() {
    private val _title = MutableStateFlow("GudCity")
    val title: StateFlow<String> = _title
}


