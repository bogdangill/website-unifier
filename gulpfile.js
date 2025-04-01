import gulp from "gulp";
import * as sassComp from "sass";
import gulpSass from "gulp-sass";
import browserSync from "browser-sync";
import csso from "gulp-csso";
import { deleteAsync } from "del";
import GulpZip from "gulp-zip";
import pack from "./package.json" assert {type: "json"};
import gulpPurgeCSS from "gulp-purgecss";
import cached from "gulp-cached";

import { changeCompanyName, changeEmail, changeGameTitles, changePaths, changePhone, staticNewGamesArr } from "./helpers.js";

const sass = gulpSass(sassComp);

const SRC_TYPE = {
    old: pack.sourcePaths[0],
    new: pack.sourcePaths[1]
};

export const src = SRC_TYPE.old;

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
            .pipe(cached('markups'))
            .pipe(changePaths())
            .pipe(changePhone())
            .pipe(changeCompanyName())
            .pipe(changeGameTitles())
            .pipe(changeEmail())
            .pipe(gulp.dest('./dist'))
            .pipe(browserSync.stream())
    }
}

const addGames = (cb) => {
    const gamesList = staticNewGamesArr;

    gamesList.forEach(game => {
        return gulp.src(`./games/${game}/**`, {encoding: false})
            .pipe(gulp.dest(`./dist/games/${game}/`))
    })

    return cb(null)
}

gulp.task('test', () => {
    return gulp.src('./src/*.html')
        .pipe(gulp.dest('./dist'))
})

gulp.task('method', (cb) => {
    // console.log(generateNameRegex('Math-Game-For-Kids'));
    return cb(null)
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
    } else {
        return gulp.src(gulpSrc.images, {encoding: false})
            .pipe(gulp.dest('./dist/images'))
            .pipe(browserSync.stream())
    }
}

function observer() {
    gulp.watch("./src/styles/**/*.scss", styles).on('change', browserSync.reload);
    gulp.watch("./src/*.html", html).on('change', browserSync.reload);
    gulp.watch(gulpSrc.scripts, scripts).on('change', browserSync.reload);
    gulp.watch(gulpSrc.images, images).on('change', browserSync.reload);
}

const compileDist = gulp.parallel(styles, scripts, images, html);

gulp.task('dev', gulp.series(clean, addGames, compileDist, gulp.parallel(browsersync, observer)));
gulp.task('build', gulp.series(clean, addGames, compileDist));

gulp.task('cleansrc', cleanSrc);