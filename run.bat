@echo off
set /p id="Enter YouTube playlist ID: "
node youtube-playlist-downloader.js %id%
PAUSE
