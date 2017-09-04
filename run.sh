#!/bin/bash
read -p "YouTube Playlist ID: " playlistid
nodejs youtube-playlist-downloader.js $playlistid