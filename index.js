const YTPL = require('ytpl');
const FS = require('fs');
const ytdl = require('ytdl-core');
require('dotenv').config();

const START = parseInt(process.env.START ?? 0);
const END = parseInt(process.env.END ?? 0);
let DIR = process.env.DIR;
let EXACT_LENGTH = 1;


async function downloadVideo(yobj) {
    console.log(yobj.index, '----------', (yobj.index/EXACT_LENGTH)*100,'%')
    FS.access("./" + DIR + "/", FS.constants.F_OK, (err) => {
        // console.log(`${err ? 'does not exist' : 'exists'}`);
        if (err) {
            FS.mkdirSync("./" + DIR + "/");
        }
        let title = "./" + DIR + "/" + yobj.index + ". " + yobj.title + "";
        ytdl(yobj.url, {
            format: 'mp4',
            filter: 'audioandvideo'
        }).pipe(FS.createWriteStream(title + '.mp4'));
    });

}

const syncDownload = (videos) => {
    console.log("videos - ", videos.items.length);

    let i = START;
    downloadVideo(videos.items[i++]);
    let timer = setInterval(() => {
        downloadVideo(videos.items[i]);
        i++;
        if (i >= videos.items.length) {
            clearInterval(timer)
        }
    }, 20 * 1000);
}

const main = async () => {
    
    if (process.env.PLAYLIST_URL == undefined) {
        console.log("URL not found");
        return;
    }
    let url = new URL(process.env.PLAYLIST_URL);
    if (url.searchParams.get('list') != undefined) {
        const search = await YTPL(url.searchParams.get('list'), { limit: END });
        console.log("Total length - ", search.items.length, "\nStart - ", START, "\nEnd - ",END)
        EXACT_LENGTH = search.items.length;
        if (DIR == undefined) {
            search.name = search.title.replace(" ", "_");
            DIR = search.name;
        } else {
            search.name = DIR
        }
        FS.writeFileSync(`./${search.name}.json`, JSON.stringify(search));
        syncDownload(search);
    }
};
main();
