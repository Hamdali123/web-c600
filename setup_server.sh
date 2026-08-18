#!/bin/bash

# Exit script on any error
set -e

echo "Starting Server Setup for SmartOLT..."

# 1. Update package list and install Nginx if not present
echo "Checking and installing Nginx..."
apt-get update
apt-get install -y nginx

# 2. Setup Systemd Service
echo "Setting up Systemd Service..."
cp /home/sanwanay/smartolt_baru/smartolt.service /etc/systemd/system/smartolt.service
systemctl daemon-reload
systemctl enable smartolt.service
systemctl restart smartolt.service
echo "Systemd service activated!"

# 3. Setup Nginx Configuration
echo "Setting up Nginx configuration..."
# Remove default nginx config if exists
rm -f /etc/nginx/sites-enabled/default
cp /home/sanwanay/smartolt_baru/smartolt.conf /etc/nginx/sites-available/smartolt.conf
# Symlink if not already linked
ln -sf /etc/nginx/sites-available/smartolt.conf /etc/nginx/sites-enabled/smartolt.conf

# 4. Restart Nginx
echo "Restarting Nginx..."
systemctl restart nginx

echo "==============================================="
echo "Setup Complete!"
echo "SmartOLT is now running in the background."
echo "It will automatically start whenever the server reboots."
echo "You can check the status by running: sudo systemctl status smartolt"
echo "==============================================="
