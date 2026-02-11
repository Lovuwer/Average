package com.average.sensors

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class StepDetectorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener {

    private val sensorManager: SensorManager =
        reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val stepDetectorSensor: Sensor? =
        sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
    private val stepCounterSensor: Sensor? =
        sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

    override fun getName(): String = "StepDetectorModule"

    private fun sendEvent(eventName: String, params: com.facebook.react.bridge.WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun start() {
        stepDetectorSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_FASTEST)
        }
        stepCounterSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_FASTEST)
        }
    }

    @ReactMethod
    fun stop() {
        sensorManager.unregisterListener(this)
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(stepDetectorSensor != null)
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null) return

        when (event.sensor.type) {
            Sensor.TYPE_STEP_DETECTOR -> {
                val params = Arguments.createMap().apply {
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                }
                sendEvent("onStepDetected", params)
            }
            Sensor.TYPE_STEP_COUNTER -> {
                val params = Arguments.createMap().apply {
                    putDouble("steps", event.values[0].toDouble())
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                }
                sendEvent("onStepCount", params)
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun onCatalystInstanceDestroy() {
        sensorManager.unregisterListener(this)
        super.onCatalystInstanceDestroy()
    }
}
