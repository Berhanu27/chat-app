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
    const [showCreateGroup, setShowCreateGroup] = useState(false)
    const [groupName, setGroupName] = useState('')
    const [groupDescription, setGroupDescription] = useState('')
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
    const createGroup = async () => {
        if (!groupName.trim()) {
            toast.error('Please enter a group name');
            return;
        }
        
        try {
            const messagesRef = collection(db, 'messages');
            const groupsRef = collection(db, 'groups');
            
            // Create new message document for the group
            const newMessageRef = doc(messagesRef);
            await setDoc(newMessageRef, {
                createAt: serverTimestamp(),
                messages: [{
                    sId: 'system',
                    text: `Group "${groupName}" created by ${userData.name}`,
                    createdAt: Date.now(),
                    id: `system_${Date.now()}`
                }]
            });
            
            // Create group document
            const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await setDoc(doc(groupsRef, groupId), {
                id: groupId,
                name: groupName,
                description: groupDescription,
                avatar: assets.logo_icon, // Default group avatar
                createdBy: userData.id,
                createdAt: Date.now(),
                members: [userData.id],
                messagesId: newMessageRef.id,
                isGroup: true
            });
            
            // Add group to user's chat list
            await updateDoc(doc(db, 'chats', userData.id), {
                chatData: arrayUnion({
                    messagesId: newMessageRef.id,
                    lastMessage: `Group "${groupName}" created`,
                    rId: groupId,
                    updateAt: Date.now(),
                    messageSeen: true,
                    isGroup: true,
                    groupData: {
                        id: groupId,
                        name: groupName,
                        description: groupDescription,
                        avatar: assets.logo_icon,
                        members: [userData.id]
                    }
                })
            });
            
            toast.success('Group created successfully!');
            setShowCreateGroup(false);
            setGroupName('');
            setGroupDescription('');
            
        } catch (error) {
            console.error('Error creating group:', error);
            toast.error('Failed to create group');
        }
    };
    
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

                {/* Create Group Modal */}
                {showCreateGroup && (
                    <div className="group-create-overlay" onClick={() => setShowCreateGroup(false)}>
                        <div className="group-create-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="group-create-header">
                                <h3>Create New Group</h3>
                                <button className="close-btn" onClick={() => setShowCreateGroup(false)}>×</button>
                            </div>
                            <div className="group-create-content">
                                <div className="group-avatar-section">
                                    <img src={assets.logo_icon} alt="Group Avatar" className="group-avatar-preview" />
                                    <p>Default Group Avatar</p>
                                </div>
                                <div className="group-form">
                                    <div className="form-group">
                                        <label>Group Name *</label>
                                        <input 
                                            type="text" 
                                            placeholder="Enter group name"
                                            value={groupName}
                                            onChange={(e) => setGroupName(e.target.value)}
                                            maxLength={50}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Description (Optional)</label>
                                        <textarea 
                                            placeholder="Enter group description"
                                            value={groupDescription}
                                            onChange={(e) => setGroupDescription(e.target.value)}
                                            maxLength={200}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="group-actions">
                                        <button 
                                            className="cancel-btn" 
                                            onClick={() => setShowCreateGroup(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            className="create-btn" 
                                            onClick={createGroup}
                                            disabled={!groupName.trim()}
                                        >
                                            Create Group
                                        </button>
                                    </div>
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
                    chatData && chatData.map((item, index) => {
                        // Debug log to help identify the problematic item
                        if (!item.userData && !item.isGroup) {
                            console.warn('Chat item missing userData:', item);
                        }
                        return (
                            <div onClick={()=>setChat(item)} className={`friends ${chatUser && chatUser.messagesId === item.messagesId ? 'active' : ''} ${!item.messageSeen ? 'unread' : ''}`} key={index}>
                                <img src={item.isGroup ? (item.groupData?.avatar || assets.logo_icon) : (item.userData?.avatar || assets.avatar_icon)} alt="" />
                                <div>
                                    <p>{item.isGroup ? (item.groupData?.name || 'Group Chat') : (item.userData?.name || 'Unknown User')}</p>
                                    <span>{item.lastMessage || "No messages yet"}</span>
                                </div>
                                {!item.messageSeen && (
                                    <div className="unread-indicator"></div>
                                )}
                                {item.isGroup && (
                                    <div className="group-indicator">👥</div>
                                )}
                            </div>
                        );
                    })
                    )}
                    
                    {/* Simple Create Group Option */}
                    <div onClick={() => setShowCreateGroup(true)} className="friends add-user" style={{background: 'rgba(76, 175, 80, 0.1)', border: '2px dashed #4CAF50'}}>
                        <img src={assets.logo_icon} alt="" />
                        <p style={{color: '#4CAF50', fontWeight: 'bold'}}>👥 Create New Group</p>
                    </div>
                    )}
                </div>
            </div>
        </div>
    )
    }

    export default LeftSidebar
