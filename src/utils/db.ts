import { FirebaseApp, FirebaseOptions, initializeApp } from 'firebase/app';
import { doc, Firestore, getDoc, getFirestore, setDoc } from 'firebase/firestore';

export class FireStore{
    private fireStoreConfig: FirebaseOptions;
    private app: FirebaseApp;
    private db: Firestore;
    constructor(config: FirebaseOptions) {
        this.fireStoreConfig = config;
        this.app = initializeApp(this.fireStoreConfig);
        this.db = getFirestore(this.app);
    };

    async set(playerInfo: PlayerInfo): Promise<void> {
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
                    index++;
                }
            });
        }

        // if record does not exist, simply add them; if already exist, update with newly created record
        if (alreadyExist) {
            await setDoc(docRef, newData);
        } else {
            await setDoc(docRef, playerInfo);
        }
    }
}