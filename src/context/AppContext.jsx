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


    const loadUserData= async(uid)=>{
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
                    const userRef=doc(db, "users", item.rId);
                    const userSnap=await getDoc(userRef);
                    const userData=userSnap.data();
                    tempData.push({...item, userData})
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
        chatUser, setChatUser,chatVisible,setChatVisible

    };
    
    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    );
};

export default AppContextProvider;