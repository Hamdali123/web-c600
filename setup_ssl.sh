#!/bin/bash

echo "Generating self-signed SSL certificate..."
sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/ssl/private/smartolt-selfsigned.key \
    -out /etc/ssl/certs/smartolt-selfsigned.crt \
    -subj "/C=ID/ST=Jakarta/L=Jakarta/O=SmartOLT/OU=IT/CN=103.68.214.225"

echo "Updating Nginx configuration..."
sudo bash -c 'cat > /etc/nginx/sites-available/smartolt.conf <<EOF
server {
    listen 80;
    server_name _;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name _;

    ssl_certificate /etc/ssl/certs/smartolt-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/smartolt-selfsigned.key;

    # Proxy ke aplikasi Next.js (Port 3009)
    location / {
        proxy_pass http://127.0.0.1:3009;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Proxy ke WebSocket Terminal Server (Port 3010)
    location /ws {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF'

echo "Testing Nginx configuration..."
sudo nginx -t

echo "Restarting Nginx..."
sudo systemctl restart nginx

echo "HTTPS setup complete! You can now access https://103.68.214.225"
