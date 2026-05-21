#!/bin/bash

# Path of Html
html_file="../build/index.html"

# Use sed to replace the specified strings in the HTML file
sed -i '' 's/\/static/static/g' "$html_file"

# Remove .map files from build/static/js folder
rm -f ../build/static/js/*.map

# Navigate to the build folder
cd ../build

zip -r build_contents.zip .

mv build_contents.zip ..

cd -

mv ../build_contents.zip ../build/

echo "Replacements and ZIP archive movement completed successfully."
