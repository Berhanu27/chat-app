import { doc, getDoc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../config/Firebase";
import { onAuthStateChanged } from "firebase/auth";

export const AppContext = createContext({});

const AppContextProvider = (props) => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [chatData, setChatData] = useState(null);
    const[messagesId, setMessagesId]=useState(null)
    const[messages, setMessages]=useState([])
    const[chatUser, setChatUser]=useState(null)
    const [chatVisible, setChatVisible]=useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [appSettings, setAppSettings] = useState({
        soundNotifications: true,
        browserNotifications: true,
        showOnlineStatus: true,
        readReceipts: true,
        autoDownloadMedia: true,
        darkMode: false
    })


    const loadUserData= async(uid)=>{
        setIsLoading(true);
        try {
            const userRef=doc(db,"users",uid);
            const userSnap=await getDoc(userRef);
            
            if (!userSnap.exists()) {
                console.log("User document does not exist, creating basic document...");
                // Create a basic user document if it doesn't exist
                const user = auth.currentUser;
                await setDoc(userRef, {
                    id: uid,
                    username: user?.email?.split('@')[0] || 'user',
                    email: user?.email || '',
                    name: "",
                    avatar: "",
                    bio: "Hey there i am using chat app",
                    lastSeen: Date.now(),
                    createdAt: Date.now()
                });
                
                // Also create chats document
                const chatsRef = doc(db, "chats", uid);
                await setDoc(chatsRef, {
                    chatData: []
                });
                
                navigate("/profile");
                setIsLoading(false);
                return;
            }
            
            const userData=userSnap.data();
            
            if (!userData) {
                console.error("User data is undefined");
                navigate("/profile");
                setIsLoading(false);
                return;
            }
            
            setUserData(userData);
            
            // Check if user has completed profile setup
            if(userData.avatar && userData.name){
                navigate("/chat");
            } else { 
                navigate("/profile");
            }

            await updateDoc(userRef, {
               lastSeen:Date.now()
            });
            
            setInterval(async () => {
                if (auth.currentUser) {
                    await updateDoc(userRef, {
                        lastSeen: Date.now()
                    });
                }
            }, 60000);
        } catch (error) {
            console.error("Error loading user data:", error);
            // Navigate to profile if there's an error
            navigate("/profile");
        } finally {
            setIsLoading(false);
        }
    }
    useEffect(() => {
        const unSub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is logged in
                await loadUserData(user.uid);
            } else {
                // User is logged out - clear all state
                setUserData(null);
                setChatData(null);
                setMessages([]);
                setChatUser(null);
                setMessagesId(null);
                setIsLoading(false);
                navigate("/");
            }
        });
        return () => unSub();
    }, [navigate]);

    useEffect(()=>{
        if(userData){
            const chatRef= doc(db, 'chats', userData.id);
            const unSub=onSnapshot(chatRef,async(res)=>{
                const chatItems = res.data()?.chatData || [];
                const tempData=[];
                for(const item of chatItems){
                    try {
                        if (item.isGroup) {
                            // For groups, just add the item as-is since groupData is already included
                            tempData.push(item);
                        } else {
                            // For individual chats, fetch user data
                            const userRef=doc(db, "users", item.rId);
                            const userSnap=await getDoc(userRef);
                            const fetchedUserData=userSnap.data();
                            tempData.push({
                                ...item, 
                                userData: fetchedUserData || null
                            });
                        }
                    } catch (error) {
                        console.error("Error loading chat item:", error);
                        // Add item with null userData to prevent crashes
                        if (item.isGroup) {
                            tempData.push(item);
                        } else {
                            tempData.push({
                                ...item,
                                userData: null
                            });
                        }
                    }
                }
                setChatData(tempData.sort((a,b)=>(b.updateAt || b.updatedAt || 0)-(a.updateAt || a.updatedAt || 0)))
            })
            return()=>{
                unSub();
            }
        }
    },[userData])
    
    const value = {
        userData,
        setUserData,
        chatData,
        setChatData,
        loadUserData,
        messages,setMessages,
        messagesId,setMessagesId,
        chatUser,
        setChatUser,
        chatVisible,
        setChatVisible,
        isLoading,
        appSettings,
        setAppSettings
    };
    
    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    );
};

export default AppContextProvider;