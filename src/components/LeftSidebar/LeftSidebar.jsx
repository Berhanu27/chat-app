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
    const [showMyProfile, setShowMyProfile] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
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
    
    const setChat = async (item) => {
        console.log("Setting chat:", item);
        console.log("MessagesId being set:", item.messagesId);
        
        setMessagesId(item.messagesId);
        setChatUser(item);
        
        try {
            const userChatsRef = doc(db, 'chats', userData.id);
            const userChatsSnapshot = await getDoc(userChatsRef);
            if (userChatsSnapshot.exists()) {
                const userChatData = userChatsSnapshot.data();
                console.log("User chat data:", userChatData);
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
            if(chatUser && !chatUser.isGroup){
                try {
                    const userRef=doc(db,'users',chatUser.rId || chatUser.id);
                    const usersnap=await getDoc(userRef);
                    const userData=usersnap.data();
                    if (userData) {
                        setChatUser(prev=>({...prev, userData: userData}));
                    }
                } catch (error) {
                    console.error("Error updating chat user data:", error);
                }
            }
        }
        updatechatUserData();
    },[chatData])

    // Add loading effect
    useEffect(() => {
        if (userData && chatData !== null) {
            setIsLoading(false);
        }
    }, [userData, chatData]);

    // Don't render until we have basic data
    if (!userData || isLoading) {
        return (
            <div className="ls">
                <div className="ls-top">
                    <div className="ls-nav">
                        <img src={assets.logo} alt="" className='logo' />
                        <div className="menu">
                            <img src={assets.menu_icon} alt="" />
                        </div>
                    </div>
                    <div className="ls-search">
                        <img src={assets.search_icon} alt="Search" />
                        <input type="text" placeholder='Loading...' disabled />
                    </div>
                    <div className="ls-list">
                        <div className="loading-message">Loading chats...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ls">
            <div className="ls-top">
                <div className="ls-nav">
                    <img src={assets.logo} alt="" className='logo' onClick={() => setShowMyProfile(true)} style={{cursor: 'pointer'}} title="View my profile" />
                    <div className="menu">
                        <img src={assets.menu_icon} alt="" />
                        <div className="sub-menu">
                            <p onClick={() => navigate('/profile')}>Edit profile</p>
                            <hr />
                            <p onClick={() => setShowMyProfile(true)}>View profile</p>
                            <hr />
                            <p onClick={handleLogout}>Logout</p>
                        </div>
                    </div>
                </div>

                {/* My Profile Modal */}
                {showMyProfile && userData && (
                    <div className="profile-info-overlay" onClick={() => setShowMyProfile(false)}>
                        <div className="profile-info-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="profile-info-header">
                                <h3>My Profile</h3>
                                <button className="close-btn" onClick={() => setShowMyProfile(false)}>×</button>
                            </div>
                            <div className="profile-info-content">
                                <div className="profile-avatar">
                                    <img src={userData?.avatar || assets.avatar_icon} alt={userData?.name || 'User'} />
                                    <div className="online-status">
                                        <span className="status online">
                                            <img src={assets.green_dot} alt="" />
                                            Online (You)
                                        </span>
                                    </div>
                                </div>
                                <div className="profile-details">
                                    <div className="detail-item">
                                        <label>Name:</label>
                                        <span>{userData.name}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Username:</label>
                                        <span>@{userData.username}</span>
                                    </div>
                                    {userData.bio && (
                                        <div className="detail-item">
                                            <label>Bio:</label>
                                            <span>{userData.bio}</span>
                                        </div>
                                    )}
                                    <div className="detail-item">
                                        <label>Member since:</label>
                                        <span>{new Date(userData.id).toLocaleDateString()}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Last seen:</label>
                                        <span>{new Date(userData.lastSeen).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="profile-actions">
                                    <button className="edit-profile-btn" onClick={() => {
                                        setShowMyProfile(false);
                                        navigate('/profile');
                                    }}>
                                        Edit Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="ls-search">
                    <img src={assets.search_icon} alt="Search" style={{display: 'block', minWidth: '18px'}} />
                    <input ref={inputRef} onChange={inputHandler} type="text" placeholder='Search here..' />
                </div>
                
                <div className="ls-list">
                    {showSearch && user ? (
                        <div onClick={async () => {
                            // Add user to chat
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
                        }} className="friends add-user">
                            <img src={user?.avatar || assets.avatar_icon} alt="" />
                            <p>{user.name}</p>
                        </div>
                    ) : (
                        chatData && Array.isArray(chatData) && chatData.length > 0 ? (
                            chatData.filter(item => item && typeof item === 'object' && !item.isGroup).map((item, index) => {
                                // Only show regular user chats, filter out any groups
                                const safeItem = {
                                    messagesId: item.messagesId || '',
                                    lastMessage: item.lastMessage || 'No messages yet',
                                    messageSeen: item.messageSeen !== false,
                                    rId: item.rId || '',
                                    userData: item.userData || null
                                };

                                const avatar = safeItem.userData?.avatar || assets.avatar_icon;
                                const name = safeItem.userData?.name || 'Loading...';

                                return (
                                    <div onClick={()=>setChat(item)} className={`friends ${chatUser && chatUser.messagesId === safeItem.messagesId ? 'active' : ''} ${!safeItem.messageSeen ? 'unread' : ''}`} key={index}>
                                        <img 
                                            src={avatar} 
                                            alt="" 
                                            onError={(e) => {
                                                e.target.src = assets.avatar_icon;
                                            }} 
                                        />
                                        <div>
                                            <p>{name}</p>
                                            <span>{safeItem.lastMessage}</span>
                                        </div>
                                        {!safeItem.messageSeen && (
                                            <div className="unread-indicator"></div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-chats-message">
                                <p>No chats yet. Search for users to start chatting!</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}

export default LeftSidebar