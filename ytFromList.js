const ytdl = require('ytdl-core');
const cp = require('child_process');
const readline = require('readline');
const FS = require('fs');
const ffmpeg = require('ffmpeg-static');

/**
 * @param {List} urls
 */

const videosQueue = []

module.exports = ytFromList = async (urls) => {
    console.log("Videos Counts - ", urls.length);
    for (let i = 3; i < urls.length; i++) {
        videosQueue.push({
            index: i + 1,
            url: urls[i],
            start: Date.now(),
            audio: { downloaded: 0, total: Infinity },
            video: { downloaded: 0, total: Infinity },
            merged: { frame: 0, speed: '0x', fps: 0 },
        })
    }
    runTaskQueued()
}

const runTaskQueued = () => {
    if (videosQueue.length > 0) {
        tracker = videosQueue.shift()
        downloadVideo();
    } else {
        console.log('ALL VIDEO DONE')
    }
}

let tracker = null
async function downloadVideo() {
    const dirPrefix = "./Single_Videos/";

    const audio = ytdl(tracker.url, { quality: 'highestaudio' })
        .on('progress', (_, downloaded, total) => {
            tracker.audio = { downloaded, total };
        });
    const video = ytdl(tracker.url, { quality: 'highestvideo' })
        .on('progress', (_, downloaded, total) => {
            tracker.video = { downloaded, total };
        });

    const ffmpegProcess = cp.spawn(ffmpeg, [
        // Remove ffmpeg's console spamming
        '-loglevel', '8', '-hide_banner',
        // Redirect/Enable progress messages
        '-progress', 'pipe:3',
        // Set inputs
        '-i', 'pipe:4',
        '-i', 'pipe:5',
        // Map audio & video from streams
        '-map', '0:a',
        '-map', '1:v',
        // Keep encoding
        '-c:v', 'copy',
        // Define output file
        dirPrefix + tracker.index + '. ' + Date.now() + '.mp4',
    ], {
        windowsHide: true,
        stdio: [
            /* Standard: stdin, stdout, stderr */
            'inherit', 'inherit', 'inherit',
            /* Custom: pipe:3, pipe:4, pipe:5 */
            'pipe', 'pipe', 'pipe',
        ],
    });
    ffmpegProcess.on('close', () => {
        console.log('done');
        process.stdout.write('\n\n\n\n');
        clearInterval(progressbarHandle);
        runTaskQueued()
    });
    ffmpegProcess.stdio[3].on('data', chunk => {
        if (!progressbarHandle) progressbarHandle = setInterval(() => showProgress(), progressbarInterval);
        const lines = chunk.toString().trim().split('\n');
        const args = {};
        for (const l of lines) {
            const [key, value] = l.split('=');
            args[key.trim()] = value.trim();
        }
        tracker.merged = args;
    });
    audio.pipe(ffmpegProcess.stdio[4]);
    video.pipe(ffmpegProcess.stdio[5]);
}



// Prepare the progress bar
let progressbarHandle = null;
const progressbarInterval = 1000;
const showProgress = () => {
    readline.cursorTo(process.stdout, 0);
    const toMB = i => (i / 1024 / 1024).toFixed(2);

    process.stdout.write(`Audio  | ${(tracker.audio.downloaded / tracker.audio.total * 100).toFixed(2)}% processed `);
    process.stdout.write(`(${toMB(tracker.audio.downloaded)}MB of ${toMB(tracker.audio.total)}MB).${' '.repeat(10)}\n`);

    process.stdout.write(`Video  | ${(tracker.video.downloaded / tracker.video.total * 100).toFixed(2)}% processed `);
    process.stdout.write(`(${toMB(tracker.video.downloaded)}MB of ${toMB(tracker.video.total)}MB).${' '.repeat(10)}\n`);

    process.stdout.write(`Merged | processing frame ${tracker.merged.frame} `);
    process.stdout.write(`(at ${tracker.merged.fps} fps => ${tracker.merged.speed}).${' '.repeat(10)}\n`);

    process.stdout.write(`running for: ${((Date.now() - tracker.start) / 1000 / 60).toFixed(2)} Minutes.`);
    readline.moveCursor(process.stdout, 0, -3);
};