package com.average.auto

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AutoBridge(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AutoBridge"

    @ReactMethod
    fun updateSpeed(
        speed: Double,
        avgSpeed: Double,
        maxSpeed: Double,
        distance: Double,
        duration: Int
    ) {
        SpeedDataBridge.update(speed, avgSpeed, maxSpeed, distance, duration)
    }
}
