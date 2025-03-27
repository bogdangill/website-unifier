import gulp from "gulp";
import * as sassComp from "sass";
import gulpSass from "gulp-sass";
import browserSync from "browser-sync";
import csso from "gulp-csso";
import { deleteAsync } from "del";
import GulpZip from "gulp-zip";
import pack from "./package.json" assert {type: "json"};
import gulpPurgeCSS from "gulp-purgecss";
import through2 from "through2";
import imagemin, {optipng} from "gulp-imagemin";

import * as fs from "node:fs";
import path from "node:path";

import { changeCompanyName, changePaths, changePhone } from "./helpers.js";
import { faker } from "@faker-js/faker";

const sass = gulpSass(sassComp);

const SRC_TYPE = {
    old: pack.sourcePaths[0],
    new: pack.sourcePaths[1]
};

export const src = SRC_TYPE.new;

const gulpSrc = {
    images: `./src/${src.images}/**/*.+(png|jpg|gif|ico|svg|webp)`,
    styles: `./src/${src.styles}`,
    scripts: `./src/${src.scripts}`
};

function clean() {
    return deleteAsync(['./build', './dist'])
}
function cleanSrc() {
    return deleteAsync(['./src/**'])
}
function archivate() {
    return gulp.src('./dist/**', {encoding: false})
        .pipe(GulpZip(`${pack.archiveName}.zip`))
        .pipe(gulp.dest(`./build`))
}

/**
 * 
 * @deprecated
 */
function copyGames() {
    return gulp.src('./src/games/**', {encoding: false})
        .pipe(gulp.dest(`./dist/games`))
}

function styles() {
    if (process.argv.includes('build')) {
        return gulp.src(gulpSrc.styles)
            // здесь будет уникализация цсс классов и жс атрибутов/id
            .pipe(sass({
                style: 'compressed'
            }).on('error', sass.logError))
            .pipe(csso())
            .pipe(gulp.dest(`./dist`))
            // .pipe(gulp.src(`./dist/${src.cssFileName}`))
            // .pipe(gulpPurgeCSS({
            //     content: ['./dist/*.html']
            // }))
            // .pipe(gulp.dest('./dist'))
    } else {
        return gulp.src(gulpSrc.styles, {sourcemaps: true})
            .pipe(sass({
                style: 'expanded'
            }).on('error', sass.logError))
            .pipe(gulp.dest(`./dist`))
            .pipe(browserSync.stream())
    }
}

function html() {
    if (process.argv.includes('build')) {
        return gulp.src('./src/*.html')
            .pipe(changePhone())
            .pipe(changePaths())
            .pipe(changeCompanyName())
            .pipe(gulp.dest('./dist'))
    } else {
        return gulp.src('./src/*.html')
            .pipe(changePhone())
            .pipe(changePaths())
            .pipe(changeCompanyName())
            .pipe(gulp.dest('./dist'))
            .pipe(browserSync.stream())
    }
}

class Games {
    gamesList = [];
    gamesMap = {
        "oldGames": [],
        "newGames": []
    }; 
    
    constructor() {
        this.files = fs.readdirSync('src/');
        this.folders = this.files.filter(file => !path.extname(file));
        this.allGames = fs.readdirSync('games/').filter(file => !path.extname(file));
    }

    giveUsedCollection() {
        const usedGamesCollection = this.allGames.filter(game => this.folders.filter(folder => folder == game).toString());
        return usedGamesCollection
    }

    /** @description подойдет если болванка новая */
    giveUniqueCollection() {
        const usedGames = this.giveUsedCollection();
        this.gamesMap.oldGames = usedGames;
        const unusedGames = Array.from(this.allGames);
    
        for (let i of usedGames) {
            for (let j of unusedGames) {
                if (j == i) {
                    unusedGames.splice(unusedGames.indexOf(i), 1);
                }
            }
        }
    
        const restGames = faker.helpers.uniqueArray(usedGames, 2);
        this.gamesList = [...unusedGames, ...restGames];

        this.gamesList.forEach(game => {
            return gulp.src(`./games/${game}/**`, {encoding: false})
                .pipe(gulp.dest(`./dist/games/${game}/`))
        })
    }

    /**@description подойдет если болванка одна и та же из итерации в итерацию */
    giveRandomCollection() {
        this.gamesList = faker.helpers.uniqueArray(this.allGames, 6);

        this.gamesMap.oldGames = this.giveUsedCollection();
        this.gamesMap.newGames = Array.from(this.gamesList);

        fs.writeFileSync('games-map.json', JSON.stringify(this.gamesMap, null, 4));

        this.gamesList.forEach(game => {
            return gulp.src(`./games/${game}/**`, {encoding: false})
                .pipe(gulp.dest(`./dist/games/${game}/`))
        })
    }
}

const addUniqueGames = (cb) => {
    new Games().giveUniqueCollection();
    return cb(null)
}

// gulp.task('test', (cb) => {
//     new Games().giveRandomCollection();
//     return cb(null)
// });

gulp.task('test', () => {
    return gulp.src('./src/*.html')
        .pipe(changePaths())
        .pipe(gulp.dest('./dist'))
})

function scripts() {
    if (process.argv.includes('build')) {
        return gulp.src(gulpSrc.scripts)
            // здесь будет уникализация классов и жс атрибутов/id
            .pipe(gulp.dest('./dist/scripts'))
    } else {
        return gulp.src(gulpSrc.scripts, {sourcemaps: true})
            .pipe(gulp.dest('./dist/scripts'))
            .pipe(browserSync.stream());
    }
}

function browsersync() {
    browserSync.init({
        server: {
            baseDir: `./dist`,
            notify: false,
            port: 3000,
        }
    })
}

function images() {
    if (process.argv.includes('build')) {
        return gulp.src(gulpSrc.images, {encoding: false})
            .pipe(gulp.dest('./dist/images'))
            .pipe(imagemin(
                [optipng({optimizationLevel: 5}),],
                {
                    verbose: true
                }
            ))
    } else {
        return gulp.src(gulpSrc.images, {encoding: false})
            .pipe(gulp.dest('./dist/images'))
            .pipe(browserSync.stream())
    }
}

function observer() {
    gulp.watch("./src/css/**/*.scss", styles).on('change', browserSync.reload);
    gulp.watch("./src/*.html", html).on('change', browserSync.reload);
    gulp.watch(gulpSrc.scripts, scripts).on('change', browserSync.reload);
    gulp.watch(gulpSrc.images, images).on('change', browserSync.reload);
}

const compileDist = gulp.parallel(styles, scripts, images, html, addUniqueGames);

gulp.task('dev', gulp.series(clean, compileDist, gulp.parallel(browsersync, observer)));
gulp.task('build', gulp.series(clean, compileDist));

gulp.task('cleansrc', cleanSrc);