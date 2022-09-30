import mineflayer from 'mineflayer';
import { default as axios } from 'axios';
import { exit } from 'process';
import { getPlayerInfo } from './utils/playerInfo';
const wait = require('util').promisify(setTimeout);
require('dotenv').config();
const { MCUN, MCPW } = process.env;

let isConnected = false;
const mcidRegex = /^[a-z|A-Z|0-9|_]{2,16}$/g;

// check env is not undefined
if (MCUN === undefined || MCPW === undefined) {
    console.log('MC Username or Password cannot be read!');
    exit(1);
}

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
        console.dir(playerInfo, { depth: null });
    }
});