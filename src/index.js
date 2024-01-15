import{initializeApp} from 'firebase/app';
import{
    getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp, getDoc, getDocs, updateDoc
} from 'firebase/firestore';
import {
    getAuth, createUserWithEmailAndPassword, updateProfile, signOut, signInWithEmailAndPassword, onAuthStateChanged
} from 'firebase/auth';
import{
    ref, uploadBytesResumable, getDownloadURL, getStorage
} from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyCw2w7tyQ4xGjm8Cm9J4gg2nZw6jNuJhFU",
    authDomain: "bets-e52dd.firebaseapp.com",
    projectId: "bets-e52dd",
    storageBucket: "bets-e52dd.appspot.com",
    messagingSenderId: "851797753380",
    appId: "1:851797753380:web:56130509b32d39dde162b1",
    measurementId: "G-Y2J3YC0NXM"
  };

//initialize app
const app = initializeApp(firebaseConfig)

//initialize service
const db = getFirestore()
const auth = getAuth()
const storage = getStorage(app);

//collection ref
const colRef = collection(db, 'scores')
const recentRef = collection(db, 'recents')

document.addEventListener('DOMContentLoaded', function() {
//signing users up
const signupForm = document.querySelector('.signup')
if(signupForm){
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
    
        const email = signupForm.email.value;
        const password = signupForm.password.value;
    
        createUserWithEmailAndPassword(auth, email, password)
            .then((cred) => {
                const displayName = email.split('@')[0];
    
                return updateProfile(cred.user, { displayName: displayName })
                    .then(() => {
                        console.log("Display name updated successfully");
                        const scoreData = {
                            name: displayName,
                            value: 0,
                        };
                        
                        return addDoc(collection(db, 'scores'), scoreData);
                    });
            })
            .then(() => {
                signupForm.reset();
                window.location.href = './leaderboard.html';
            })
            .catch((err) => {
                alert(err.message);
            });
    });
    
}

//logging in and out
const logoutButton = document.querySelector('.logoutBtn')
if(logoutButton){
    logoutButton.addEventListener('click', () => {
        signOut(auth)
        .then(() => {
            console.log('the user signed out')
            window.location.href = 'login.html';
        })
        .catch((err) => {
            console.log(err.message)
        })
    })
}

const loginForm = document.querySelector('.login')
if(loginForm){
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault()
        
        const email = loginForm.email.value
        const password = loginForm.password.value

        signInWithEmailAndPassword(auth, email, password)
            .then((cred) => {
                window.location.href = 'leaderboard.html';
                console.log('user logged in', cred.user)
            })
            .catch((err) => {
                alert(err.message)
            })
    })
}
// Function to display scores in order
let leaderboardObject = {};
let sortedLeaderboard = [];getDocs(colRef)
.then((snapshot) => {
    let scores = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

    scores.forEach((score) => {
        if (!(score.name in leaderboardObject) || score.value > leaderboardObject[score.name]) {
            leaderboardObject[score.name] = score.value;
        }
    });

    // convert object to array to sort
    sortedLeaderboard = Object.entries(leaderboardObject).sort((a, b) => b[1] - a[1]);

    // Output the sorted leaderboard
    displayLeaderboard(sortedLeaderboard);
})
.catch((err) => {
    console.log(err.message);
});

function displayLeaderboard(sortedLeaderboard) {
    if(leaderboardContainer){
        let leaderboardContainer = document.getElementById('leaderboardContainer');
        leaderboardContainer.innerHTML = '';
        
        sortedLeaderboard.forEach((entry, index) => {
            let positionClass = 'other';
            if (index === 0) positionClass = 'gold';
            else if (index === 1) positionClass = 'silver';
            else if (index === 2) positionClass = 'bronze';
        
            let leaderboardItem = document.createElement('div');
            leaderboardItem.className = `leaderboard-item ${positionClass}`;
            leaderboardItem.textContent = `${entry[0]} - ${entry[1]}`;
        
            leaderboardContainer.appendChild(leaderboardItem);
        });
    }
}

const newLogs = document.querySelector('.newLog');

if (newLogs) {
    newLogs.addEventListener('submit', (e) => {
        e.preventDefault();
        let nameValue = "";
        
        //get current user display name
        onAuthStateChanged(auth, (user) => {
            if (user) {
                nameValue = user.displayName;

                // nameValue works
                const gainLossValue = newLogs.querySelector('#gainLoss').value;
                const moneyValue = newLogs.querySelector('#money').value;
                const descriptionValue = newLogs.querySelector('#description').value;

                addDoc(recentRef, {
                    date: new Date(),
                    name: nameValue,
                    gainloss: gainLossValue,
                    value: moneyValue,
                    description: descriptionValue,
                })
                .then(() => {
                    newLogs.reset();
                    console.log('Name Value:', nameValue);
                    console.log('Gain Loss Value:', gainLossValue);
                    console.log('Money Value:', moneyValue);

                    //Update leaderboard on new log input
                    const q = query(colRef, where('name', '==', nameValue));

                    getDocs(q)
                        .then((querySnapshot) => {
                            querySnapshot.forEach((doc1) => {
                            const data = doc1.data()
                            console.log(doc1.id)
                            const docRef = doc(db, 'scores', doc1.id);
                            if(gainLossValue=="gain"){
                                let temp = data.value + moneyValue;
                                console.log(temp);
                                updateDoc(docRef, {
                                    value: parseInt(temp, 10)
                            })
                        }
                            else{
                                let temp = data.value - moneyValue
                                updateDoc(docRef, {
                                    value: parseInt(temp, 10)
                            })
                            }
                        });
                        window.location.href = 'recents.html';
                    })
                    .catch((error) => {
                        console.error('Error getting documents: ', error);
                    });
                })
                .catch((error) => {
                    console.error('Error adding document: ', error);
                });
            } else {
                console.log('No user signed in.');
            }
        });
    });
}
// recents
let recentArray = [];

// format data and time
function formatDateTime(timestamp) {
    const date = new Date(timestamp * 1000); 
    const formattedDate = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `(${formattedDate} ${formattedTime})`;
}

//update recent content
function updateRecentContent() {
    recentContent.innerHTML = ''; // clear old content

    recentArray.forEach((recent) => {
        const block = document.createElement('div');
        block.classList.add('recent-block');
        
        const dateElement = document.createElement('p');
        dateElement.textContent = `Date: ${formatDateTime(recent.date.seconds)}`;

        const nameElement = document.createElement('p');
        nameElement.textContent = `Name: ${recent.name}`;

        const valueElement = document.createElement('p');
        valueElement.textContent = `Value: ${recent.gainloss == "gain" ? '+' : '-'}${Math.abs(recent.value)}`;

        const descriptionElement = document.createElement('p');
        descriptionElement.textContent = `Description: ${recent.description}`;

        block.appendChild(dateElement);
        block.appendChild(nameElement);
        block.appendChild(valueElement);
        block.appendChild(descriptionElement);

        recentContent.appendChild(block);
    });
}

// calll function after fetching data
onSnapshot(recentRef, (snapshot) => {
    recentArray = snapshot.docs.map(recent => ({ ...recent.data(), id: recent.id }));
    // sort array
    recentArray.sort((a, b) => b.date.seconds - a.date.seconds);

    updateRecentContent();
    console.log(recentArray);
});

const displayNameElement = document.getElementById('displayName');

onAuthStateChanged(auth, (user) => {
    if (user) {
        const displayName = user.displayName;

        if (displayNameElement) {
            displayNameElement.textContent = `Welcome, ${displayName || 'User'}!`;
        }
    }
});



});//end of wait for html to load
