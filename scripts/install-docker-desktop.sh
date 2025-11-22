#!/bin/bash

# Docker Desktop Installation Script for Ubuntu
# This script automates the installation of Docker Desktop on Ubuntu 22.04+

set -e

echo "=========================================="
echo "Docker Desktop Installation Script"
echo "=========================================="
echo ""

# Check if running on Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    echo "Warning: This script is designed for Ubuntu. Proceeding anyway..."
fi

# Check Ubuntu version
UBUNTU_VERSION=$(grep VERSION_ID /etc/os-release | cut -d '"' -f 2)
echo "Detected Ubuntu version: $UBUNTU_VERSION"

# Check if Docker Desktop is already installed
if command -v docker &> /dev/null && docker --version | grep -q "Docker Desktop"; then
    echo "Docker Desktop appears to be already installed."
    docker --version
    exit 0
fi

# Check if Docker Engine is installed (might conflict)
if command -v docker &> /dev/null; then
    echo "Warning: Docker Engine is already installed."
    echo "Docker Desktop and Docker Engine can coexist, but you may need to configure which one to use."
    read -p "Continue with Docker Desktop installation? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update package list
echo ""
echo "Updating package list..."
sudo apt update

# Install prerequisites
echo ""
echo "Installing prerequisites..."
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Handle DEB file path
DEB_FILE=""

# Check if file path provided as argument
if [ -n "$1" ]; then
    if [ -f "$1" ]; then
        DEB_FILE="$1"
        echo "Using provided file: $DEB_FILE"
    else
        echo "Error: File not found: $1"
        exit 1
    fi
else
    # Look for Docker Desktop DEB in common locations
    DOWNLOAD_DIR="$HOME/Downloads"
    DEB_FILE=$(find "$DOWNLOAD_DIR" -name "docker-desktop-*-amd64.deb" 2>/dev/null | head -1)
    
    if [ -z "$DEB_FILE" ]; then
        echo ""
        echo "Docker Desktop .deb file not found."
        echo ""
        echo "Please download Docker Desktop from:"
        echo "  https://www.docker.com/products/docker-desktop/"
        echo ""
        echo "Then either:"
        echo "  1. Place it in $DOWNLOAD_DIR and run this script again"
        echo "  2. Run this script with the file path:"
        echo "     $0 /path/to/docker-desktop-*.deb"
        exit 1
    else
        echo "Found Docker Desktop file: $DEB_FILE"
    fi
fi

# Verify it's a valid DEB file
if ! file "$DEB_FILE" | grep -q "Debian binary"; then
    echo "Error: $DEB_FILE does not appear to be a valid Debian package."
    exit 1
fi

# Install Docker Desktop
echo ""
echo "Installing Docker Desktop from: $DEB_FILE"
sudo apt install -y "$DEB_FILE"

# Note: Keeping the DEB file for potential reinstallation

echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Launch Docker Desktop from your applications menu"
echo "2. Accept the Subscription Service Agreement on first run"
echo "3. Verify installation: docker --version"
echo ""
echo "To start the RAG system services, run:"
echo "  docker-compose up -d"
echo ""

