const dir             = "dl";
const user_dir        = "dl/user";
const albumart_dir    = "dl/albumart";

const youtube_playlist_info = require("youtube-playlist-info");
const youtube_dl            = require("youtube-dl");
const youtube_info          = require("youtube-info");
const readline              = require("readline");
const id3                   = require("node-id3");
const request               = require("request");
const merge                 = require("merge");
const path                  = require("path");
const fs                    = require("fs-extra");

String.prototype.matchAll = function(regexp) {
	var matches = [];
	this.replace(regexp, function() {
		var arr = ([]).slice.call(arguments, 0);
		var extras = arr.splice(-2);
		arr.index = extras[0];
		arr.input = extras[1];
		matches.push(arr);
	});
	return matches.length ? matches : null;
};

console.reset = function () {
	console.log("\x1Bc");
};

////////////////////////////////////////////////////////////////////////////////

var filetype_whitelist = {
	"image/png": ".png",
	"image/x-png": ".png",
	"image/jpg": ".jpg",
	"image/jpeg": ".jpg",
};

let args = process.argv.slice(2);

if (args.length != 1) {
	console.log("Incorrect number of arguments");
	process.exit();
}

const playlist_id = args[0];

// smarturl.it
// site selector: http://smarturl.it/thebootytape
// correct site: http://smarturl.it/SremmLife2.SP
// wrong site: http://smarturl.it/downloadANTI

// lnk.to
// site selector: https://lnk.to/LuvIsRage2
// no spotify: https://defleppard.lnk.to/hysteria30

console.log("Getting playlist information...");

var vids = [];

