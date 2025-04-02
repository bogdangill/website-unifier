import * as fs from "node:fs";

export async function getSrcFolders() {
    const dirents = await fs.promises.readdir('src', {withFileTypes: true});
    return dirents.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
}
export async function getGamesCollection() {
    const dirents = await fs.promises.readdir('games', {withFileTypes: true});
    return dirents.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
}