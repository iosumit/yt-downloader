const downloader = require('./downloader');
require('dotenv').config();
const YTPL = require('ytpl');

const VIDEOS_QUEUE = []
const PLAYLIST_URL = process.env.PLAYLIST_URL;
const FROM_LIST = process.env.FROM_LIST;
const TYPE = process.env.TYPE;
const START = parseInt(process.env.START ?? 0);
let END = parseInt(process.env.END ?? 0);
let DIR = process.env.DIR;

const main = async () => {

    if (PLAYLIST_URL !== undefined && PLAYLIST_URL.includes('https://')) {
        let urlObj = new URL(PLAYLIST_URL);
        const playlistObj = await YTPL(urlObj.searchParams.get('list'), { limit: END });

        if (DIR == undefined) {
            playlistObj.name = playlistObj.title.replace(" ", "_");
            DIR = playlistObj.name;
        } else {
            playlistObj.name = DIR
        }

        END = Math.min(playlistObj.items.length, END)
        console.log("Total length - ", playlistObj.items.length, "\nStart - ", START, "\nEnd - ", END)

        for (let i = START; i < END; i++) {
            VIDEOS_QUEUE.push({
                index: i + 1,
                title: playlistObj.items[i].title,
                url: playlistObj.items[i].url,
                destination: './' + DIR + "/",
                start: Date.now()
            })
        }
    } else if (FROM_LIST !== undefined) {
        const listOfUrls = FROM_LIST.split(', ');
        END = Math.min(listOfUrls.length, END)
        for (let i = START; i < END; i++) {
            VIDEOS_QUEUE.push({
                index: i + 1,
                url: listOfUrls[i],
                start: Date.now()
            })
        }
    }
    runQueuedTasks();
};

function runQueuedTasks() {
    if (VIDEOS_QUEUE.length > 0) {
        obj = VIDEOS_QUEUE.shift()
        switch (TYPE) {
            case 'HQ':
                downloader.downloadHQVideo(obj).then(runQueuedTasks)
                break;
            case 'AUDIO':
                downloader.downloadHQAudio(obj).then(runQueuedTasks)
                break;
            default:
                downloader.downloadNormalVideo(obj).then(runQueuedTasks)
                break;
        }
    } else {
        console.log('ALL VIDEO DONE')
    }
}

main();
