#!/bin/bash
export SSL_CERT_FILE=/etc/pki/tls/certs/ca-bundle.crt
export DART_VM_OPTIONS="--http_unverified_trusted_cert"
export PUB_HOSTED_URL="https://pub.dev"

cd /home/kauanmassuia/Desktop/digitalwallet/apps/consumer
/home/kauanmassuia/development/flutter/bin/flutter pub get --offline || /home/kauanmassuia/development/flutter/bin/flutter pub get
/home/kauanmassuia/development/flutter/bin/flutter run -d chrome --web-port 4000 --web-hostname 0.0.0.0
