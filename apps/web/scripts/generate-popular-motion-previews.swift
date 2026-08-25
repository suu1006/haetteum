import AppKit
import AVFoundation
import CoreImage
import CoreVideo
import Foundation

struct PreviewInput {
  let imagePath: String
  let outputPath: String
  let zoomStart: CGFloat
  let zoomEnd: CGFloat
  let horizontalDrift: CGFloat
}

enum PreviewGenerationError: Error, CustomStringConvertible {
  case cannotLoadImage(String)
  case cannotAddWriterInput
  case cannotCreatePixelBuffer
  case cannotStartWriter(String)
  case cannotAppendFrame(Int)
  case cannotFinishWriter(String)

  var description: String {
    switch self {
    case .cannotLoadImage(let path):
      return "이미지를 불러올 수 없습니다: \(path)"
    case .cannotAddWriterInput:
      return "AVAssetWriter에 video input을 추가할 수 없습니다."
    case .cannotCreatePixelBuffer:
      return "video frame용 pixel buffer를 만들 수 없습니다."
    case .cannotStartWriter(let message):
      return "video writer를 시작할 수 없습니다: \(message)"
    case .cannotAppendFrame(let frame):
      return "\(frame)번째 video frame을 기록할 수 없습니다."
    case .cannotFinishWriter(let message):
      return "video writer를 완료할 수 없습니다: \(message)"
    }
  }
}

let width = 720
let height = 1280
let framesPerSecond: Int32 = 30
let durationSeconds: Int32 = 6
let frameCount = Int(framesPerSecond * durationSeconds)
let outputSize = CGSize(width: width, height: height)
let outputBounds = CGRect(origin: .zero, size: outputSize)
let colorSpace = CGColorSpaceCreateDeviceRGB()
let context = CIContext(options: [.cacheIntermediates: false])
let fileManager = FileManager.default
let repositoryRoot = URL(fileURLWithPath: fileManager.currentDirectoryPath)

let previews = [
  PreviewInput(
    imagePath: "apps/web/public/images/discovery/place-seongsan.png",
    outputPath: "apps/web/public/videos/discovery/seongsan-sunrise-preview.mp4",
    zoomStart: 1.00,
    zoomEnd: 1.08,
    horizontalDrift: 0.85
  ),
  PreviewInput(
    imagePath: "apps/web/public/images/discovery/place-hyeopjae.png",
    outputPath: "apps/web/public/videos/discovery/hyeopjae-sunset-highlight.mp4",
    zoomStart: 1.08,
    zoomEnd: 1.00,
    horizontalDrift: -0.7
  ),
  PreviewInput(
    imagePath: "apps/web/public/images/discovery/place-bijarim.png",
    outputPath: "apps/web/public/videos/discovery/bijarim-walk-preview.mp4",
    zoomStart: 1.00,
    zoomEnd: 1.07,
    horizontalDrift: 0.45
  ),
]

func clamped(_ value: CGFloat, lower: CGFloat, upper: CGFloat) -> CGFloat {
  min(max(value, lower), upper)
}

