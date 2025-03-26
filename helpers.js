import * as cheerio from "cheerio";
import { src } from "./gulpfile.js";
import randomWord from "random-word";
import pack from "./package.json" assert {type: "json"};
import through2 from "through2";
import {findPhoneNumbersInText, isSupportedCountry, getCountryCallingCode, isValidPhoneNumber} from "libphonenumber-js";
import { Faker, faker } from "@faker-js/faker";

export function changePaths() {
    return through2.obj((file, _, cb) => {
        if (file.isBuffer) {
            const $ = cheerio.loadBuffer(file.contents);

            $(`link[href="./${src.stylesCompiled}"]`).attr('href', src.cssFileName);
            $(`script[src="./${src.scripts}"]`).attr('src', 'scripts/script.js')

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
            })

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
        const randomPhoneNumber = faker.phone.number({style: 'national'});
        const generatedPhoneNum = `+${countryCode} ${randomPhoneNumber}`;

        newPhoneNum = generatedPhoneNum;
    } else {
        newPhoneNum = '+78005553535';
    }
    console.log(newPhoneNum);

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