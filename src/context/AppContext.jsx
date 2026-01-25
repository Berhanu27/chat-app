import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
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
            const userData=userSnap.data();
            setUserData(userData);
            if(userData.avatar && userData.name){
                navigate("/chat");
            
            }else{ navigate("/profile");}

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
                        // Only process regular user chats, skip any groups
                        if (!item.isGroup) {
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
                        if (!item.isGroup) {
                            tempData.push({
                                ...item,
                                userData: null
                            });
                        }
                    }
                }
                setChatData(tempData.sort((a,b)=>b.updateAt-a.updateAt))
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
        chatUser, setChatUser,chatVisible,setChatVisible,
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