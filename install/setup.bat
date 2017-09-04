@echo off

echo Making files ^& directories...

mkdir "../dl"
mkdir "../dl/user"
mkdir "../dl/albumart"

set /p key="YouTube API Key (console.developers.google.com): "

echo %key% > "../youtube-api-key.txt"
echo {} > "../spotify.json"

echo Installing modules...

cd ../

call npm i youtube-playlist-info youtube-dl youtube-info readline node-id3 request merge path fs-extra

cd install

move avprobe.exe ../node_modules/youtube-dl/bin/avprobe.exe
move ffmpeg.exe ../node_modules/youtube-dl/bin/ffmpeg.exe
move ffprobe.exe ../node_modules/youtube-dl/bin/ffprobe.exe

echo All done!

pause