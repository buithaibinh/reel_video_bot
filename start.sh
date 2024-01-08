#!/usr/bin/env bash

set -e
source ./env.sh

echo "Setting up..."

./install.sh

echo "Starting..."

echo "Installing dependencies..."

yarn install

echo "Starting task..."

yarn start