import * as fs from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { src } from "./gulpfile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function changePaths(filePath, fileName) {
    const htmlFile = fs.readFileSync(filePath);
    const $ = cheerio.loadBuffer(htmlFile);

    $(`link[href="./${src.stylesCompiled}"]`).attr('href', src.cssFileName);

    $('img').each((i, el) => {
        let currentSrc = $(el).attr('src');

        if (currentSrc.match(src.images)) {
            let imageName = currentSrc.split('/').pop();
            $(el).attr('src', `images/${imageName}`);
        }
    })

    if (!fs.existsSync(`${__dirname}/dist`)) {
        fs.mkdirSync(`${__dirname}/dist`)
    }
    fs.writeFileSync(`./dist/${fileName}`, $.html());
}