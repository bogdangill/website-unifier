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
                $(el).removeAttr('data-player-name');
            });
            $('[data-player-lvl]').each((_, el) => {
                $(el).text(`Level: ${faker.number.int({min: 1, max: 80})}`);
                $(el).removeAttr('data-player-lvl');
            });
            $('[data-player-price]').each((_, el) => {
                $(el).text(`${faker.finance.amount({min: 900, max: 10000, dec: 0, symbol: '$', autoFormat: true})}`);
                $(el).removeAttr('data-player-price');
            });
            $('[data-player-state]').each((_, el) => {
                $(el).text(`${faker.helpers.arrayElement(GAME_CLASSES)}`);
                $(el).removeAttr('data-player-state');
            });

            //team names
            $('[data-team-name]').each((_, el) => {
                $(el).text(`${faker.person.fullName()}`);
                $(el).removeAttr('data-team-name');
            });

            //game data
            $('[data-game-players-all]').each((_, el) => {
                $(el).text(`${faker.number.int({min: 10000, max: 100000})}`);
                $(el).removeAttr('data-game-players-all');
            });
            $('[data-game-players-online]').each((_, el) => {
                $(el).text(`${faker.number.int({min: 1000, max: 10000})}`);
                $(el).removeAttr('data-game-players-online');
            });

            //вынести в отдельную сущность (чистка следов уникализации)
            $('[chat-id]').each((_, el) => {
                $(el).removeAttr('chat-id');
            });

            file.contents = Buffer.from($.html());
        }

        cb(null, file)
    })
}