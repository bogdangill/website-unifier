import gulp from "gulp";
import * as sassComp from "sass";
import gulpSass from "gulp-sass";
import browserSync from "browser-sync";
import csso from "gulp-csso";
import { deleteAsync } from "del";
import GulpZip from "gulp-zip";
import pack from "./package.json" assert {type: "json"};
import gulpPurgeCSS from "gulp-purgecss";

import * as fs from "node:fs";
import through2 from "through2";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sass = gulpSass(sassComp);

const SRC_TYPE = {
    old: pack.sourcePaths[0],
    new: pack.sourcePaths[1]
};
const src = SRC_TYPE.old;

function clean() {
    return deleteAsync('./build')
}
function archivate() {
    return gulp.src('./dist/**', {encoding: false})
        .pipe(GulpZip(`${pack.archiveName}.zip`))
        .pipe(gulp.dest(`./build`))
}

function styles() {
    if (process.argv.includes('build')) {
        return gulp.src(src.styles)
            // здесь будет уникализация цсс классов и жс атрибутов/id
            .pipe(sass({
                style: 'compressed'
            }).on('error', sass.logError))
            .pipe(csso())
            .pipe(gulp.dest(`./dist`))
            .pipe(gulp.src(`./dist/${src.cssFileName}.css`))
            .pipe(gulpPurgeCSS({
                content: ['./dist/*.html']
            }))
            .pipe(gulp.dest('./dist'))
    } else {
        return gulp.src(src.styles, {sourcemaps: true})
            .pipe(sass({
                style: 'expanded'
            }).on('error', sass.logError))
            .pipe(gulp.dest(`./dist`))
            .pipe(browserSync.stream())
    }
}

function changeStylesLink(filePath, fileName) {
    let htmlFile = fs.readFileSync(filePath, {encoding: 'utf-8'});
    let fileContentArr = htmlFile.split('\n');

    fileContentArr.forEach(item => {
        if (item.match('./css/styles.css')) {
            let itemIndex = fileContentArr.indexOf(item);
            fileContentArr[itemIndex] = '    <link rel="stylesheet" href="styles.css">';
        }
    })

    if (!fs.existsSync(`${__dirname}/dist`)) {
        fs.mkdirSync(`${__dirname}/dist`)
    }
    fs.writeFileSync(`./dist/${fileName}`, fileContentArr.join('\n'));
}

function html() {
    if (process.argv.includes('build')) {
        return gulp.src('./src/*.html')
            // здесь будет уникализация цсс классов в хтмл и жс атрибутов/id
            .pipe(gulp.dest('./dist'))
    } else {
        return gulp.src('./src/*.html')
            .pipe(through2.obj((file, enc, cb) => {
                changeStylesLink(file.path, path.basename(file.path));
                cb()
            }))
            .pipe(gulp.dest('./dist'))
            .pipe(browserSync.stream())
    }
}

function scripts() {
    if (process.argv.includes('build')) {
        return gulp.src(src.scripts)
            // здесь будет уникализация классов и жс атрибутов/id
            .pipe(gulp.dest('./dist/js'))
    } else {
        return gulp.src(src.scripts, {sourcemaps: true})
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
        //хз мб добавлю сжатие картинок чтоб сайты на проверке не грузились дольше секунды
        return gulp.src(src.images)
            .pipe(gulp.dest('./dist/images'))
            .pipe(browserSync.stream())
    } else {
        return gulp.src(src.images)
            .pipe(gulp.dest('./dist/images'))
    }
}

function observer() {
    gulp.watch(src.styles, styles).on('change', browserSync.reload);
    gulp.watch("./src/*.html", html).on('change', browserSync.reload);
    gulp.watch(src.scripts, scripts).on('change', browserSync.reload);
    gulp.watch(src.images, images).on('change', browserSync.reload);
}

const compileDist = gulp.parallel(styles, scripts, images, html);

gulp.task('dev', gulp.series(clean, compileDist, gulp.parallel(browsersync, observer)));
gulp.task('build', gulp.series(clean, compileDist, archivate));