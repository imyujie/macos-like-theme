import AppKit
import UniformTypeIdentifiers

// Use the actual macOS folder artwork in the template preview.
let image = NSWorkspace.shared.icon(for: .folder)
let size = 160
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
let context = NSGraphicsContext(bitmapImageRep: bitmap)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
image.draw(in: NSRect(x: 0, y: 0, width: size, height: size), from: .zero, operation: .sourceOver, fraction: 1)
context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()
let output = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("public/macos-icons/folder.png")
try bitmap.representation(using: .png, properties: [:])!.write(to: output)
print("Exported native folder artwork")
