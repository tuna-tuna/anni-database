declare type PlayerInfo = {
    mcid: string;
    uuid: string;
    history: NameHistory[];
}

declare type NameHistory = {
    mcid: string;
    changedAt: string;
}