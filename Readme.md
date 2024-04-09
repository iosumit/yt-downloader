## Youtube Video / Playlist Downloader

The repository you're referring to likely contains a script or tool designed to facilitate the downloading of entire YouTube playlists or Videos from List of urls.

---
## How to use it
Paste your playlist url to `.env` file located in root directory
```python
PLAYLIST_URL=**Playlist url**
START=0   # start from
END=400   # ends to
```
if you want to download YT video from list of URLs, then
add below line to `.env` file
```
FROM_LIST=**Your List of urls**
```

`Urls should be in comma separated format url_1<comma><whitespace>url_2<comma><whitespace>url_3`
for example - 
https://youtu.be/abab, https://youtu.be/bcde, https://youtu.be/ghi


Now run,
```
npm start
```
Download will start.