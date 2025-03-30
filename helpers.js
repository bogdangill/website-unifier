import * as cheerio from "cheerio";
import { Games, src } from "./gulpfile.js";
import pack from "./package.json" assert {type: "json"};
import through2 from "through2";
import { isSupportedCountry, getCountryCallingCode, isValidPhoneNumber} from "libphonenumber-js";
import { faker } from "@faker-js/faker";

export function changePaths() {
    return through2.obj((file, _, cb) => {
        if (file.isBuffer) {
            const $ = cheerio.loadBuffer(file.contents);

            const oldGamesArr = Games.gamesEnum.old;
            const newGamesArr = Games.gamesEnum.new;
            
            //change main style href
            $(`link[href="./${src.stylesCompiled}"]`).attr('href', src.cssFileName);
            //change main script href
            if (src.type === 'new') {
                $(`script[src="./${src.scripts}"]`).attr('src', 'scripts/script.js');
            }
            else {
                $(`script[src="./script.js"]`).attr('src', 'scripts/script.js');
            }
            //change images src href
            $('img').each((i, el) => {
                let currentSrc = $(el).attr('src');

                if (currentSrc.match(src.images)) {
                    if (src.type === 'new') {
                        let imagePath = currentSrc.split('/').splice(-3).join('/');
                        $(el).attr('src', `${imagePath}`);
                    } else {
                        let imageName = currentSrc.split('/').pop();
                        $(el).attr('src', `images/${imageName}`);
                    }
                }

                //DRY
                oldGamesArr.forEach((game, i) => {
                    if (currentSrc.match(game)) {
                        let imagePathArr = currentSrc.split('/');
                        imagePathArr.splice(0, imagePathArr.indexOf(game)+1, newGamesArr[i]);
                        let newPath = imagePathArr.join('/');
                        $(el).attr('src', `games/${newPath}`);
                    }
                })
            });
            //change games href
            $('a[href]').each((_, el) => {
                let currentHref = $(el).attr('href');
                
                //DRY
                oldGamesArr.forEach((game, i) => {
                    if (currentHref.match(game)) {
                        let gamePathArr = currentHref.split('/');
                        gamePathArr.splice(0, gamePathArr.indexOf(game)+1, newGamesArr[i]);
                        let newPath = gamePathArr.join('/');
                        $(el).attr('href', `games/${newPath}`);
                    }
                })
            })

            file.contents = Buffer.from($.html());
        }

        cb(null, file)
    })
}

export function changeGameTitle() {
    const oldGamesArr = Games.gamesEnum.old;
    const newGamesArr = Games.gamesEnum.new;

    return through2.obj((file, _, cb) => { 
        if (file.isBuffer()) {
            const content = file.contents.toString('utf8');
            const contentArr = content.split('\n');
            const newContentArr = [];

            contentArr.forEach((item) => {                
                oldGamesArr.forEach((game, j) => {
                    let gameCleanName = game.split('-').join(' ');
                    let gameRegExp = new RegExp(gameCleanName);
                    
                    if (item.match(gameRegExp) && !item.includes('src') && !item.includes('href')) {
                        item = item.replaceAll(gameCleanName, newGamesArr[j]);
                    }
                })

                newContentArr.push(item);
            });
            file.contents = Buffer.from(newContentArr.join('\n'));
        }

        cb(null, file)
    })
}

export function changePhone() {
    const websiteLocale = pack.archiveName.split('-').shift();
    let newPhoneNum;

    if (isSupportedCountry(websiteLocale)) {
        const countryCode = getCountryCallingCode(websiteLocale);
        let generatedPhoneNum = `+${countryCode} ${faker.phone.number({style: 'national'})}`;

        newPhoneNum = generatedPhoneNum;

        if (websiteLocale !== 'CA') {
            do {
                generatedPhoneNum = `+${countryCode} ${faker.phone.number({style: 'national'})}`
            } while (!isValidPhoneNumber(newPhoneNum, websiteLocale));
        }
    } else {
        console.error("для данной страны не может быть сгенерирован автоматический номер телефона")
    }

    return through2.obj((file, _, cb) => {
        if (file.isBuffer()) {
            const content = file.contents.toString('utf8');
            const contentArr = content.split('\n');
            const phoneRegex = /\+[\s]*\d{1,12}/g;
            const whitespaceRegex = /\s+/g;
            const newContentArr = [];

            contentArr.forEach(item => {
                if (item.match(phoneRegex)) {
                    item = item.replace(whitespaceRegex, '');
                    item = item.replace(phoneRegex, newPhoneNum);
                }
                newContentArr.push(item);
            })

            file.contents = Buffer.from(newContentArr.join('\n'));
        }

        cb(null, file)
    })
}

const websiteData = {
    countryLocale: pack.archiveName.split('-').shift(),
    oldName: pack.websiteName,
    newName: faker.company.buzzNoun(),
    emailRegex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

    get newEmail() {
        const provider = `${this.newName.replace(/\s+/g, '')}.${this.countryLocale.toLowerCase()}`;
        return faker.internet.email({provider: provider})
    } 
}

export const changeCompanyName = changeFile(companyNameHandler);
export const changeEmail = changeFile(emailHandler);

function companyNameHandler(contentArr) {
    const newCompanyName = websiteData.newName;
    const companyNameCapitalized = newCompanyName.split('').fill(newCompanyName[0].toUpperCase(), 0, 1).join('');

    return changeArray(contentArr, pack.websiteName, companyNameCapitalized)
}


function emailHandler(contentArr) {
    const generatedEmail = websiteData.newEmail;
    const emailRegex = websiteData.emailRegex;

    return changeArray(contentArr, emailRegex, generatedEmail)
}

function changeFile(transformerCb = (arr) => arr) {//чек на передачу именно функции
    return through2.obj((file, _, cb) => {
        if (file.isNull()) {
            return cb(null, file)
        }
        if (file.isBuffer()) {
            const content = file.contents.toString('utf8');
            const contentArr = content.split('\n');
            const newContentArr = transformerCb(contentArr);

            file.contents = Buffer.from(newContentArr.join('\n'));
        }

        cb(null, file)
    })
}

function changeString(str, oldSegment, newSegment) {
    let newStr;

    if (str.match(oldSegment)) {
        newStr = str.replaceAll(oldSegment, newSegment);
    } else {
        newStr = str;
    }

    return newStr
}

function changeArray(arr, oldSegment, newSegment) {
    const newArr = [];

    arr.forEach(str => newArr.push(changeString(str, oldSegment, newSegment)));

    return newArr
}