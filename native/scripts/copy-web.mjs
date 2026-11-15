// ينسخ ملفات تطبيق الويب (من جذر المستودع) إلى www ليتم تضمينها داخل التطبيق — تعمل بدون إنترنت بالكامل.
// جميع الحقوق محفوظة © 2026 وطن النهار
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(here, '..', 'www');
const ITEMS = ['index.html', 'privacy.html', 'manifest.webmanifest', 'LICENSE', 'css', 'js', 'assets'];
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const it of ITEMS) {
  const src = join(root, it);
  if (!existsSync(src)) { console.warn('skip (missing):', it); continue; }
  cpSync(src, join(out, it), { recursive: true });
}
// علامة البناء الأصلي (لا عامل خدمة داخل التطبيق)
const idx = join(out, 'index.html');
writeFileSync(idx, readFileSync(idx, 'utf8').replace('<html lang="ar" dir="rtl">', '<html lang="ar" dir="rtl" data-native-build="1">'));
console.log('web assets copied to', out);
