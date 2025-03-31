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

const appData = {
    emailRegex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phoneRegex: /(?:\+|\b)(?:\d\s?\(?|\d{2}\s?\(?)?(?:[\d\-\(\)\s]{6,14}\d)/g,
    postalCodeRegex: /(?:\b\d{5}(?:-\d{4})?\b|\b[A-Z]\d[A-Z] \d[A-Z]\d\b|\b\d{5}\b|\b\d{6}\b)/g,
    whitespaceRegex: /\s+/g,
}

const websiteData = {
    countryLocale: pack.archiveName.split('-').shift(),
    oldName: pack.websiteName,
    newName: faker.company.buzzNoun(),

    get newEmail() {
        const provider = `${this.newName.replace(appData.whitespaceRegex, '')}.${this.countryLocale.toLowerCase()}`;
        return faker.internet.email({provider: provider})
    } 
}

export const changeCompanyName = changeFile(companyNameHandler);
export const changeEmail = changeFile(emailHandler);
export const changePhone = changeFile(phoneHandler);

function generatePhoneNumber(countryLocale) {
    const locale = countryLocale;
    let newPhoneNum = '+0 (000) 000-00-00';

    if (isSupportedCountry(locale)) {
        const countryCode = getCountryCallingCode(locale);
        let generatedPhoneNum = `+${countryCode} ${faker.phone.number({style: 'national'})}`;

        newPhoneNum = generatedPhoneNum;

        if (locale !== 'CA') {
            do {
                generatedPhoneNum = `+${countryCode} ${faker.phone.number({style: 'national'})}`
            } while (!isValidPhoneNumber(newPhoneNum, locale));
        }
    } else {
        console.error("для данной страны не может быть сгенерирован номер телефона")
    }

    return newPhoneNum
}

//статические переменные для хэндлеров
const staticNewEmail = websiteData.newEmail;
const staticNewPhoneNum = generatePhoneNumber(websiteData.countryLocale);

function phoneHandler(contentArr) {
    const newPhone = staticNewPhoneNum;
    const oldPhone = appData.phoneRegex;

    return changeArray(contentArr, oldPhone, newPhone)
}

function companyNameHandler(contentArr) {
    const newCompanyName = websiteData.newName;
    const companyNameCapitalized = newCompanyName.split('').fill(newCompanyName[0].toUpperCase(), 0, 1).join('');

    return changeArray(contentArr, pack.websiteName, companyNameCapitalized)
}

function emailHandler(contentArr) {
    const generatedEmail = staticNewEmail;
    const emailRegex = appData.emailRegex;

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
        // str = str.replace(appData.whitespaceRegex, '');
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