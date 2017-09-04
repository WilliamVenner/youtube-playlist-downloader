@echo off

echo Making directories...

mkdir "dl"
mkdir "dl/user"
mkdir "dl/albumart"

set /p key="YouTube API Key (console.developers.google.com): "

echo %key% > youtube-api-key.txt

echo Installing modules...

npm i youtube-playlist-info youtube-dl youtube-info readline node-id3 request merge path fs-extra

cls

exit