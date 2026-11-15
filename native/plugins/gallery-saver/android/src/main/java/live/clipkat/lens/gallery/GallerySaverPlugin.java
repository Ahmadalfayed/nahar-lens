// عدسة النهار — حفظ الفيديو في المعرض | جميع الحقوق محفوظة © 2026 وطن النهار
package live.clipkat.lens.gallery;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.content.Context;
import android.webkit.WebView;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(
    name = "GallerySaver",
    permissions = { @Permission(strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "legacyStorage") }
)
public class GallerySaverPlugin extends Plugin {
    private static final String ALBUM = "عدسة النهار";

    @PluginMethod
    public void saveVideo(PluginCall call) { start(call); }

    @PluginMethod
    public void saveImage(PluginCall call) { start(call); }

    /** يفتح نافذة الطباعة / الحفظ كـ PDF لمحتوى الصفحة الحالية (تنسيق @media print). */
    @PluginMethod
    public void print(PluginCall call) {
        final String name = call.getString("name", "عدسة النهار");
        getActivity().runOnUiThread(() -> {
            try {
                WebView wv = getBridge().getWebView();
                final PrintDocumentAdapter inner = wv.createPrintDocumentAdapter(name);
                PrintDocumentAdapter wrapped = new PrintDocumentAdapter() {
                    @Override public void onStart() { inner.onStart(); }
                    @Override public void onLayout(PrintAttributes o, PrintAttributes n, CancellationSignal c, LayoutResultCallback cb, Bundle b) { inner.onLayout(o, n, c, cb, b); }
                    @Override public void onWrite(PageRange[] p, ParcelFileDescriptor d, CancellationSignal c, WriteResultCallback cb) { inner.onWrite(p, d, c, cb); }
                    @Override public void onFinish() { inner.onFinish(); call.resolve(); }
                };
                PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                pm.print(name, wrapped, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "PRINT_FAILED", e);
            }
        });
    }

    private void start(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("legacyStorage") != PermissionState.GRANTED) {
            requestPermissionForAlias("legacyStorage", call, "permCallback");
            return;
        }
        doSave(call);
    }

    @PermissionCallback
    private void permCallback(PluginCall call) {
        if (getPermissionState("legacyStorage") == PermissionState.GRANTED) doSave(call);
        else call.reject("PERMISSION_DENIED");
    }

    private static File toFile(String raw) {
        if (raw.startsWith("file://")) return new File(Uri.parse(raw).getPath());
        return new File(raw);
    }

    private void doSave(PluginCall call) {
        final String raw = call.getString("path");
        final boolean video = "saveVideo".equals(call.getMethodName());
        if (raw == null) { call.reject("FILE_NOT_FOUND"); return; }
        final File src = toFile(raw);
        if (!src.exists()) { call.reject("FILE_NOT_FOUND"); return; }
        final String name = call.getString("fileName", src.getName());
        final String mime = call.getString("mimeType", video ? "video/mp4" : "image/jpeg");
        new Thread(() -> {
            try {
                String saved;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentResolver cr = getContext().getContentResolver();
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                    v.put(MediaStore.MediaColumns.RELATIVE_PATH, (video ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_PICTURES) + "/" + ALBUM);
                    v.put(MediaStore.MediaColumns.IS_PENDING, 1);
                    Uri collection = video
                        ? MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                        : MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                    Uri item = cr.insert(collection, v);
                    if (item == null) throw new Exception("INSERT_FAILED");
                    try (InputStream in = new FileInputStream(src); OutputStream out = cr.openOutputStream(item)) {
                        copy(in, out);
                    }
                    v.clear();
                    v.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    cr.update(item, v, null, null);
                    saved = item.toString();
                } else {
                    File dir = new File(Environment.getExternalStoragePublicDirectory(video ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_PICTURES), ALBUM);
                    if (!dir.exists() && !dir.mkdirs()) throw new Exception("MKDIR_FAILED");
                    File dst = new File(dir, name);
                    try (InputStream in = new FileInputStream(src); OutputStream out = new FileOutputStream(dst)) {
                        copy(in, out);
                    }
                    MediaScannerConnection.scanFile(getContext(), new String[] { dst.getAbsolutePath() }, new String[] { mime }, null);
                    saved = dst.getAbsolutePath();
                }
                JSObject r = new JSObject();
                r.put("saved", true);
                r.put("uri", saved);
                call.resolve(r);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "SAVE_FAILED", e);
            }
        }).start();
    }

    private static void copy(InputStream in, OutputStream out) throws java.io.IOException {
        byte[] buf = new byte[1 << 16];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
    }
}
