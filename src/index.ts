import mineflayer from 'mineflayer';
import { default as axios } from 'axios';
import { exit } from 'process';
import { getPlayerInfo } from './utils/playerInfo';
import { FireStore } from './utils/db';
import { FirebaseOptions } from 'firebase/app';
const wait = require('util').promisify(setTimeout);
require('dotenv').config();
const { MCUN, MCPW, API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, MEASUREMENT_ID } = process.env;

let isConnected = false;
const mcidRegex = /^[a-z|A-Z|0-9|_]{2,16}$/g;

// check env is not undefined
if (MCUN === undefined || MCPW === undefined) {
    console.log('MC Username or Password cannot be read!');
    exit(1);
}

const fireStoreConfig: FirebaseOptions = {
    apiKey: API_KEY,
    authDomain: AUTH_DOMAIN,
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    messagingSenderId: MESSAGING_SENDER_ID,
    appId: APP_ID,
    measurementId: MEASUREMENT_ID
}

console.log(fireStoreConfig);

const fireStore = new FireStore(fireStoreConfig);

const bot = mineflayer.createBot({
    host: 'play.shotbow.net',
    username: MCUN,
    password: MCPW,
    auth: 'microsoft',
    version: '1.12.2',
    viewDistance: 'tiny'
});

bot.on('kicked', (reason, loggedIn) => {
    if (reason === '{"text":"Too many players joining at once! Try again in a few seconds."}') {
        console.log('Server is busy now.');
    }
    else {
        console.log('Kicked from server: ', reason);
    }
    bot.end();
    exit(1);
});

bot.on('spawn', () => {
    if (isConnected === false) {
        bot.chat('/al');
        isConnected = true;
        console.log('Connecting to Anni Lobby...');
    }
});

bot.on('message', (message) => {
    const text = message.toString();
    if (text.includes('Unable to connect to ANNILOBBY_')) {
        console.log('Unable to join Anni Lobby.');
        bot.end();
        exit(1);
    }
});

bot.on('playerJoined', async (player) => {
    if (isConnected) {
        const mcid = player.username;
        const uuid = player.uuid;
        if (mcidRegex.test(mcid) === false) {
            return;
        }
        const playerInfo = await getPlayerInfo(uuid);
        await fireStore.set(playerInfo);
        console.dir(playerInfo, { depth: null });
    }
});