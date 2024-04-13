const ytdl = require('ytdl-core');
const cp = require('child_process');
const readline = require('readline');
const FS = require('fs');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const { escape } = require('querystring');

let progressbarHandle = null;
const progressbarInterval = 2000;

const showProgressForHQ = (tracker) => {
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
const showProgress = (chunkLength, downloaded, total, starttime) => {
    const percent = downloaded / total;
    const downloadedMinutes = (Date.now() - starttime) / 1000 / 60;
    const estimatedDownloadTime = (downloadedMinutes / percent) - downloadedMinutes;
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`${(percent * 100).toFixed(2)}% downloaded `);
    process.stdout.write(`(${(downloaded / 1024 / 1024).toFixed(2)}MB of ${(total / 1024 / 1024).toFixed(2)}MB)\n`);
    process.stdout.write(`running for: ${downloadedMinutes.toFixed(2)}minutes`);
    process.stdout.write(`, estimated time left: ${estimatedDownloadTime.toFixed(2)}minutes `);
    readline.moveCursor(process.stdout, 0, -1);
}

function downloadHQVideo(obj) {
    return new Promise((resolve, reject) => {
        const title = obj.index + ". " + (obj.title ?? 'hq_v') + ".mkv";
        const directory = (obj.destination ?? "./") + "HQ_Videos/";
        const _p = path.resolve(directory, escape(title));

        obj.audio = { downloaded: 0, total: Infinity }
        obj.video = { downloaded: 0, total: Infinity }
        obj.merged = { frame: 0, speed: '0x', fps: 0 }

        try {
            FS.accessSync(directory, FS.constants.F_OK);
        } catch (error) {
            FS.mkdirSync(directory);
        }

        const audio = ytdl(obj.url, { quality: 'highestaudio' })
            .on('progress', (_, downloaded, total) => {
                obj.audio = { downloaded, total };
            });
        const video = ytdl(obj.url, { quality: 'highestvideo' })
            .on('progress', (_, downloaded, total) => {
                obj.video = { downloaded, total };
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
            _p,
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
            process.stdout.write('\n\n\n\n');
            clearInterval(progressbarHandle);
            resolve();
        });
        ffmpegProcess.stdio[3].on('data', chunk => {
            if (!progressbarHandle) progressbarHandle = setInterval(() => showProgressForHQ(obj), progressbarInterval);
            const lines = chunk.toString().trim().split('\n');
            const args = {};
            for (const l of lines) {
                const [key, value] = l.split('=');
                args[key.trim()] = value.trim();
            }
            obj.merged = args;
        });
        audio.pipe(ffmpegProcess.stdio[4]);
        video.pipe(ffmpegProcess.stdio[5]);
    })
}

function downloadHQAudio(obj) {
    return new Promise((resolve, reject) => {
        const title = obj.index + ". " + (obj.title ?? 'hq_a') + ".mp3";
        const directory = (obj.destination ?? "./") + "HQ_Audios/";
        const _p = path.resolve(directory, escape(title));

        try {
            FS.accessSync(directory, FS.constants.F_OK);
        } catch (error) {
            FS.mkdirSync(directory);
        }

        const audio = ytdl(obj.url, { quality: 'highestaudio' })

        const ffmpegProcess = cp.spawn(ffmpeg, [
            // Remove ffmpeg's console spamming
            '-loglevel', '8', '-hide_banner',
            // Redirect/Enable progress messages
            // '-progress', 'pipe:3',
            // Set inputs
            '-i', 'pipe:4',
            // audio bitrate
            '-b:a', '320k',
            // Keep encoding
            '-c:v', 'copy',
            // Define output file
            _p,
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
            console.log(`${obj.url} ✅ - ${(Date.now() - obj.start) / 1000}s`);
            resolve();
        });
        audio.pipe(ffmpegProcess.stdio[4]);
    })

}
function downloadNormalVideo(obj) {
    return new Promise((resolve, reject) => {
        const title = obj.index + ". " + (obj.title ?? 'n_v') + ".mp4";
        const directory = (obj.destination ?? './') + 'Normal_Videos/';
        const _p = path.resolve(directory, escape(title));

        try {
            FS.accessSync(directory, FS.constants.F_OK);
        } catch (error) {
            FS.mkdirSync(directory);
        }

        const video = ytdl(obj.url, {
            format: 'mp4',
            filter: 'audioandvideo'
        })

        video.on('progress', (chunkLength, downloaded, total) => showProgress(chunkLength, downloaded, total, obj.start));
        video.pipe(FS.createWriteStream(_p));
        video.on('end', () => {
            process.stdout.write('\n\n\n');
            resolve()
        });
    })
}

module.exports = {
    downloadNormalVideo, downloadHQVideo, downloadHQAudio
}