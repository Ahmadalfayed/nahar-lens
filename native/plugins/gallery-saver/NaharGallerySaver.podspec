Pod::Spec.new do |s|
  s.name = 'NaharGallerySaver'
  s.version = '1.0.0'
  s.summary = 'Save exported videos to Photos (Nahar Lens)'
  s.license = { :type => 'Proprietary', :text => 'جميع الحقوق محفوظة © 2026 وطن النهار' }
  s.homepage = 'https://lens.clipkat.live'
  s.author = 'وطن النهار'
  s.source = { :git => 'https://github.com/Ahmadalfayed/nahar-lens.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.9'
end
