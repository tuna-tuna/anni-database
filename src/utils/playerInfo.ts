import { default as axios } from 'axios';

export const getPlayerInfo = async (uuid: string) => {
    try {
        const res = await axios.get(`https://laby.net/api/user/${uuid}/get-snippet`);
        if (res.status === 404) {
            console.error('The player is not registered on laby.net');
            await axios.get(`https://laby.net/@${uuid}`);
            return;
        }
        const nameHistory: NameHistory[] = [];
        res.data.name_history.map((data: any) => {
            const name = data.username;
            const changedAt = data.changed_at;
            const hidden = data.hidden
            const namedata: NameHistory = {
                mcid: name,
                changedAt: changedAt,
                hidden: hidden
            };
            nameHistory.push(namedata);
        });
        const playerInfo: PlayerInfo = {
            mcid: res.data.user.username,
            uuid: uuid,
            history: nameHistory
        }
        return playerInfo;
    } catch (e) {
        console.error('Error in getPlayerInfo: \n', e);
        await axios.get(`https://laby.net/@${uuid}`);
    }
}