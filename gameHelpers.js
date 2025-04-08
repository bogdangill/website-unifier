import * as cheerio from "cheerio";
import through2 from "through2";
import { faker } from "@faker-js/faker";

export function uniqueWebsiteInfo() {
    return through2.obj((file, _, cb) => {
        if (file.isNull()) {
            return cb(null, file)
        }
        if (file.isBuffer()) {
            const $ = cheerio.loadBuffer(file.contents);
            const GAME_CLASSES = [
                'Dreadcaptain',
                'Cursebringer',
                'Stormgunner',
                'Soulreaver',
                'Voidstalker',
                'Bloodseer',
                'Ironhowler',
                'Ashwarden',
                'Skullmancer',
                'Witchblade',
                'Gravecaller',
                'Hexrunner',
                'Blightarcher',
                'Frostbrand',
                'Shadehunter',
                'Thundergrip',
                'Darktide',
                'Warpblade',
                'Emberknight',
                'Plaguechant'
            ]

            //player info
            $('[data-player-name]').each((_, el) => {
                $(el).text(`${faker.word.adjective()}_${faker.word.noun()}_${faker.number.int({min: 1, max: 100})}`);
            });
            $('[data-player-lvl]').each((_, el) => {
                $(el).text(`Level: ${faker.number.int({min: 1, max: 80})}`)
            });
            $('[data-player-price]').each((_, el) => {
                $(el).text(`${faker.finance.amount({min: 900, max: 10000, dec: 0, symbol: '$', autoFormat: true})}`)
            });
            $('[data-player-state]').each((_, el) => {
                $(el).text(`${faker.helpers.arrayElement(GAME_CLASSES)}`)
            });

            //team names
            $('[data-team-name]').each((_, el) => {
                $(el).text(`${faker.person.fullName()}`)
            });

            //game data
            $('[data-game-players-all]').each((_, el) => {
                $(el).text(`${faker.number.int({min: 10000, max: 100000})}`)
            });
            $('[data-game-players-online]').each((_, el) => {
                $(el).text(`${faker.number.int({min: 1000, max: 10000})}`)
            });

            file.contents = Buffer.from($.html());
        }

        cb(null, file)
    })
}