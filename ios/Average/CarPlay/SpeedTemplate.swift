import CarPlay

@available(iOS 14.0, *)
class SpeedTemplate {
    private var currentSpeed: Double = 0
    private var avgSpeed: Double = 0
    private var maxSpeed: Double = 0
    private var distance: Double = 0
    private var duration: Int = 0

    func createTemplate() -> CPInformationTemplate {
        let items = buildItems()
        let template = CPInformationTemplate(
            title: "Average",
            layout: .leading,
            items: items,
            actions: []
        )
        return template
    }

    func updateSpeed(current: Double, avg: Double, max: Double, dist: Double, dur: Int) {
        self.currentSpeed = current
        self.avgSpeed = avg
        self.maxSpeed = max
        self.distance = dist
        self.duration = dur
    }

    private func buildItems() -> [CPInformationItem] {
        return [
            CPInformationItem(
                title: "Speed",
                detail: String(format: "%.1f km/h", currentSpeed)
            ),
            CPInformationItem(
                title: "Average",
                detail: String(format: "%.1f km/h", avgSpeed)
            ),
            CPInformationItem(
                title: "Max",
                detail: String(format: "%.1f km/h", maxSpeed)
            ),
            CPInformationItem(
                title: "Distance",
                detail: String(format: "%.2f km", distance / 1000)
            ),
        ]
    }
}
