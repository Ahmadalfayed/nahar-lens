// عدسة النهار — حفظ الفيديو في تطبيق الصور | جميع الحقوق محفوظة © 2026 وطن النهار
import Foundation
import Photos
import UIKit
import Capacitor

@objc(GallerySaverPlugin)
public class GallerySaverPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GallerySaverPlugin"
    public let jsName = "GallerySaver"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveVideo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "print", returnType: CAPPluginReturnPromise)
    ]

    /// يفتح نافذة الطباعة (ومنها الحفظ كـ PDF) لمحتوى الصفحة الحالية.
    @objc func print(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.bridge?.webView else { call.reject("NO_WEBVIEW"); return }
            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            info.jobName = call.getString("name") ?? "عدسة النهار"
            let pc = UIPrintInteractionController.shared
            pc.printInfo = info
            pc.printFormatter = webView.viewPrintFormatter()
            let done: UIPrintInteractionController.CompletionHandler = { _, _, _ in call.resolve() }
            if UIDevice.current.userInterfaceIdiom == .pad, let v = self?.bridge?.viewController?.view {
                pc.present(from: CGRect(x: v.bounds.midX, y: 80, width: 1, height: 1), in: v, animated: true, completionHandler: done)
            } else {
                pc.present(animated: true, completionHandler: done)
            }
        }
    }

    @objc func saveVideo(_ call: CAPPluginCall) { save(call, video: true) }
    @objc func saveImage(_ call: CAPPluginCall) { save(call, video: false) }

    private func fileURL(_ raw: String) -> URL? {
        if raw.hasPrefix("file://") { return URL(string: raw) }
        return URL(fileURLWithPath: raw)
    }

    private func save(_ call: CAPPluginCall, video: Bool) {
        guard let raw = call.getString("path"), let url = fileURL(raw),
              FileManager.default.fileExists(atPath: url.path) else {
            call.reject("FILE_NOT_FOUND")
            return
        }
        let doSave = {
            PHPhotoLibrary.shared().performChanges({
                if video {
                    PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url)
                } else {
                    PHAssetChangeRequest.creationRequestForAssetFromImage(atFileURL: url)
                }
            }, completionHandler: { ok, err in
                if ok { call.resolve(["saved": true]) } else { call.reject(err?.localizedDescription ?? "SAVE_FAILED") }
            })
        }
        let status = PHPhotoLibrary.authorizationStatus(for: .addOnly)
        switch status {
        case .authorized, .limited:
            doSave()
        case .notDetermined:
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { st in
                if st == .authorized || st == .limited { doSave() } else { call.reject("PERMISSION_DENIED") }
            }
        default:
            call.reject("PERMISSION_DENIED")
        }
    }
}