func renderPreview(_ preview: PreviewInput) throws {
  let imageURL = repositoryRoot.appendingPathComponent(preview.imagePath)
  let outputURL = repositoryRoot.appendingPathComponent(preview.outputPath)

  guard let sourceImage = CIImage(
    contentsOf: imageURL,
    options: [.applyOrientationProperty: true]
  ) else {
    throw PreviewGenerationError.cannotLoadImage(imageURL.path)
  }

  try fileManager.createDirectory(
    at: outputURL.deletingLastPathComponent(),
    withIntermediateDirectories: true
  )
  if fileManager.fileExists(atPath: outputURL.path) {
    try fileManager.removeItem(at: outputURL)
  }

  let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
  let outputSettings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
      AVVideoAverageBitRateKey: 1_600_000,
      AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
      AVVideoExpectedSourceFrameRateKey: framesPerSecond,
      AVVideoMaxKeyFrameIntervalKey: framesPerSecond,
    ],
  ]
  let writerInput = AVAssetWriterInput(
    mediaType: .video,
    outputSettings: outputSettings
  )
  writerInput.expectsMediaDataInRealTime = false

  let pixelBufferAttributes: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
    kCVPixelBufferCGImageCompatibilityKey as String: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
  ]
  let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: writerInput,
    sourcePixelBufferAttributes: pixelBufferAttributes
  )

  guard writer.canAdd(writerInput) else {
    throw PreviewGenerationError.cannotAddWriterInput
  }
  writer.add(writerInput)

  guard writer.startWriting() else {
    throw PreviewGenerationError.cannotStartWriter(
      writer.error?.localizedDescription ?? "알 수 없는 오류"
    )
  }
  writer.startSession(atSourceTime: .zero)

  let normalizedImage = sourceImage.transformed(
    by: CGAffineTransform(
      translationX: -sourceImage.extent.origin.x,
      y: -sourceImage.extent.origin.y
    )
  )
  let sourceWidth = normalizedImage.extent.width
  let sourceHeight = normalizedImage.extent.height
  let aspectFillScale = max(
    outputSize.width / sourceWidth,
    outputSize.height / sourceHeight
  )

  for frame in 0..<frameCount {
    while !writerInput.isReadyForMoreMediaData {
      Thread.sleep(forTimeInterval: 0.002)
    }

    var pixelBuffer: CVPixelBuffer?
    guard
      let pixelBufferPool = adaptor.pixelBufferPool,
      CVPixelBufferPoolCreatePixelBuffer(
        nil,
        pixelBufferPool,
        &pixelBuffer
      ) == kCVReturnSuccess,
      let pixelBuffer
    else {
      throw PreviewGenerationError.cannotCreatePixelBuffer
    }

    let progress = CGFloat(frame) / CGFloat(max(frameCount - 1, 1))
    let zoom = preview.zoomStart
      + ((preview.zoomEnd - preview.zoomStart) * progress)
    let scale = aspectFillScale * zoom
    let scaledImage = normalizedImage.transformed(
      by: CGAffineTransform(scaleX: scale, y: scale)
    )
    let maximumCropX = max(scaledImage.extent.width - outputSize.width, 0)
    let centerCropX = maximumCropX / 2
    let intendedDrift = outputSize.width
      * 0.04
      * preview.horizontalDrift
      * ((progress * 2) - 1)
    let cropX = clamped(
      centerCropX + intendedDrift,
      lower: 0,
      upper: maximumCropX
    )
    let cropY = max((scaledImage.extent.height - outputSize.height) / 2, 0)
    let cropRect = CGRect(
      x: cropX,
      y: cropY,
      width: outputSize.width,
      height: outputSize.height
    )
    let frameImage = scaledImage
      .cropped(to: cropRect)
      .transformed(
        by: CGAffineTransform(translationX: -cropX, y: -cropY)
      )

    context.render(
      frameImage,
      to: pixelBuffer,
      bounds: outputBounds,
      colorSpace: colorSpace
    )

    let presentationTime = CMTime(
      value: CMTimeValue(frame),
      timescale: framesPerSecond
    )
    guard adaptor.append(pixelBuffer, withPresentationTime: presentationTime)
    else {
      throw PreviewGenerationError.cannotAppendFrame(frame)
    }
  }

  writerInput.markAsFinished()
  let completion = DispatchSemaphore(value: 0)
  writer.finishWriting {
    completion.signal()
  }
  completion.wait()

  guard writer.status == .completed else {
    throw PreviewGenerationError.cannotFinishWriter(
      writer.error?.localizedDescription ?? "알 수 없는 오류"
    )
  }

  print("created \(preview.outputPath)")
}

do {
  for preview in previews {
    try renderPreview(preview)
  }
} catch {
  fputs("motion preview generation failed: \(error)\n", stderr)
  exit(1)
}
