import { FirebaseApp, FirebaseOptions, initializeApp } from 'firebase/app';
import { collection, doc, Firestore, getDoc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

export class FireStore{
    private fireStoreConfig: FirebaseOptions;
    private app: FirebaseApp;
    private db: Firestore;
    private auth;
    private isLoggedIn: boolean;
    private cachedData: PlayerInfo[] | undefined
    private lastModified: number
    constructor(config: FirebaseOptions, email: string, password: string) {
        this.isLoggedIn = false;
        this.lastModified = 0;
        this.fireStoreConfig = config;
        this.app = initializeApp(this.fireStoreConfig);
        this.db = getFirestore(this.app);
        this.auth = getAuth(this.app);
        signInWithEmailAndPassword(this.auth, email, password).then(() => this.isLoggedIn = true);
    };

    async set(playerInfo: PlayerInfo): Promise<void> {
        if (!this.isLoggedIn) {
            return;
        }
        try {
            // check if record is already exist or not
            let alreadyExist = false;
            const uuid = playerInfo.uuid;
            const docRef = doc(this.db, 'names', uuid);
            const docSnap = await getDoc(docRef);
            let newData: any;

            // if record already exist, update name history with hidden key
            if (docSnap.exists()) {
                alreadyExist = true;
                const data = docSnap.data();
                newData = data;
                let index = 0;
                data.history.map((nameHistory: NameHistory) => {
                    if (nameHistory.hidden === true) {
                        // check params hidden key and update
                        if (playerInfo.history[index].hidden === false) {
                            newData.history[index].hidden = false;
                            newData.history[index].mcid = playerInfo.history[index].mcid;
                        }
                    }
                    index++;
                });
            }

            // if record does not exist, simply add them; if already exist, update with newly created record
            if (alreadyExist) {
                await setDoc(docRef, newData);
            } else {
                await setDoc(docRef, playerInfo);
            }
        } catch (e) {
            console.error('Error while setting playerInfo record: \n', e, '\nplayerInfo: \n', playerInfo);
        }
    }

    async get(): Promise<PlayerInfo[] | undefined> {
        if (!this.isLoggedIn) {
            return;
        }
        if (Date.now() - this.lastModified < 3600000) {
            console.log('Used Cached Data');
            return this.cachedData;
        } else {       
            try {
                const data = await getDocs(collection(this.db, 'names'));
                const reqdata: PlayerInfo[] = [];
                data.forEach((doc) => {
                    const playerData = doc.data() as PlayerInfo;
                    reqdata.push(playerData);
                });
                this.lastModified = Date.now();
                this.cachedData = reqdata;
                console.log('Created Cache');
                return reqdata;
            } catch (e) {
                console.error('Error while getting playerInfo: \n', e);
            }
        }
    }

    async toggleFavorite(uuid: string): Promise<boolean>{
        if (!this.isLoggedIn) {
            return false;
        }
        try {
            const docRef = doc(this.db, 'names', uuid);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                console.error(`UUID of ${uuid} does not exist on database\n`);
                return false;
            }
            const data = docSnap.data() as PlayerInfo;
            let newData = data;
            newData.isFavorite = !data.isFavorite;
            await setDoc(docRef, newData);
            return true;
        } catch (e) {
            console.error('Error occured while toggle-int favorite\n', e);
            return false;
        }
    }
}