@echo off
set /p id="Enter YouTube playlist ID: "
node yt-playlist-downloader.js %id%
PAUSE