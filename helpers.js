import * as cheerio from "cheerio";
import { src } from "./gulpfile.js";
import randomWord from "random-word";
import pack from "./package.json" assert {type: "json"};
import through2 from "through2";
import {findPhoneNumbersInText, isSupportedCountry, getCountryCallingCode, isValidPhoneNumber} from "libphonenumber-js";
import { faker } from "@faker-js/faker";

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

export function changePhone() {
    const websiteLocale = pack.archiveName.split('-').shift();
    let newPhoneNum;

    if (isSupportedCountry(websiteLocale)) {
        const countryCode = getCountryCallingCode(websiteLocale);
        const randomPhoneNumber = faker.phone.number({style: 'national'});
        const generatedPhoneNum = `+${countryCode} ${randomPhoneNumber}`;

        if (isValidPhoneNumber(generatedPhoneNum)) {
            newPhoneNum = generatedPhoneNum;
        }
    } else {
        newPhoneNum = '+78005553535';
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
                        item = filteredString;
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