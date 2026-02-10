import Foundation
import React

@objc(CarPlayBridge)
class CarPlayBridge: NSObject {

    @objc
    func updateSpeedData(_ data: NSDictionary) {
        guard let speed = data["speed"] as? Double,
              let avgSpeed = data["avgSpeed"] as? Double,
              let maxSpeed = data["maxSpeed"] as? Double,
              let distance = data["distance"] as? Double,
              let duration = data["duration"] as? Int else {
            return
        }

        if #available(iOS 14.0, *) {
            DispatchQueue.main.async {
                // Access shared SpeedTemplate instance if available
                // The actual template updates happen via CarPlaySceneDelegate
                NotificationCenter.default.post(
                    name: NSNotification.Name("SpeedDataUpdate"),
                    object: nil,
                    userInfo: [
                        "speed": speed,
                        "avgSpeed": avgSpeed,
                        "maxSpeed": maxSpeed,
                        "distance": distance,
                        "duration": duration
                    ]
                )
            }
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
