import * as fs from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function changeStylesLink(filePath, fileName) {
    let htmlFile = fs.readFileSync(filePath, {encoding: 'utf-8'});
    let fileContentArr = htmlFile.split('\n');

    fileContentArr.forEach(item => {
        if (item.match('./css/styles.css')) {
            let itemIndex = fileContentArr.indexOf(item);
            fileContentArr[itemIndex] = '<link rel="stylesheet" href="styles.css">';
        }
    })

    if (!fs.existsSync(`${__dirname}/dist`)) {
        fs.mkdirSync(`${__dirname}/dist`)
    }
    fs.writeFileSync(`./dist/${fileName}`, fileContentArr.join('\n'));
}