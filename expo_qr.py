#!/usr/bin/env python3
import os
import sys
import time
import subprocess

print("🚀 Iniciando servidores e gerando QR Code Expo...")

# 1. Garante que o Web Server local porta 4000 tá ativo
subprocess.Popen(["node", "/tmp/serve_flutter.js"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

# 2. Inicia SSH Tunnel sem restrição de IP
proc = subprocess.Popen(["ssh", "-o", "StrictHostKeyChecking=no", "-R", "80:localhost:4000", "serveo.net"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

url = None
start_time = time.time()
while time.time() - start_time < 10:
    line = proc.stdout.readline()
    if "Forwarding HTTP traffic from" in line:
        url = line.split("from")[-1].strip()
        break

if not url:
    print("❌ Falha ao obter URL pública. Tente novamente.")
    sys.exit(1)

print("\n" + "="*50)
print(f"  URL PÚBLICA: {url}")
print("="*50 + "\n")

import qrcode
qr = qrcode.QRCode(box_size=2)
qr.add_data(url)
qr.print_ascii(invert=True)

print("\n📱 ESCANEIE O QR CODE ACIMA COM O SEU IPHONE NO EXPO STYLE!")
EOF
