package com.average.auto

/**
 * Shared data bridge between React Native and Android Auto SpeedScreen.
 * Updated from RN via AutoBridge native module.
 */
object SpeedDataBridge {
    data class SpeedData(
        val speed: Double = 0.0,
        val avgSpeed: Double = 0.0,
        val maxSpeed: Double = 0.0,
        val distance: Double = 0.0,
        val duration: Int = 0
    )

    @Volatile
    private var data = SpeedData()

    fun update(speed: Double, avgSpeed: Double, maxSpeed: Double, distance: Double, duration: Int) {
        data = SpeedData(speed, avgSpeed, maxSpeed, distance, duration)
    }

    fun getData(): SpeedData = data
}
