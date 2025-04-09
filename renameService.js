
import path from "node:path";
import through2 from "through2";
import { faker } from "@faker-js/faker";
import * as fs from "node:fs";
import { writeFile, access } from "node:fs/promises";
import { promisify } from "node:util";
import { Stream } from "node:stream";
import gulp from "gulp";

const pipeline = promisify(Stream.pipeline);

function renameAndTrack(renameMap, { distDir = 'dist' } = {}) {
    return through2.obj(async function (file, _, cb) {
        try {
            const ext = path.extname(file.path);

            if (!file.isBuffer() || ext !== '.html') {
                this.push(file);
                return cb();
            }

            const oldPath = file.relative;
            let newName = 'index.html';

            if (oldPath !== 'index.html') {
                newName = faker.number.hex({min: 0, max: 65535}) + ext;
            }

            const newRelPath = path.join(path.dirname(oldPath), newName);
            const newAbsPath = path.join(distDir, newRelPath);

            try {
                await access(distDir)
            } catch {
                fs.mkdir(distDir, (err) => {
                    if (err) {
                        console.log('я не могу создать дист:', err);
                    } else {
                        console.log('создал дист');
                    }
                });
            }
            await writeFile(newAbsPath, file.contents);

            renameMap.set(
                path.posix.normalize(file.relative.replace(/\\/g, '/')),
                newRelPath
            );

            this.push(file);
            cb();
        } catch (err) {
            cb(err);
        }
    });
}

function replaceReferences(renameMap) {
    return through2.obj(function (file, _, cb) {
        if (!file.isBuffer()) {
            this.push(file);
            return cb();
        }
        try {
            let contents = file.contents.toString('utf8');

            for (const [oldRel, newRel] of renameMap.entries()) {
                contents = contents.replaceAll(oldRel, newRel);
            }

            file.contents = Buffer.from(contents);
            this.push(file);
            cb();
        } catch (err) {
            cb(err);
        }
    });
}

export const renameHTML = async () => {
    // карта вида старая ссылка => новая
    const renameMap = new Map();

    await pipeline(
        gulp.src('./src/*.html'),
        renameAndTrack(renameMap, {distDir: './dist'})
    )

    await pipeline(
        gulp.src('./dist/*.html'),
        replaceReferences(renameMap),
        gulp.dest('./dist')
    )
}