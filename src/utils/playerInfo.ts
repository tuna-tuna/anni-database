import { default as axios } from 'axios';

export const getPlayerInfo =async (uuid:string) => {
    const res = await axios.get(`https://laby.net/api/user/${uuid}/get-snippet`);
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
}