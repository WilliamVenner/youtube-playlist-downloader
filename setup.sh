#!/bin/bash

clear

echo Making directories...

mkdir "dl"
mkdir "dl/user"
mkdir "dl/albumart"

read -p "YouTube API Key (console.developers.google.com): " apikey

$apikey > youtube-api-key.txt

chmod 777 youtube-api-key.txt

echo Installing modules...

npm i youtube-playlist-info youtube-dl youtube-info readline node-id3 request merge path fs-extra

chmod +x run.sh

exit