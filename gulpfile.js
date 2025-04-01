import gulp from "gulp";
import test from "./tester.js";
// import { changeCompanyName } from "./helpers.js";
import { config } from "./config.js";

const SRC_TYPE = {
    old: config.sourcePaths[0],
    new: config.sourcePaths[1]
};

export const src = SRC_TYPE.old;

gulp.task('method', (cb) => {
    test()
    return cb(null)
})

// gulp.task('test', () => {
//     return gulp.src('./src/*.html')
//         .pipe(changeCompanyName())
//         .pipe(gulp.dest('./dist'))
// })