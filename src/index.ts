import mineflayer from 'mineflayer';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { exit } from 'process';
import { getPlayerInfo } from './utils/playerInfo';
import { FireStore } from './utils/db';
import { FirebaseOptions } from 'firebase/app';
import axios from 'axios';
require('dotenv').config();
const { MCUN, MCPW, API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, MEASUREMENT_ID, FB_EMAIL, FB_PASS, PJS_TOKEN } = process.env;

let isConnected = false;
const mcidRegex = /^[a-z|A-Z|0-9|_]{2,16}$/g;

// check env is not undefined
if (MCUN === undefined || MCPW === undefined || FB_EMAIL === undefined || FB_PASS === undefined) {
    console.log('MC Username or Password cannot be read!');
    exit(1);
}

// some initializations
const fireStoreConfig: FirebaseOptions = {
    apiKey: API_KEY,
    authDomain: AUTH_DOMAIN,
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    messagingSenderId: MESSAGING_SENDER_ID,
    appId: APP_ID,
    measurementId: MEASUREMENT_ID
}

const fireStore = new FireStore(fireStoreConfig, FB_EMAIL, FB_PASS);

const server = fastify({
    logger: true
});
(async () => {
    await server.register(cors);
})();

const bot = mineflayer.createBot({
    host: 'play.shotbow.net',
    username: MCUN,
    password: MCPW,
    auth: 'microsoft',
    version: '1.12.2',
    viewDistance: 'tiny'
});

// mineflayer events
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
    } else {
        console.log('Connected to Anni Lobby.');
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
        if (typeof playerInfo === 'undefined') {
            return;
        }
        await fireStore.set(playerInfo);
    }
});

// fastify methods
server.get('/api/playerdata', async (request, reply) => {
    const playerInfo = await fireStore.get();
    if (typeof playerInfo === 'undefined') {
        reply.code(400);
        return { data: 'Error' };
    }
    reply.type('application/json').code(200);
    return { data: playerInfo };
});

server.get<{ Params: { uuid: string } }>('/api/favorite/:uuid', async (request, reply) => {
    const uuid = request.params.uuid;
    const result = await fireStore.toggleFavorite(uuid);
    if (!result) {
        reply.code(400);
        return { data: 'Error' };
    }
    reply.code(200);
    return { data: 'Success' };
});

server.get('/api/players', async (request, reply) => {
    const num = await fireStore.getPlayerAmount();
    reply.code(200);
    return { data: num };
});

server.get<{ Params: { mcid: string } }>('/api/playerstats/:mcid', async (request, reply) => {
    const mcid = request.params.mcid;
    const reqdata = { url: `https://shotbow.net/forum/stats/annihilation/${mcid}`, renderType: 'plainText', outputAsJson: true };
    const res = await axios.get(`https://PhantomJsCloud.com/api/browser/v2/${PJS_TOKEN}/?request=${JSON.stringify(reqdata)}`);
    const elems = res.data.content.data.split('\n');
    
    // PlayTime
    const playTimeList = elems[10].replace('Time Played: ', '').match(/[0-9]+/g);
    let playHour: number = 0, playMin: number = 0;
    if (playTimeList !== null && playTimeList.length === 4) {
        playHour = parseInt(playTimeList[0]) * 24 + parseInt(playTimeList[1]);
        playMin = parseInt(playTimeList[2]);
    } else if (playTimeList !== null && playTimeList.length === 3) {
        playHour = parseInt(playTimeList[0]);
        playMin = parseInt(playTimeList[1]);
    }

    // W/L
    const winlose = elems[11].replace('Wins', '').replace(' Loses');

    // BowKills
    const bowKillsList = elems[13].match(/[0-9]+/g);
    let bowKills = '';
    if (bowKillsList !== null) {
        bowKills = bowKillsList[0];
    }

    // MeleeKills
    const meleeKillsList = elems[14].match(/[0-9]+/g);
    let meleeKills = '';
    if (meleeKillsList !== null) {
        meleeKills = meleeKillsList[0];
    }

    // NexusDamage
    const nexusDamageList = elems[15].match(/[0-9]+/g);
    let nexusDamage = '';
    if (nexusDamageList !== null) {
        nexusDamage = nexusDamageList[0];
    }

    // OresMined
    const oresMinedList = elems[16].match(/[0-9]+/g);
    let oresMined = '';
    if (oresMinedList !== null) {
        oresMined = oresMinedList[0];
    }

    const rep: AnniStats = {
        mcid: mcid,
        playTime: {
            playHour: playHour.toString(),
            playMin: playMin.toString()
        },
        winLose: winlose,
        bowKills: bowKills,
        meleeKills: meleeKills,
        nexusDamage: nexusDamage,
        oresMined: oresMined
    };

    reply.code(200);
    return { data: rep };
});

const startServer = async () => {
    try {
        console.log('Starting Server...');
        await server.listen({ port: 2999 });
    } catch (e) {
        console.error('Error while listening to requests: \n', e);
        bot.end();
        exit(1);
    }
};
startServer();