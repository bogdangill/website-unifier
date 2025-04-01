import * as cheerio from "cheerio";
import { src } from "./gulpfile.js";
import pack from "./package.json" assert {type: "json"};
import through2 from "through2";
import { isSupportedCountry, getCountryCallingCode, isValidPhoneNumber} from "libphonenumber-js";
import { faker } from "@faker-js/faker";

import * as fs from "node:fs";
import path from "node:path";

export function changePaths() {
    const oldGamesArr = staticOldGamesArr;
    const newGamesArr = staticNewGamesArr;
    
    return through2.obj((file, _, cb) => {
        if (file.isBuffer) {
            const $ = cheerio.loadBuffer(file.contents);
            
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
            // change games href
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

const appData = {
    emailRegex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phoneRegex: /(?:\+|\b)(?:\d\s?\(?|\d{2}\s?\(?)?(?:[\d\-\(\)\s]{6,14}\d)/g,
    postalCodeRegex: /(?:\b\d{5}(?:-\d{4})?\b|\b[A-Z]\d[A-Z] \d[A-Z]\d\b|\b\d{5}\b|\b\d{6}\b)/g,
    whitespaceRegex: /\s+/g,

    get srcFolders() {
        return fs.readdirSync('src/').filter(file => !path.extname(file))
    },
    get gamesCollection() {
        return fs.readdirSync('games/').filter(file => !path.extname(file))
    },
    get uniqueGamesCollection() {
        const usedGames = websiteData.usedGamesCollection;
        const unusedGames = this.gamesCollection;
        const restGames = faker.helpers.uniqueArray(usedGames, 2);

        for (let i of usedGames) {
            for (let j of unusedGames) {
                if (j == i) {
                    unusedGames.splice(unusedGames.indexOf(i), 1);
                }
            }
        }

        return [...unusedGames, ...restGames]
    },
    get randomGamesCollection() {
        return faker.helpers.uniqueArray(this.gamesCollection, 6)
    },
}

const websiteData = {
    countryLocale: pack.archiveName.split('-').shift(),
    oldName: pack.websiteName,
    newName: faker.company.buzzNoun(),

    get newEmail() {
        const validEmailLocale = this.countryLocale === 'GB' ? 'UK' : this.countryLocale;
        const provider = `${this.newName.replace(appData.whitespaceRegex, '')}.${validEmailLocale.toLowerCase()}`;
        return faker.internet.email({provider: provider})
    },
    get usedGamesCollection() {
        const usedGames = appData.gamesCollection.filter(game => appData.srcFolders.filter(folder => folder == game).toString());
        return usedGames
    },
    get selectedGamesCollection() {
        return appData.randomGamesCollection
    }
}

export function changeCompanyName() {
    return changeFile(companyNameHandler);
}
export function changeEmail() {
    return changeFile(emailHandler);
}
export function changePhone() {
    return changeFile(phoneHandler);
}
export function changeGameTitles() {
    return changeFile(gameTitleHandler)
}

//статические переменные для хэндлеров
const staticNewEmail = websiteData.newEmail;
const staticNewPhoneNum = generatePhoneNumber(websiteData.countryLocale);
const staticOldGamesArr = websiteData.usedGamesCollection;
export const staticNewGamesArr = websiteData.selectedGamesCollection;

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

function changeGameTitle(arr, arr2, arr3) {
    return arr.map(item => {
        if (item.includes('src') || item.includes('href')) {
            return item
        }

        const replacementIndex = arr2.findIndex(item2 => {
            const nameRegex = generateNameRegex(item2);
            return nameRegex.test(item)
        });

        if (replacementIndex !== -1) {
            const nameRegex = generateNameRegex(arr2[replacementIndex]);
            return item.replace(nameRegex, arr3[replacementIndex])
        }

        return item
    });
}

function gameTitleHandler(contentArr) {
    const oldGames = staticOldGamesArr;
    const newGames = staticNewGamesArr;

    return changeGameTitle(contentArr, oldGames, newGames)
}

function phoneHandler(contentArr) {
    const newPhone = staticNewPhoneNum;
    const oldPhone = appData.phoneRegex;

    return changeArray(contentArr, oldPhone, newPhone)
}

function companyNameHandler(contentArr) {
    const oldName = pack.websiteName;
    const nameRegex = generateNameRegex(oldName);
    const newCompanyName = websiteData.newName;
    const companyNameCapitalized = newCompanyName.split('').fill(newCompanyName[0].toUpperCase(), 0, 1).join('');

    return changeArray(contentArr, nameRegex, companyNameCapitalized)
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

function generateNameRegex(name) {
    const nameArr = name.trim().split(/[-\s]+/);
    const nameRegexBody = nameArr.map((segment) => segment+`\\b[\\s\\S]*?`).join('');

    return new RegExp(nameRegexBody, 'gi')
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