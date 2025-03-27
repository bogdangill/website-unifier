import * as cheerio from "cheerio";
import { Games, src } from "./gulpfile.js";
import randomWord from "random-word";
import pack from "./package.json" assert {type: "json"};
import through2 from "through2";
import {findPhoneNumbersInText, isSupportedCountry, getCountryCallingCode, isValidPhoneNumber} from "libphonenumber-js";
import { Faker, faker } from "@faker-js/faker";

export function changePaths() {
    return through2.obj((file, _, cb) => {
        if (file.isBuffer) {
            const $ = cheerio.loadBuffer(file.contents);
            
            //change main style href
            $(`link[href="./${src.stylesCompiled}"]`).attr('href', src.cssFileName);
            //change main script href
            $(`script[src="./${src.scripts}"]`).attr('src', 'scripts/script.js');
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

                const oldGamesArr = Games.gamesEnum.old;
                const newGamesArr = Games.gamesEnum.new;

                console.log(oldGamesArr, newGamesArr);

                oldGamesArr.forEach((game, i) => {
                    if (currentSrc.match(game)) {
                        let imagePathArr = currentSrc.split('/');
                        console.log(newGamesArr[i]);
                        imagePathArr.splice(0, 1, newGamesArr[i]);
                        let newPath = imagePathArr.join('/');
                        $(el).attr('src', `games/${newPath}`);
                    }
                })
            });

            file.contents = Buffer.from($.html());
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

        do {
            generatedPhoneNum = `+${countryCode} ${faker.phone.number({style: 'national'})}`
        } while (!isValidPhoneNumber(newPhoneNum, websiteLocale));

    } else {
        console.error("для данной страны не может быть сгенерирован автоматический номер телефона")
    }

    return through2.obj((file, _, cb) => {
        if (file.isBuffer()) {
            const content = file.contents.toString('utf8');
            const contentArr = content.split('\n');
            const newContentArr = [];
            const newContentArr2 = [];

            contentArr.forEach(item => {
                if (item.match(/\+\d{1,11}/)) {
                    if (findPhoneNumbersInText(item)) {
                        const filteredString = item.trim().split('').filter(i => !i.match(' ')).join('');
                        item = filteredString.replace(/([A-Z]|[.,!?;:])/g, ' $1').trim();
                    }
                }
                newContentArr.push(item);
            })
            newContentArr.forEach(item => {
                if (item.match(/\+\d{1,11}/)) {
                    if (findPhoneNumbersInText(item)) {
                        item = item.replace(/\+\d{1,12}/, newPhoneNum)
                    }
                }
                newContentArr2.push(item)
            })

            file.contents = Buffer.from(newContentArr2.join('\n'));
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
                if (item.includes(pack.websiteName)) {
                    item = item.replaceAll(pack.websiteName, newCompanyName);
                }
                newContentArr.push(item);
            });

            file.contents = Buffer.from(newContentArr.join('\n'));
        }  

        cb(null, file)
    })
}