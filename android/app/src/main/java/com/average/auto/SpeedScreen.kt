package com.average.auto

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.Pane
import androidx.car.app.model.PaneTemplate
import androidx.car.app.model.Row
import androidx.car.app.model.Template
import android.os.Handler
import android.os.Looper

class SpeedScreen(carContext: CarContext) : Screen(carContext) {
    private val handler = Handler(Looper.getMainLooper())
    private val refreshRunnable = object : Runnable {
        override fun run() {
            invalidate()
            handler.postDelayed(this, 1000)
        }
    }

    init {
        handler.postDelayed(refreshRunnable, 1000)
    }

    override fun onGetTemplate(): Template {
        val data = SpeedDataBridge.getData()

        val pane = Pane.Builder()
            .addRow(
                Row.Builder()
                    .setTitle("Speed")
                    .addText("${String.format("%.1f", data.speed)} km/h")
                    .build()
            )
            .addRow(
                Row.Builder()
                    .setTitle("Average")
                    .addText("${String.format("%.1f", data.avgSpeed)} km/h")
                    .build()
            )
            .addRow(
                Row.Builder()
                    .setTitle("Max")
                    .addText("${String.format("%.1f", data.maxSpeed)} km/h")
                    .build()
            )
            .addRow(
                Row.Builder()
                    .setTitle("Distance")
                    .addText("${String.format("%.2f", data.distance / 1000)} km")
                    .build()
            )
            .build()

        return PaneTemplate.Builder(pane)
            .setTitle("Average")
            .setHeaderAction(Action.APP_ICON)
            .build()
    }
}
