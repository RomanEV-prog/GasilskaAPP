#!/usr/bin/env bash
# GasilApp — postavitev SPIN relaya na slovenskem VPS (enkratno).
# Zaženi kot root na svežem Ubuntu/Debian VPS s SLOVENSKIM IP:
#   bash setup-spin-relay.sh
#
# Rezultat: nginx posreduje SAMO SPIN feed (/Javno/ODApi/) in le zahtevam
# s produkcijskega strežnika GasilApp. Nato na produkciji nastavi:
#   SPIN_BASE_URL=http://<IP_TEGA_VPS>
set -euo pipefail

PROD_IP="178.104.67.229"   # IP produkcijskega strežnika GasilApp (Hetzner)

echo "==> Nameščam nginx ..."
apt-get update -qq
apt-get install -y -qq nginx curl

echo "==> Zapisujem konfiguracijo relaya ..."
cat > /etc/nginx/sites-available/spin-relay <<NGINX
server {
    listen 80 default_server;
    server_name _;

    set \$allowed 0;
    if (\$remote_addr = "${PROD_IP}") { set \$allowed 1; }

    location /Javno/ODApi/ {
        if (\$allowed = 0) { return 403; }
        proxy_pass https://spin3.sos112.si;
        proxy_ssl_server_name on;
        proxy_set_header Host spin3.sos112.si;
        proxy_set_header User-Agent "GasilApp-relay";
        proxy_connect_timeout 15s;
        proxy_read_timeout 15s;
    }

    location / { return 403; }
}
NGINX

ln -sf /etc/nginx/sites-available/spin-relay /etc/nginx/sites-enabled/spin-relay
rm -f /etc/nginx/sites-enabled/default

echo "==> Test in ponovni zagon nginx ..."
nginx -t
systemctl restart nginx
systemctl enable nginx >/dev/null 2>&1 || true

echo "==> Preverjam, ali VPS doseže SPIN (mora biti SI IP) ..."
if curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://spin3.sos112.si/Javno/ODApi/True" | grep -q "200"; then
  echo "    OK — SPIN dosegljiv s tega VPS."
else
  echo "    OPOZORILO: SPIN NI dosegljiv s tega VPS (morda ni SI IP?)."
fi

MYIP="$(curl -s --max-time 10 https://api.ipify.org || echo '<IP_VPS>')"
echo ""
echo "==> KONČANO. Na produkciji nastavi:  SPIN_BASE_URL=http://${MYIP}"
echo "    (in redeploy backenda — glej DEPLOY.md §10)"
