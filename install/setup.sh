#!/bin/bash

clear

echo Making files & directories...

mkdir "dl"
mkdir "dl/user"
mkdir "dl/albumart"
echo "{}" >> spotify.json

chmod 777 node_modules -R

read -p "YouTube API Key (console.developers.google.com): " apikey

$apikey >> youtube-api-key.txt

chmod 777 youtube-api-key.txt

echo Installing modules...

npm i youtube-playlist-info youtube-dl youtube-info readline node-id3 request merge path fs-extra

rm avprobe.exe
rm ffmpeg.exe
rm ffprobe.exe

chmod +x run.sh

exit