function print_table(items,msg,cmd) {
	// table generation
	var longest_row = 0;
	var rows = [
		{
			line: "/",
		},
		{
			text: "yt-playlist-downloader",
			align: "middle",
		},
		{
			text: playlist_id,
			align: "middle",
		},
		{
			line: "/",
		},
	];
	
	var longest_vid_row = 0;
	
	rows.push({
		text: "#" + (" ").repeat(String(items.length).length - 1) + " || S || D || Name",
		align: "left",
	});
	rows.push({
		line: "/",
	});
	
	var l = "#" + (" ").repeat(String(items.length).length) + " || S || D || ";
	items.forEach((item,i) => {
		if ((l.length + item.title.length) > longest_vid_row) {
			longest_vid_row = (l.length + item.title.length);
		}
		var downloaded = "X";
		if (fs.existsSync(dir + "/" + item.resourceId.videoId + ".mp3")) {
			downloaded = "Y";
		}
		var enabled = "Y";
		if (!vids[i].enabled) {
			enabled = "N";
		}
		rows.push({
			text: (i + 1) + (" ").repeat((String(items.length).length) - String(i + 1).length) + " || " + enabled + " || " + downloaded + " || " + item.title,
			align: "left",
		});
	});
	if (longest_vid_row > longest_row) {
		longest_row = longest_vid_row;
	}
	
	rows.forEach((row) => {
		if (row.text) {
			if (row.text.length > longest_row) {
				longest_row = row.text.length;
			}
		}
	});
	
	rows.push({
		line: "/",
	});
	
	rows.forEach((row) => {
		if (row.line) {
			row.padding = false;
			row.align   = "left";
			row.text    = row.line.repeat(longest_row + 6);
			delete(row.line);
		}
	});
	
	rows.forEach((row) => {
		if (row.padding == false) {
			if (row.align == "left") {
				console.log(row.text);
			} else if (row.align == "right") {
				console.log((" ").repeat(longest_row - row.text.length) + row.text);
			} else if (row.align == "middle") {
				let spaces = (longest_row / 2) - (row.text.length / 2);
				if (spaces % 1 == 0) {
					console.log((" ").repeat(spaces) + row.text + (" ").repeat(spaces));
				} else {
					console.log((" ").repeat(spaces) + row.text + (" ").repeat(spaces - 1));
				}
			}
		} else {
			if (row.align == "left") {
				console.log("|| " + row.text + (" ").repeat(longest_row - row.text.length) + " ||");
			} else if (row.align == "right") {
				console.log("|| " + (" ").repeat(longest_row - row.text.length) + row.text + " ||");
			} else if (row.align == "middle") {
				let spaces = (longest_row / 2) - (row.text.length / 2);
				if (spaces % 1 == 0) {
					console.log("|| " + (" ").repeat(spaces) + row.text + (" ").repeat(spaces) + " ||");
				} else {
					console.log("|| " + (" ").repeat(spaces) + row.text + (" ").repeat(spaces - 1) + " ||");
				}
			}
		}
	});
	
	console.log("Type a video's number to enable/disable downloading it");
	console.log("Type \"download\" to start downloading videos");
	console.log("Type \"flushdownloads\" to delete all downloads");
	console.log("Type \"flushfinished\" to delete all processed (with the \"finish\" command) downloads");
	console.log("Type \"spotify\" to detect Spotify tracks");
	console.log("Type \"spotify-force\" to manually add Spotify links to a video");
	console.log("Type \"spotify-clear\" to manually clear Spotify links from a video");
	console.log("Type \"flushspotify\" to delete all saved Spotify data");
	console.log("Type \"dir\" to show where downloads are going");
	console.log("Type \"finish\" to get .zip, insert metadata and get Spotify links");
	console.log("Type \"clean\" to delete foreign .mp3 files, skipped videos and Spotify linked videos");
	console.log("Type \"metadata\" to change the metadata of an already written video");
	console.log("Type \"albumart\" to attach album art from URLs to .mp3s (.png & .jpg only)");
	console.log("Type \"refresh\" to refresh playlist info");
	console.log("Type \"quit\" to quit");

	function save_spotify(out,cb) {
		if (!fs.existsSync("spotify.json")) {
			fs.writeFile("spotify.json",JSON.stringify(out),err => {
				if(err) return console.error("ERROR: " + err);
				cb();
			});
		} else {
			fs.readFile("spotify.json","utf8",(err,data) => {
				if (err) return console.error("ERROR: " + err);
				fs.writeFile("spotify.json",JSON.stringify(merge(JSON.parse(data),out)),err => {
					if(err) return console.error("ERROR: " + err);
					cb();
				});
			});
		}
	}

	function get_info(index,cb) {
		if ((index + 1) > vids.length) {
			cb();
			return;
		}
		console.log("Finding Spotify track for video #" + (index + 1));
		youtube_info(vids[index].vid.resourceId.videoId,(err,videoInfo) => {
			if (err) {
				console.log("ERROR: " + err);
				return;
			}
			
			let links = {
				spotify: /href="https?:\/\/(?:open\.)?spotify\.com\/((?:track|album)\S+)"/ig,
				smarturl: /href="(https?:\/\/(?:www\.)?smarturl\.it\/(\S+))"/ig,
				lnk: /href="(https?:\/\/(?:\S+\.)?lnk\.to\/(\S+))"/ig,
			};
			var requests = [];
			
			function ts(ch) {
				var output = false;
				requests.forEach((req) => {
					if (req._callbackCalled) {
						output = true;
					} else if (req._aborted) {
						output = true;
					} else if (req.req._ended == true) {
						output = true;
					} else {
						output = false;
					}
				});
				if (ch == true) {
					
					if (vids[index].spotify.length > 0) {
						console.log(vids[index].spotify);
						vids[index].enabled = false;
						var out = {};
						out[vids[index].vid.resourceId.videoId] = vids[index].spotify;
						save_spotify(out,() => {
							get_info(index + 1,cb);
						});
					} else {
						get_info(index + 1,cb);
					}
					
					clearInterval(i);
				} else {
					if (output || requests.length == 0) {
						ts(true);
					}
				}
				return output;
			}
			var i = setInterval(ts,50);
			
			for (var type in links) {
				let matches = videoInfo.description.matchAll(links[type]);
				if (matches) {
					matches.forEach((match) => {
						switch(type) {
							case "spotify":
								vids[index].spotify.push(match[1]);
								break;
							case "smarturl":
							case "lnk":
								requests.push(request.get(match[1],function(err,httpobj,body) {
									if (err) {
										console.log("ERROR: " + err);
										return;
									}
									var sp  = body.matchAll(links.spotify);
									if (sp) {
										sp.forEach((link) => {
											vids[index].spotify.push(link[1]);
										});
									}
								}));
								break;
						}
					});
				}
			}
		});
	}
	
	function download(index,cb) {
		if ((index + 1) > vids.length) {
			cb();
			return;
		}
		fs.readdir(dir,(err, files) => {
			if (err) {return;}
			var f = false;
			files.forEach(file => {
				if (file.match(new RegExp(vids[index].vid.resourceId.videoId + "\\.mp3$"))) {
					console.log("Skipping download for video #" + (index + 1) + " (already downloaded)");
					f = true;
					return false;
				}
			});
			if (!f) {
				if (vids[index].enabled == false) {
					console.log("Skipping download for video #" + (index + 1) + " (user skip)");
					download(index + 1,cb);
					return false;
				}
				console.log("Downloading video #" + (index + 1));
				youtube_dl.exec("https://youtube.com/watch?v=" + vids[index].vid.resourceId.videoId, ["-x", "--hls-prefer-ffmpeg", "--prefer-ffmpeg", "--audio-format", "mp3"], {cwd: dir}, function(err, output) {
					if (err) {
						console.log("ERROR: " + err);
						return;
					}
					fs.readdir(dir,(err, files) => {
						if (err) {return;}
						files.forEach(file => {
							if (file.match(new RegExp(vids[index].vid.resourceId.videoId + "\\.mp3$"))) {
								fs.rename(dir + "/" + file,dir + "/" + vids[index].vid.resourceId.videoId + ".mp3");
								console.log("Downloaded to " + dir + "/" + vids[index].vid.resourceId.videoId + ".mp3");
								download(index + 1,cb);
								return false;
							}
						});
					});
				});
			} else {
				download(index + 1,cb);
			}
		});
	}
	
	function write_metadata(vid,name,artists,album,img,cb) {
		var metadata = {};
		if (name.trim() != "") {
			metadata.title = name;
		}
		if (artists.length > 0) {
			metadata.artist = artists.join("; ");
		}
		if (album.trim() != "") {
			metadata.album = album;
		}
		if (img.trim() != "") {
			console.log("Downloading album art...");
			request.head(img.trim(),function(err,res,body) {
				if (err) return console.error("ERROR: " + err);
				
				if (filetype_whitelist[res.headers["content-type"]]) {
					request(img.trim()).pipe(fs.createWriteStream(albumart_dir + "/" + vid.vid.resourceId.videoId + filetype_whitelist[res.headers["content-type"]]))
						.on("close",() => {
							metadata.image = albumart_dir + "/" + vid.vid.resourceId.videoId + filetype_whitelist[res.headers["content-type"]];
							console.log("Downloaded album art");
							id3.write(metadata,user_dir + "/" + vid.vid.resourceId.videoId + ".mp3");
							cb();
						});
				} else {
					console.log("Not a PNG or JPG file");
					id3.write(metadata,user_dir + "/" + vid.vid.resourceId.videoId + ".mp3");
					cb();
				}
			});
		}
	}
	
	function metadata(vid,cb) {
		var input = readline.createInterface(process.stdin,process.stdout);
		input.setPrompt("Name: ");
		input.prompt();
		input.on("line",name => {
			input.close();
			var album_i = readline.createInterface(process.stdin,process.stdout);
			album_i.setPrompt("Album: ");
			album_i.prompt();
			album_i.on("line",album => {
				album_i.close();
				var artists = [];
				function artist_f(iter) {
					var artist_i = readline.createInterface(process.stdin,process.stdout);
					artist_i.setPrompt("Artist " + iter + ": ");
					artist_i.prompt();
					artist_i.on("line",artist => {
						if (artist.trim() == "") {
							artist_i.close();
							var img_url = readline.createInterface(process.stdin,process.stdout);
							img_url.setPrompt("Album Art URL: ");
							img_url.prompt();
							img_url.on("line",img => {
								img_url.close();
								
								if (fs.existsSync(user_dir + "/" + vid.vid.resourceId.videoId + ".mp3")) {
									write_metadata(vid,name,artists,album,img,cb);
								} else {
									fs.copy(dir + "/" + vid.vid.resourceId.videoId + ".mp3",user_dir + "/" + vid.vid.resourceId.videoId + ".mp3",err => {
										if (err) return console.error("ERROR: " + err);
										write_metadata(vid,name,artists,album,img,cb);
									});
								}
							});
						} else {
							artist_i.close();
							artists.push(artist);
							artist_f(iter + 1);
						}
					});
				}
				artist_f(1);
			});
		});
	}
	
	function finish(index,cb,do_skip) {
		if ((index + 1) > vids.length) {
			cb();
			return;
		}
		console.log("[" + vids[index].vid.title + "]");
		if (vids[index].spotify.length > 0) {
			vids[index].spotify.forEach(link => {
				console.log("https://open.spotify.com/" + link.replace(/^manual:/,""));
				finish(index + 1,cb);
			});
		} else {
			if (fs.existsSync(user_dir + "/" + vids[index].vid.resourceId.videoId + ".mp3") && do_skip != true) {
				console.log("Skipping because metadata already written - to change this use the metadata command");
				finish(index + 1,cb);
			} else {
				metadata(vids[index],() => {
					finish(index + 1,cb);
				});
			}
		}
	}
	
	function albumart(files,index,cb) {
		vids.forEach(vid => {
			if (vid.vid.resourceId.videoId == files[index].replace(/\.mp3$/,"")) {
				console.log("[" + vid.vid.title + "]");
				var url_i = readline.createInterface(process.stdin,process.stdout);
				url_i.setPrompt("URL: ");
				url_i.prompt();
				url_i.on("line",line => {
					url_i.close();
					if (line.trim() != "") {
						console.log("Downloading album art...");
						request.head(line,function(err,res,body) {
							if (err) return console.error("ERROR: " + err);
							
							if (filetype_whitelist[res.headers["content-type"]]) {
								request(line).pipe(fs.createWriteStream(albumart_dir + "/" + vid.vid.resourceId.videoId + filetype_whitelist[res.headers["content-type"]]))
									.on("close",() => {
										var cur_tags = id3.read(user_dir + "/" + vid.vid.resourceId.videoId + ".mp3");
										id3.write(merge(cur_tags,{
											image: albumart_dir + "/" + vid.vid.resourceId.videoId + filetype_whitelist[res.headers["content-type"]],
										}),user_dir + "/" + vid.vid.resourceId.videoId + ".mp3");
										console.log("Album art written to file");
										albumart(files,index + 1,cb);
									});
							} else {
								console.log("Not a PNG or JPG file");
								url_i.prompt();
							}
						});
					} else {
						albumart(files,index + 1,cb);
					}
				});
				return false;
			}
		});
	}
	
	var rl = readline.createInterface(process.stdin,process.stdout);
	rl.setPrompt("yt-playlist-downloader> ");
	rl.prompt();
	
	if (msg && cmd) {
		process.stdout.write(cmd + "\n" + msg + "\nyt-playlist-downloader> ");
	}

	rl.on("line",function(line) {
		var r1_l = this;
		if (!isNaN(line)) {
			this.close();
			vids[Number(line) - 1].enabled = !vids[Number(line) - 1].enabled;
			console.reset();
			print_table(items);
		} else if (line == "dir") {
			console.log(path.resolve(dir));
			this.prompt();
		} else if (line == "download") {
			console.log("This may take a while, depending on your internet speed.");
			download(0,() => {
				r1_l.close();
				console.reset();
				print_table(items,"Downloaded all files","download");
			});
		} else if (line == "quit") {
			this.close();
			process.exit(0);
		} else if (line == "spotify") {
			console.log("This may take a while, depending on your internet speed.");
			fs.writeFile("spotify.json","{}",function(err) {
				if(err) return console.error("ERROR: " + err);
				vids.forEach((vid,i) => {
					if (vids[i].spotify_manual != true) {
						vids[i].spotify = [];
					}
				});
				get_info(0,() => {
					r1_l.close();
					console.reset();
					print_table(items,"Finished getting Spotify links","spotify");
				});
			});
		} else if (line == "flushspotify") {
			var t = this;
			fs.writeFile("spotify.json","{}",function(err) {
				if(err) return console.error("ERROR: " + err);
				vids.forEach((vid,i) => {
					if (vids[i].spotify.length > 0) {
						vids[i].spotify = [];
						vids[i].enabled = false;
					}
				});
				console.log("Flushed Spotify file.");
				t.prompt();
			});
		} else if (line == "flushfinished") {
			fs.readdir(user_dir,(err,files) => {
				if (err) return console.error("ERROR: " + err);
				files.forEach(file => {
					if (file.match(/\.mp3$/i)) {
						fs.unlink(user_dir + "/" + file);
						console.log("Deleted file " + file);
					}
				});
				console.log("Deleted all user download files");
				t.prompt();
			});
		} else if (line == "flushdownloads") {
			var t = this;
			fs.readdir(dir,(err,files) => {
				if (err) return console.error("ERROR: " + err);
				files.forEach(file => {
					if (file.match(/\.mp3$/i)) {
						fs.unlink(dir + "/" + file);
						console.log("Deleted file " + file);
					}
				});
				fs.readdir(user_dir,(err,files) => {
					if (err) return console.error("ERROR: " + err);
					files.forEach(file => {
						if (file.match(/\.mp3$/i)) {
							fs.unlink(user_dir + "/" + file);
							console.log("Deleted file " + file);
						}
					});
					console.log("Deleted all downloaded files");
					t.prompt();
				});
			});
		} else if (line == "clean") {
			var t = this;
			console.log("Cleaning user directory...");
			fs.readdir(user_dir,(err, files) => {
				if (err) return console.error("ERROR: " + err);
				files.forEach(file => {
					if (file.match(/\.mp3$/i)) {
						var f = false;
						vids.forEach(vid => {
							if (vid.vid.resourceId.videoId == file.replace(/\.mp3$/i,"")) {
								f = true;
								return false;
							}
						});
						if (!f) {
							fs.unlink(dir + "/" + file);
							console.log("Deleted file " + file);
						}
					}
				});
				console.log("Cleaning download directory...");
				fs.readdir(dir,(err, files) => {
					if (err) return console.error("ERROR: " + err);
					files.forEach(file => {
						if (file.match(/\.mp3$/i)) {
							var f = false;
							vids.forEach(vid => {
								if (vid.vid.resourceId.videoId == file.replace(/\.mp3$/i,"")) {
									f = true;
									return false;
								}
							});
							if (!f) {
								fs.unlink(dir + "/" + file);
								console.log("Deleted file " + file);
							}
						}
					});
					console.log("Cleaning...");
					vids.forEach(vid => {
						if (fs.existsSync(dir + "/" + vid.vid.resourceId.videoId + ".mp3")) {
							if (vid.enabled == false) {
								fs.unlink(dir + "/" + vid.vid.resourceId.videoId + ".mp3");
								console.log("Deleted file " + vid.vid.resourceId.videoId + ".mp3");
								return;
							}
							if (vid.spotify.length > 0) {
								fs.unlink(dir + "/" + vid.vid.resourceId.videoId + ".mp3");
								console.log("Deleted file " + vid.vid.resourceId.videoId + ".mp3");
								return;
							}
						}
						if (fs.existsSync(user_dir + "/" + vid.vid.resourceId.videoId + ".mp3")) {
							if (vid.enabled == false) {
								fs.unlink(user_dir + "/" + vid.vid.resourceId.videoId + ".mp3");
								console.log("Deleted file " + vid.vid.resourceId.videoId + ".mp3");
								return;
							}
							if (vid.spotify.length > 0) {
								fs.unlink(user_dir + "/" + vid.vid.resourceId.videoId + ".mp3");
								console.log("Deleted file " + vid.vid.resourceId.videoId + ".mp3");
								return;
							}
						}
						if (fs.existsSync(albumart_dir + "/" + vid.vid.resourceId.videoId + ".jpg")) {
							if (vid.enabled == false) {
								fs.unlink(albumart_dir + "/" + vid.vid.resourceId.videoId + ".jpg");
								console.log("Deleted file " + vid.vid.resourceId.videoId + ".jpg");
								return;
							}
							if (vid.spotify.length > 0) {
								fs.unlink(albumart_dir + "/" + vid.vid.resourceId.videoId + ".jpg");
								console.log("Deleted file " + vid.vid.resourceId.videoId + ".jpg");
								return;
							}
						}
						if (fs.existsSync(albumart_dir + "/" + vid.vid.resourceId.videoId + ".png")) {
							if (vid.enabled == false) {
								fs.unlink(albumart_dir + "/" + vid.vid.resourceId.videoId + ".png");
								console.log("Deleted file " + vid.vid.resourceId.videoId + ".png");
								return;
							}
							if (vid.spotify.length > 0) {
								fs.unlink(albumart_dir + "/" + vid.vid.resourceId.videoId + ".png");
								console.log("Deleted file " + vid.vid.resourceId.videoId + ".png");
								return;
							}
						}
					});
					console.log("Finished cleaning");
					t.prompt();
				});
			});
		} else if (line == "metadata") {
			var t = this;
			t.close();
			var video_n = readline.createInterface(process.stdin,process.stdout);
			video_n.setPrompt("Video Number: #");
			video_n.prompt();
			video_n.on("line",line => {
				video_n.close();
				if (isNaN(line)) {
					console.log("Not a video number!");
					t.prompt();
				} else if (!vids[Number(line) - 1]) {
					console.log("Video with that number does not exist");
					t.prompt();
				} else if (!fs.existsSync(user_dir + "/" + vids[Number(line) - 1].vid.resourceId.videoId + ".mp3")) {
					console.log("Video doesn't have any metadata yet!");
					t.prompt();
				} else {
					console.log("[" + vids[Number(line) - 1].vid.title + "]");
					metadata(vids[Number(line) - 1],() => {
						console.log("Successfully changed metadata");
						t.prompt();
					});
				}
			});
		} else if (line == "finish") {
			this.close();
			console.log("Leave anything blank to skip or stop iteration");
			finish(0,() => {
				process.exit(0);
			});
		} else if (line == "albumart") {
			var t = this;
			t.close();
			console.log("Leave blank to skip adding album art");
			fs.readdir(user_dir,(err,files) => {
				if (err) return console.error("ERROR: " + err);
				albumart(files,0,() => {
					t.prompt();
				});
			});
		} else if (line == "refresh") {
			console.log("Refreshing playlist info...")
			this.close();
			yt_playlist();
		} else if (line == "spotify-clear") {
			var t = this;
			t.close();
			var video_n = readline.createInterface(process.stdin,process.stdout);
			video_n.setPrompt("Video Number: #");
			video_n.prompt();
			video_n.on("line",line => {
				video_n.close();
				if (isNaN(line)) {
					console.log("Not a video number!");
					t.prompt();
				} else if (!vids[Number(line) - 1]) {
					console.log("Video with that number does not exist");
					t.prompt();
				} else {
					vids[Number(line) - 1].spotify = [];
					vids[Number(line) - 1].enabled = true;
					var out = {};
					out[vids[Number(line) - 1].vid.resourceId.videoId] = vids[Number(line) - 1].spotify;
					save_spotify(out,() => {
						t.close();
						console.reset();
						print_table(items,"Manually cleared Spotify links for video #" + line,"spotify-clear");
					});
				}
			});
		} else if (line == "spotify-force") {
			var t = this;
			t.close();
			var video_n = readline.createInterface(process.stdin,process.stdout);
			video_n.setPrompt("Video Number: #");
			video_n.prompt();
			video_n.on("line",line => {
				video_n.close();
				if (isNaN(line)) {
					console.log("Not a video number!");
					t.prompt();
				} else if (!vids[Number(line) - 1]) {
					console.log("Video with that number does not exist");
					t.prompt();
				} else {
					console.log("[" + vids[Number(line) - 1].vid.title + "]");
					var sp = readline.createInterface(process.stdin,process.stdout);
					sp.setPrompt("open.spotify.com link: ");
					sp.prompt();
					sp.on("line",sp_link => {
						sp.close();
						var spr = /^(?:https?:\/\/open\.spotify\.com\/)?((?:track|album)\/.*)$/i.exec(sp_link);
						if (spr) {
							vids[Number(line) - 1].spotify.push("manual:" + spr[1]);
							vids[Number(line) - 1].enabled = false;
							var out = {};
							out[vids[Number(line) - 1].vid.resourceId.videoId] = vids[Number(line) - 1].spotify;
							save_spotify(out,() => {
								t.close();
								console.reset();
								print_table(items,"Manually set Spotify link for video #" + line,"spotify-force");
							});
						} else {
							console.log("Not an open.spotify.com link");
							t.prompt();
						}
					});
				}
			});
		} else {
			console.log("Invalid command");
			this.prompt();
		}
	});
}
function yt_playlist() {
	if (!fs.existsSync("youtube-api-key.txt")) {
		console.error("You have not supplied your YouTube API key. Please run setup.sh (Linux) or setup.bat (Windows)");
		return;
	}
	console.log("If nothing happens, check your API key.");
	
	var youtube_api_key;
	fs.readFile("youtube-api-key.txt","utf8",(err,data) => {
		if (err) return console.error("ERROR: " + err);
		youtube_api_key = data;
		
		youtube_playlist_info.playlistInfo(youtube_api_key,playlist_id,(items) => {
		
			vids = [];
		
			console.reset();
		
			items.forEach((item) => {
				vids.push({
					enabled: true,
					spotify: [],
					vid: item,
				});
			});
		
			fs.readFile("spotify.json","utf8",(err,data) => {
				if (err) return console.error("ERROR: " + err);
				data = JSON.parse(data);
				for (var vid_id in data) {
					vids.forEach((vid,i) => {
						if (vid.vid.resourceId.videoId == vid_id) {
							vids[i].spotify = [];
							vids[i].enabled = false;
							data[vid_id].forEach(sp => {
								if (sp.match(/^manual:/)) {
									vids[i].spotify.push(sp.replace(/^manual:/,""));
								}
							});
						}
					});
				}
				print_table(items);
			});
			
		});
	});
} yt_playlist();