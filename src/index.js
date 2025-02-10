import { detectSystemInfo, generateRandomName, getYouTubeID, ensureExecutable, handleFile, getVideoUrl, updateFile } from "../dist/utils.js";
import { Innertube, UniversalCache } from "youtubei.js";
import { execFile, exec } from "child_process";
import ai from "./ia/index.js";
import path from "path";
import fs from "fs";
import os from "os";
import fetch from "node-fetch";
import { ytmp3 as ytmp3DL, ytmp4 as ytmp4DL } from "@vreden/youtube_scraper";

updateFile();

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const tempPath = path.join(__dirname, "../temp");
const tempDirSystem = path.join(tempPath, "/system");
fs.mkdirSync(tempDirSystem, { recursive: true });
let HiudyyDLPath = "";

async function clearSystemTempDir() {
    try {
        const command = `rm -rf ${tempDirSystem}/*`;
        exec(command, (err) => {
            if (err) {
                console.error("Erro ao limpar diretório temporário:", err.message);
            }
        });
    } catch (err) {
        console.error("Erro geral:", err.message);
    }
}

function loadAndShuffleCookies() {
    const cookiesPath = path.join(__dirname, "../dist/cookies.json");
    const cookiesArray = JSON.parse(fs.readFileSync(cookiesPath, "utf8"));
    return cookiesArray.sort(() => Math.random() - 0.5);
}

async function findValidCookie() {
    const cookiesArray = loadAndShuffleCookies();
    const testedCookies = new Set();
    for (const cookie of cookiesArray) {
        if (testedCookies.has(cookie)) continue;
        const tempCookiePath = path.join(__dirname, "../dist/cookie.txt");
        fs.writeFileSync(tempCookiePath, cookie);
        const isValid = await testCookie(tempCookiePath);
        testedCookies.add(cookie);
        if (isValid) {
            return tempCookiePath;
        }
    }
    throw new Error("❌ [ERRO] Nenhum cookie válido foi encontrado.");
}

async function testCookie(cookiePath) {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const args = ["--no-cache-dir", "-F", "--cookies", cookiePath, url];
    return new Promise((resolve) => {
        execFile(HiudyyDLPath, args, (error, stdout, stderr) => {
            if (error) {
                if (HiudyyDLPath.includes("hiudyydl_py")) {
                    execFile("python", [HiudyyDLPath, ...args], (pyErr, pyStdout, pyStderr) => {
                        resolve(!(pyErr && pyStderr.includes("This content isn")));
                    });
                } else {
                    resolve(!(stderr.includes("This content isn") || error.message.includes("This content isn")));
                }
            } else {
                resolve(true);
            }
        });
    });
}

detectSystemInfo((error, architecture, platform) => {
    if (error) return console.error(`❌ [ERRO] Ao detectar o sistema: ${error.message}`);
    if (platform === "android") {
        HiudyyDLPath = path.join(__dirname, "../bin/hiudyydl_py");
        console.log("📱 [PLATAFORMA] Sistema Android detectado.");
        return;
    }
    if (!["linux", "win32"].includes(platform)) {
        return console.error("❌ [PLATAFORMA] Este módulo é compatível apenas com sistemas Linux, Android e Windows.");
    }
    console.log(`✅ [PLATAFORMA] Sistema detectado: ${platform}.`);
    HiudyyDLPath = path.join(__dirname, platform === "win32" ? "../bin/hiudyydl_win_x64.zip" : "../bin/hiudyydl");
});

async function processOutput(args, tempFile) {
    await ensureExecutable(HiudyyDLPath);
    return new Promise((resolve, reject) => {
        execFile(HiudyyDLPath, args, async (err, stdout, stderr) => {
            if (err) {
                if (HiudyyDLPath.includes("hiudyydl_py")) {
                    execFile("python", [HiudyyDLPath, ...args], async (pyErr, pyStdout, pyStderr) => {
                        pyErr ? reject(`Erro com Python: ${pyStderr || pyErr.message}`) : handleFile(tempFile, resolve, reject);
                    });
                } else {
                    reject(`Hiudyydl error: ${stderr || err.message}`);
                }
            } else {
                handleFile(tempFile, resolve, reject);
            }
        });
    });
}

async function ytmp3(input) {
    const url = getVideoUrl(input);
    try {
        const { status, download } = await ytmp3DL(url);
        if (status && download?.url) {
            const response = await fetch(download.url);
            if (!response.ok) throw new Error("Erro ao fazer o download do arquivo.");
            return await response.buffer();
        }
    } catch (error) {
        console.error("Erro na função ytmp3DL:", error);
    }
    const output = path.join(tempPath, generateRandomName("m4a"));
    return await processOutput(["-f", "worstaudio", "-o", output, url], output);
}

async function ytmp4(input) {
    const url = getVideoUrl(input);
    try {
        const { status, download } = await ytmp4DL(url);
        if (status && download?.url) {
            const response = await fetch(download.url);
            if (!response.ok) throw new Error("Erro ao fazer o download do arquivo.");
            return await response.buffer();
        }
    } catch (error) {
        console.error("Erro na função ytmp4DL:", error);
    }
    const output = path.join(tempPath, generateRandomName("mp4"));
    return await processOutput(["-f", "bestvideo+worstaudio[ext=mp4]/mp4", "-o", output, url], output);
}

export { ytmp3, ytmp4, findValidCookie, testCookie, clearSystemTempDir }
