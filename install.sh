#!/usr/bin/env bash

set -e
source ./env.sh

echo "Installing dependencies..."

# Install Node.js if not installed
if ! command -v node &> /dev/null
then
    echo "Node.js not found. Installing..."
    curl -sL https://deb.nodesource.com/18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
# print node version
echo "Node version: $(node -v)"

# Install Yarn if not installed
if ! command -v yarn &> /dev/null
then
    echo "Yarn not found. Installing..."
    npm install -g yarn
fi
# print yarn version
echo "Yarn version: $(yarn -v)"

# Install ffmpeg if not installed
if ! command -v ffmpeg &> /dev/null
then
    echo "ffmpeg not found. Installing..."
    sudo apt-get install -y ffmpeg
fi
# print ffmpeg version
echo "ffmpeg version: $(ffmpeg -version)"

# Install Python3 if not installed
if ! command -v python3 &> /dev/null
then
    echo "Python3 not found. Installing..."
    sudo apt-get install -y python3
fi

# install yt-dlp if not installed, otherwise update
if ! command -v yt-dlp &> /dev/null
then
    echo "yt-dlp not found. Installing..."
    sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
    sudo chmod a+rx /usr/local/bin/yt-dlp  # Make executable
fi

# update yt-dlp
sudo yt-dlp -U

# print yt-dlp version
echo "yt-dlp version: $(yt-dlp --version)"