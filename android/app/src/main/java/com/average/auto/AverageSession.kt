package com.average.auto

import android.content.Intent
import androidx.car.app.Screen
import androidx.car.app.Session

class AverageSession : Session() {
    override fun onCreateScreen(intent: Intent): Screen {
        return SpeedScreen(carContext)
    }
}
