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
            //change games title (нужно вынести в отдельную сущность)
            //работает только на одном сайте DE
            // oldGamesArr.forEach((game, i) => {
            //     let words = $('*').filter((_, el) => {
            //         return $(el).text().includes(game);
            //     });
            //     words.each((_, el) => {
            //         if ($(el).text() === game) {
            //             let target = $(el).text();
            //             console.log(target, file.relative);
            //             let result = target.replaceAll(game, newGamesArr[i]);
            //             $(el).text(result);
            //         }
            //     });
            // })

            file.contents = Buffer.from($.html());
        }

        cb(null, file)
    })
}

export function changeGameTitle() {
    return through2.obj((file, _, cb) => { 
        if (file.isBuffer()) {
            const content = file.contents.toString('utf8');
            const contentArr = content.split('\n');
            const newContentArr = [];

            const oldGamesArr = Games.gamesEnum.old;
            const newGamesArr = Games.gamesEnum.new;

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
    const newCompanyName = faker.company.buzzNoun();
    const CompanyNameCapitalized = newCompanyName.split('').fill(newCompanyName[0].toUpperCase(), 0, 1).join('');

    return through2.obj((file, _, cb) => {
        if (file.isBuffer()) {
            const content = file.contents.toString('utf8');
            const contentArr = content.split('\n');
            const newContentArr = [];
            
            contentArr.forEach(item => {
                if (item.includes(pack.websiteName)) {
                    item = item.replaceAll(pack.websiteName, CompanyNameCapitalized);
                }
                newContentArr.push(item);
            });

            file.contents = Buffer.from(newContentArr.join('\n'));
        }  

        cb(null, file)
    })
}