declare type PlayerInfo = {
    mcid: string;
    uuid: string;
    lastSeenRaw: number;
    lastSeen: string;
    lastUpdateRaw: number;  // For check loop
    lastUpdate: string;
    isFavorite: boolean;
    history: NameHistory[];
};

declare type NameHistory = {
    mcid: string;
    changedAt: string;
    hidden: boolean;
};