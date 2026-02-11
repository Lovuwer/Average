import Foundation
import CoreMotion

@objc(StepDetectorModule)
class StepDetectorModule: RCTEventEmitter {
  
  private let pedometer = CMPedometer()
  private var hasListeners = false
  
  override init() {
    super.init()
  }
  
  @objc override static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  override func supportedEvents() -> [String]! {
    return ["onStepDetected", "onStepCount"]
  }
  
  override func startObserving() {
    hasListeners = true
  }
  
  override func stopObserving() {
    hasListeners = false
  }
  
  @objc func start() {
    guard CMPedometer.isStepCountingAvailable() else { return }
    
    pedometer.startUpdates(from: Date()) { [weak self] data, error in
      guard let self = self, self.hasListeners, let data = data, error == nil else { return }
      
      var body: [String: Any] = [
        "timestamp": Date().timeIntervalSince1970 * 1000,
        "steps": data.numberOfSteps.intValue,
      ]
      
      if let distance = data.distance {
        body["distance"] = distance.doubleValue
      }
      if let pace = data.currentPace {
        body["pace"] = pace.doubleValue
      }
      if let cadence = data.currentCadence {
        body["cadence"] = cadence.doubleValue
      }
      
      self.sendEvent(withName: "onStepDetected", body: body)
      
      self.sendEvent(withName: "onStepCount", body: [
        "steps": data.numberOfSteps.doubleValue,
        "timestamp": Date().timeIntervalSince1970 * 1000,
      ])
    }
  }
  
  @objc func stop() {
    pedometer.stopUpdates()
  }
  
  @objc func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(CMPedometer.isStepCountingAvailable())
  }
}
