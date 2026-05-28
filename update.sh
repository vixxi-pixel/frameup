#!/bin/bash
# Usage: ./update.sh ~/Downloads/frameup-update.zip

ZIP=$1

if [ -z "$ZIP" ]; then
  echo "Usage: ./update.sh path/to/update.zip"
  exit 1
fi

echo "Extracting $ZIP..."
unzip -o "$ZIP" -d /tmp/frameup-update

echo "Copying files..."
cp -r /tmp/frameup-update/frameup/* ./

echo "Cleaning up..."
rm -rf /tmp/frameup-update

echo "Done! Run: git add . && git commit -m 'update' && git push"