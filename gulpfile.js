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

import path from "node:path";
import { changeCompanyName, changePaths, changePhone } from "./helpers.js";

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
            .pipe(gulp.src(`./dist/${src.cssFileName}`))
            .pipe(gulpPurgeCSS({
                content: ['./dist/*.html']
            }))
            .pipe(gulp.dest('./dist'))
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
            // здесь будет уникализация цсс классов в хтмл и жс атрибутов/id
            .pipe(gulp.dest('./dist'))
    } else {
        return gulp.src('./src/*.html')
            .pipe(changePaths())
            .pipe(changeCompanyName())
            .pipe(gulp.dest('./dist'))
            .pipe(browserSync.stream())
    }
}

function test() {
    return gulp.src('./src/*.html')
        .pipe(changePhone())
        // .pipe(changeCompanyName())
        .pipe(gulp.dest('./dist'))
}

gulp.task('test', test);

function scripts() {
    if (process.argv.includes('build')) {
        return gulp.src(gulpSrc.scripts)
            // здесь будет уникализация классов и жс атрибутов/id
            .pipe(gulp.dest('./dist/js'))
    } else {
        return gulp.src(gulpSrc.scripts, {sourcemaps: true})
            .pipe(gulp.dest('./dist/js'))
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
    gulp.watch(gulpSrc.styles, styles).on('change', browserSync.reload);
    gulp.watch("./src/*.html", html).on('change', browserSync.reload);
    gulp.watch(gulpSrc.scripts, scripts).on('change', browserSync.reload);
    gulp.watch(gulpSrc.images, images).on('change', browserSync.reload);
}

const compileDist = gulp.parallel(styles, scripts, images, html);

gulp.task('dev', gulp.series(clean, compileDist, gulp.parallel(browsersync, observer)));
gulp.task('build', gulp.series(clean, compileDist, archivate));