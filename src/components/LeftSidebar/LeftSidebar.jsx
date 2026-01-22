import './LeftSidebar.css'
import assets from '../../assets/assets'
import { useNavigate } from 'react-router-dom'
import { arrayUnion, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, serverTimestamp, where } from 'firebase/firestore';
import { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { db, logout } from '../../config/Firebase';
import { toast } from 'react-toastify';

const LeftSidebar = () => {
    const navigate = useNavigate();
    const { userData,chatData, chatUser,setChatUser, setMessagesId, setChatData, setMessages,chatVisible, setChatVisible } = useContext(AppContext);
    const [user, setUser] = useState(null)
    const [showSearch, setShowSearch] = useState(false)
    const inputRef = useRef(null);
    
    const handleLogout = async () => {
        // Clear all state before logout
        setChatData(null);
        setMessages([]);
        setChatUser(null);
        setMessagesId(null);
        await logout();
    }
    
    const inputHandler = async (e) => {
        try {
            const input = e.target.value;
            if (input) {
                setShowSearch(true)

                const userRef = collection(db, 'users');
                const q = query(userRef, where("username", "==", input.toLowerCase()))
                const querySnapshot = await getDocs(q);
                console.log("Search results:", querySnapshot.docs.map(d => d.data()));
                if (!querySnapshot.empty && querySnapshot.docs[0].data().id !== userData.id) {
                    let userExist = false
                    chatData && chatData.map((user) => {
                        if (user.rId === querySnapshot.docs[0].data().id) {
                            userExist = true;
                            toast.info('User already exists in your chat')
                        }
                    })
                    if (!userExist) {
                        setUser(querySnapshot.docs[0].data());
                    }
                   
                } else {
                    setUser(null)
                }
            }else{
                setShowSearch(false)
            }
        } catch (error) {
            console.error("Search error:", error);
        }
    }
    const addChat = async () => {
        const messagesRef = collection(db, 'messages');
        const chatsRef = collection(db, 'chats');
        try {
            const newMessageRef = doc(messagesRef);
            await setDoc(newMessageRef, {
                createAt: serverTimestamp(),
                messages: []
            })
            
            await updateDoc(doc(chatsRef, user.id), {
                chatData: arrayUnion({
                    messagesId: newMessageRef.id,
                    lastMessage: "",
                    rId: userData.id,
                    updateAt: Date.now(),
                    messageSeen: true
                })
            })
            
            await updateDoc(doc(chatsRef, userData.id), {
                chatData: arrayUnion({
                    messagesId: newMessageRef.id,
                    lastMessage: "",
                    rId: user.id,
                    updateAt: Date.now(),
                    messageSeen: true
                })
            })
            const uSnap=await getDoc(doc(db,'users',user.id))
            const uData=uSnap.data();
            setChat({
                messagesId: newMessageRef.id,
                lastMessage: "",
                rId: uData.id,
                updateAt: Date.now(),
                messageSeen: true,
                userData: uData
            })
            setShowSearch(false)
            setChatVisible(true)

            
            
            setUser(null);
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        } catch (error) {
            toast.error(error.message)
            console.error(error);
        }
    }
    const setChat = async (item) => {
        console.log("Setting chat:", item); // Debug log
        console.log("MessagesId being set:", item.messagesId); // Debug the messagesId
        
        setMessagesId(item.messagesId);
        setChatUser(item);
        
        try {
            const userChatsRef = doc(db, 'chats', userData.id);
            const userChatsSnapshot = await getDoc(userChatsRef);
            if (userChatsSnapshot.exists()) {
                const userChatData = userChatsSnapshot.data();
                console.log("User chat data:", userChatData); // Debug log
                const chatIndex = userChatData.chatData.findIndex((c) => c.messagesId === item.messagesId);
                if (chatIndex !== -1) {
                    userChatData.chatData[chatIndex].messageSeen = true;
                    await updateDoc(userChatsRef, { chatData: userChatData.chatData });
                }
            }
            setChatVisible(true);
        } catch (error) {
            console.error("Error updating message seen:", error);
        }
    }
    useEffect(()=>{
        const updatechatUserData=async()=>{
            if(chatUser){
                const userRef=doc(db,'users',chatUser.id )
                const usersnap=await getDoc(userRef);
                const userData=usersnap.data();
                setChatUser(prev=>({...prev, userData: userData}    ))
            }

        }
        updatechatUserData();
    },[chatData])
  return (
        <div className="ls">
            <div className="ls-top">
                <div className="ls-nav">
                    <img src={assets.logo} alt="" className='logo' />
                    <div className="menu">
                        <img src={assets.menu_icon} alt="" />
                        <div className="sub-menu">
                            <p onClick={() => navigate('/profile')}>Edit profile</p>
                            <hr />
                            <p onClick={handleLogout}>Logout</p>
                        </div>
                    </div>
                </div>
                <div className="ls-search">
                    <img src={assets.search_icon} alt="Search" style={{display: 'block', minWidth: '18px'}} />
                    <input ref={inputRef} onChange={inputHandler} type="text" placeholder='Search here..' />
                </div>
                <div className="ls-list">
                    {showSearch && user ? (
                        <div onClick={addChat} className="friends add-user">
                            <img src={user.avatar} alt="" />
                            <p>{user.name}</p>
                        </div>
                    ) : (
                    chatData && chatData.map((item, index) => (
                            <div onClick={()=>setChat(item)} className={`friends ${chatUser && chatUser.messagesId === item.messagesId ? 'active' : ''}`} key={index}>
                                <img src={item.userData.avatar} alt="" />
                                <div>
                                    <p>{item.userData.name}</p>
                                    <span>{item.lastMessage || "No messages yet"}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
    }

    export default LeftSidebar
