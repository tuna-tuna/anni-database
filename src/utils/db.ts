import { FirebaseApp, FirebaseOptions, initializeApp } from 'firebase/app';
import { doc, Firestore, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

export class FireStore{
    private fireStoreConfig: FirebaseOptions;
    private app: FirebaseApp;
    private db: Firestore;
    private auth;
    private isLoggedIn: boolean;
    constructor(config: FirebaseOptions, email: string, password: string) {
        this.isLoggedIn = false;
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
        } catch (e) {
            console.error('Error while setting playerInfo record: \n', e, '\nplayerInfo: \n', playerInfo);
        }
    }
}