import mineflayer from 'mineflayer';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { exit } from 'process';
import { getPlayerInfo } from './utils/playerInfo';
import { FireStore } from './utils/db';
import { FirebaseOptions } from 'firebase/app';
require('dotenv').config();
const { MCUN, MCPW, API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, MEASUREMENT_ID, FB_EMAIL, FB_PASS } = process.env;

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

server.get<{ Params: { uuid: string } }>('/api/favorite/:uuid', async (requst, reply) => {
    const uuid = requst.params.uuid;
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

const startServer = async () => {
    try {
        await server.listen({ port: 2999 });
    } catch (e) {
        console.error('Error while listening to requests: \n', e);
        bot.end();
        exit(1);
    }
};
startServer();