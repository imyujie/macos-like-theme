import AppKit
import Foundation

// Renders named system symbols into transparent masks for the web preview.
// The theme keeps symbol names in the UI; run this on macOS after adding names.
let symbolNames = [
    "minus", "arrow.up.left.and.arrow.down.right", "app.badge", "menubar.dock.rectangle",
    "arrow.down.circle", "icloud", "house", "dot.radiowaves.left.and.right", "network", "list.bullet", "folder.badge.plus", "macwindow",
    "archivebox", "arrow.clockwise", "arrow.down", "arrow.up.right",
    "arrowshape.turn.up.left", "arrowshape.turn.up.right", "bell", "bubble.left",
    "calendar", "checkmark", "chevron.down", "chevron.left", "chevron.right", "chevron.up.chevron.down",
    "circle.grid.2x2", "clock", "command", "doc", "doc.text", "ellipsis",
    "envelope", "folder", "folder.fill", "gearshape", "hourglass", "info.circle",
    "line.3.horizontal.decrease", "lock", "magnifyingglass", "megaphone",
    "moon", "paintbrush", "paperclip", "paperplane", "person.crop.circle",
    "plus", "rectangle.on.rectangle", "sidebar.left", "slider.horizontal.3",
    "sparkles", "speaker.fill", "speaker.wave.3.fill", "square.and.arrow.up", "square.and.pencil", "square.grid.2x2",
    "square.stack.3d.up", "sun.max", "tag", "trash", "tray", "tray.full", "xmark"
]

let outputURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("public/sf-symbols", isDirectory: true)
try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)

let canvasSize = 96
let drawingSize: CGFloat = 82
func exportSymbol(_ name: String, weight: NSFont.Weight = .medium, filename: String? = nil) throws {
    let configuration = NSImage.SymbolConfiguration(pointSize: 28, weight: weight)
    guard let baseImage = NSImage(systemSymbolName: name, accessibilityDescription: nil),
          let image = baseImage.withSymbolConfiguration(configuration),
          let bitmap = NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: canvasSize,
            pixelsHigh: canvasSize,
            bitsPerSample: 8,
            samplesPerPixel: 4,
            hasAlpha: true,
            isPlanar: false,
            colorSpaceName: .deviceRGB,
            bytesPerRow: 0,
            bitsPerPixel: 0
          ),
          let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
        fputs("Unavailable SF Symbol: \(name)\n", stderr)
        return
    }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: canvasSize, height: canvasSize).fill(using: .copy)

    let scale = min(drawingSize / image.size.width, drawingSize / image.size.height)
    let targetSize = NSSize(width: image.size.width * scale, height: image.size.height * scale)
    let targetRect = NSRect(
        x: (CGFloat(canvasSize) - targetSize.width) / 2,
        y: (CGFloat(canvasSize) - targetSize.height) / 2,
        width: targetSize.width,
        height: targetSize.height
    )
    image.draw(in: targetRect, from: .zero, operation: .sourceOver, fraction: 1)
    context.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()

    guard let png = bitmap.representation(using: .png, properties: [:]) else {
        fputs("Could not encode SF Symbol: \(name)\n", stderr)
        return
    }
    try png.write(to: outputURL.appendingPathComponent("\(filename ?? name).png"))
}

for name in symbolNames {
    try exportSymbol(name)
}
try exportSymbol("checkmark", weight: .bold, filename: "checkmark.bold")

print("Exported SF Symbols to \(outputURL.path)")
