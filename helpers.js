import * as fs from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function changePaths(filePath, fileName, stylePath, imagesSrc) {
    const htmlFile = fs.readFileSync(filePath);
    const $ = cheerio.loadBuffer(htmlFile);

    $(`link[href="./${stylePath}"]`).attr('href', 'styles.css');

    $('img').each((i, el) => {
        let currentSrc = $(el).attr('src');

        if (currentSrc.match(imagesSrc)) {
            let imageName = currentSrc.split('/').pop();
            $(el).attr('src', `images/${imageName}`);
        }
    })

    if (!fs.existsSync(`${__dirname}/dist`)) {
        fs.mkdirSync(`${__dirname}/dist`)
    }
    fs.writeFileSync(`./dist/${fileName}`, $.html());
}