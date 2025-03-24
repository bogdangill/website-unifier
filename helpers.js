import * as cheerio from "cheerio";
import { src } from "./gulpfile.js";
import randomWord from "random-word";
import pack from "./package.json" assert {type: "json"};
import through2 from "through2";

export function changePaths() {
    return through2.obj((file, _, cb) => {
        if (file.isBuffer) {
            const $ = cheerio.loadBuffer(file.contents);

            $(`link[href="./${src.stylesCompiled}"]`).attr('href', src.cssFileName);

            $('img').each((i, el) => {
                let currentSrc = $(el).attr('src');

                if (currentSrc.match(src.images)) {
                    let imageName = currentSrc.split('/').pop();
                    $(el).attr('src', `images/${imageName}`);
                }
            })

            file.contents = Buffer.from($.html());
        }

        cb(null, file)
    })
}

export function changeCompanyName() {
    const newCompanyName = randomWord().toUpperCase();

    return through2.obj((file, _, cb) => {
        if (file.isBuffer()) {
            const content = file.contents.toString('utf8');
            const contentArr = content.split('\n');
            const newContentArr = [];
            
            contentArr.forEach(item => {
                if (item.match(pack.websiteName)) {
                    item = item.replace(pack.websiteName, newCompanyName);
                }
                newContentArr.push(item);
            });

            file.contents = Buffer.from(newContentArr.join('\n'));
        }  

        cb(null, file)
    })
}