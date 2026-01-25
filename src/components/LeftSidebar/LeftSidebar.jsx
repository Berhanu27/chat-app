import './LeftSidebar.css'
import assets from '../../assets/assets'
import { useNavigate } from 'react-router-dom'
import { arrayUnion, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, serverTimestamp, where } from 'firebase/firestore';
import { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { db, logout } from '../../config/Firebase';
import { toast } from 'react-toastify';
import upload from '../../lib/upload';

const LeftSidebar = () => {
    const navigate = useNavigate();
    const { userData,chatData, chatUser,setChatUser, setMessagesId, setChatData, setMessages,chatVisible, setChatVisible, appSettings, setAppSettings } = useContext(AppContext);
    const [user, setUser] = useState(null)
    const [showSearch, setShowSearch] = useState(false)
    const [showMyProfile, setShowMyProfile] = useState(false)
    const [showEditProfile, setShowEditProfile] = useState(false)
    const [searchMode, setSearchMode] = useState('contacts') // 'contacts' or 'add'
    const [searchQuery, setSearchQuery] = useState('')
    const [filteredContacts, setFilteredContacts] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [editName, setEditName] = useState('')
    const [editBio, setEditBio] = useState('')
    const [editUsername, setEditUsername] = useState('')
    const [editImage, setEditImage] = useState(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [activeDropdown, setActiveDropdown] = useState(null)
    const [showSettings, setShowSettings] = useState(false)
    const [settings, setSettings] = useState({
        soundNotifications: true,
        browserNotifications: true,
        showOnlineStatus: true,
        readReceipts: true,
        autoDownloadMedia: true,
        darkMode: false
    })
    const inputRef = useRef(null);
    
    const handleLogout = async () => {
        try {
            console.log("Logout clicked"); // Debug log
            // Clear all state before logout
            setChatData(null);
            setMessages([]);
            setChatUser(null);
            setMessagesId(null);
            await logout();
            navigate('/'); // Ensure navigation to login page
        } catch (error) {
            console.error("Logout error:", error);
            toast.error("Failed to logout");
        }
    }

    const handleEditProfile = () => {
        try {
            console.log("Edit profile clicked"); // Debug log
            // Instead of navigating, open inline edit modal
            setEditName(userData.name || '');
            setEditBio(userData.bio || '');
            setEditUsername(userData.username || '');
            setEditImage(null);
            setShowEditProfile(true);
        } catch (error) {
            console.error("Edit profile error:", error);
            toast.error("Failed to open profile editor");
        }
    }

    const updateProfile = async () => {
        if (!editName.trim()) {
            toast.error('Please enter your name');
            return;
        }

        if (!editUsername.trim()) {
            toast.error('Please enter a username');
            return;
        }

        // Check if username is valid (alphanumeric and underscore only)
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(editUsername)) {
            toast.error('Username can only contain letters, numbers, and underscores');
            return;
        }

        // Check if username is different and needs validation
        if (editUsername.toLowerCase() !== userData.username) {
            // Check if username already exists
            try {
                const userRef = collection(db, 'users');
                const q = query(userRef, where("username", "==", editUsername.toLowerCase()));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    toast.error('Username already taken. Please choose another one.');
                    return;
                }
            } catch (error) {
                console.error('Username check error:', error);
                toast.error('Failed to validate username');
                return;
            }
        }

        setIsUpdating(true);
        try {
            const docRef = doc(db, 'users', userData.id);
            const updateData = {
                name: editName.trim(),
                bio: editBio.trim(),
                username: editUsername.toLowerCase().trim()
            };

            if (editImage) {
                // Upload new profile image
                const uploadResult = await upload(editImage);
                updateData.avatar = uploadResult.url;
            }

            await updateDoc(docRef, updateData);
            
            // Update local userData
            setChatData(prev => prev ? [...prev] : []); // Trigger re-fetch
            
            toast.success('Profile updated successfully!');
            setShowEditProfile(false);
            setEditImage(null);
        } catch (error) {
            console.error('Profile update error:', error);
            toast.error('Failed to update profile');
        } finally {
            setIsUpdating(false);
        }
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                setEditImage(file);
            } else {
                toast.error('Please select an image file');
            }
        }
    };
    
    const inputHandler = async (e) => {
        try {
            const input = e.target.value;
            setSearchQuery(input);
            
            if (input) {
                if (searchMode === 'add') {
                    // Search for new users to add
                    setShowSearch(true);
                    const userRef = collection(db, 'users');
                    const q = query(userRef, where("username", "==", input.toLowerCase()));
                    const querySnapshot = await getDocs(q);
                    
                    if (!querySnapshot.empty && querySnapshot.docs[0].data().id !== userData.id) {
                        let userExist = false;
                        chatData && chatData.map((user) => {
                            if (user.rId === querySnapshot.docs[0].data().id) {
                                userExist = true;
                                toast.info('User already exists in your chat');
                            }
                        });
                        
                        if (!userExist) {
                            setUser(querySnapshot.docs[0].data());
                        }
                    } else {
                        setUser(null);
                    }
                } else {
                    // Search existing contacts
                    if (chatData) {
                        const filtered = chatData.filter(item => {
                            if (!item.userData) return false;
                            
                            const name = item.userData.name?.toLowerCase() || '';
                            const username = item.userData.username?.toLowerCase() || '';
                            const searchTerm = input.toLowerCase();
                            
                            return name.includes(searchTerm) || username.includes(searchTerm);
                        });
                        setFilteredContacts(filtered);
                        setShowSearch(true);
                    }
                }
            } else {
                setShowSearch(false);
                setFilteredContacts([]);
                setUser(null);
            }
        } catch (error) {
            console.error("Search error:", error);
        }
    }

    const toggleSearchMode = () => {
        setSearchMode(searchMode === 'contacts' ? 'add' : 'contacts');
        setSearchQuery('');
        setShowSearch(false);
        setFilteredContacts([]);
        setUser(null);
        if (inputRef.current) {
            inputRef.current.value = '';
            inputRef.current.placeholder = searchMode === 'contacts' ? 'Search users to add...' : 'Search your contacts...';
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

    const removeContact = async (contactToRemove, event) => {
        event.stopPropagation(); // Prevent opening the chat when clicking delete
        
        try {
            const userChatsRef = doc(db, 'chats', userData.id);
            const userChatsSnapshot = await getDoc(userChatsRef);
            
            if (userChatsSnapshot.exists()) {
                const userChatData = userChatsSnapshot.data();
                const updatedChatData = userChatData.chatData.filter(
                    chat => chat.messagesId !== contactToRemove.messagesId
                );
                
                await updateDoc(userChatsRef, { 
                    chatData: updatedChatData 
                });
                
                // If the removed contact was the active chat, clear it
                if (chatUser && chatUser.messagesId === contactToRemove.messagesId) {
                    setChatUser(null);
                    setMessagesId(null);
                    setMessages([]);
                    setChatVisible(false);
                }
                
                toast.success('Contact removed successfully');
            }
        } catch (error) {
            console.error('Error removing contact:', error);
            toast.error('Failed to remove contact');
        }
    };

    const blockUser = async (contactToBlock, event) => {
        event.stopPropagation();
        
        try {
            const userRef = doc(db, 'users', userData.id);
            const userSnapshot = await getDoc(userRef);
            
            if (userSnapshot.exists()) {
                const currentUserData = userSnapshot.data();
                const blockedUsers = currentUserData.blockedUsers || [];
                
                if (!blockedUsers.includes(contactToBlock.rId)) {
                    await updateDoc(userRef, {
                        blockedUsers: arrayUnion(contactToBlock.rId)
                    });
                    
                    // Also remove from chat list
                    await removeContact(contactToBlock, event);
                    
                    toast.success('User blocked successfully');
                } else {
                    toast.info('User is already blocked');
                }
            }
        } catch (error) {
            console.error('Error blocking user:', error);
            toast.error('Failed to block user');
        }
    };

    const toggleDropdown = (contactId, event) => {
        event.stopPropagation();
        setActiveDropdown(activeDropdown === contactId ? null : contactId);
    };

    const handleSettings = () => {
        setShowSettings(true);
    };

    // Load settings from localStorage and Firebase
    const loadSettings = async () => {
        try {
            // Load from localStorage first (faster)
            const localSettings = localStorage.getItem('chatAppSettings');
            if (localSettings) {
                setSettings(JSON.parse(localSettings));
            }

            // Then sync with Firebase if user is logged in
            if (userData?.id) {
                const userRef = doc(db, 'users', userData.id);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists() && userSnap.data().settings) {
                    const firebaseSettings = userSnap.data().settings;
                    setSettings(firebaseSettings);
                    setAppSettings(firebaseSettings); // Update context
                    // Update localStorage with Firebase data
                    localStorage.setItem('chatAppSettings', JSON.stringify(firebaseSettings));
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    // Save settings to both localStorage and Firebase
    const saveSettings = async (newSettings) => {
        try {
            setSettings(newSettings);
            setAppSettings(newSettings); // Update context
            
            // Save to localStorage immediately
            localStorage.setItem('chatAppSettings', JSON.stringify(newSettings));
            
            // Save to Firebase for cross-device sync
            if (userData?.id) {
                const userRef = doc(db, 'users', userData.id);
                await updateDoc(userRef, {
                    settings: newSettings,
                    settingsUpdatedAt: Date.now()
                });
            }
            
            toast.success('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings');
        }
    };

    // Handle individual setting changes
    const handleSettingChange = (settingKey, value) => {
        const newSettings = {
            ...settings,
            [settingKey]: value
        };
        saveSettings(newSettings);
    };

    // Delete account function
    const deleteAccount = async () => {
        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            try {
                // Clear all user data
                localStorage.clear();
                
                // You might want to delete user data from Firebase here
                // await deleteDoc(doc(db, 'users', userData.id));
                
                toast.success('Account deletion initiated');
                await logout();
                navigate('/');
            } catch (error) {
                console.error('Error deleting account:', error);
                toast.error('Failed to delete account');
            }
        }
    };

    // Export chat data function
    const exportChatData = async () => {
        try {
            const chatExport = {
                user: {
                    name: userData.name,
                    username: userData.username,
                    exportDate: new Date().toISOString()
                },
                chats: chatData || [],
                settings: settings
            };
            
            const dataStr = JSON.stringify(chatExport, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `chatapp-export-${userData.username}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast.success('Chat data exported successfully');
        } catch (error) {
            console.error('Error exporting data:', error);
            toast.error('Failed to export data');
        }
    };

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

    // Load settings when component mounts or user changes
    useEffect(() => {
        if (userData) {
            loadSettings();
        }
    }, [userData]);

    // Apply dark mode setting
    useEffect(() => {
        if (settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [settings.darkMode]);

    // Add loading effect
    useEffect(() => {
        if (userData && chatData !== null) {
            setIsLoading(false);
        }
    }, [userData, chatData]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeDropdown && !event.target.closest('.contact-options')) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [activeDropdown]);

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
                            <p onClick={handleEditProfile}>Edit profile</p>
                            <hr />
                            <p onClick={() => setShowMyProfile(true)}>View profile</p>
                            <hr />
                            <p onClick={handleSettings}>Settings</p>
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
                                        <span>
                                            {userData.createdAt 
                                                ? new Date(userData.createdAt).toLocaleDateString()
                                                : userData.lastSeen 
                                                    ? new Date(userData.lastSeen).toLocaleDateString()
                                                    : 'Recently joined'
                                            }
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Last seen:</label>
                                        <span>{new Date(userData.lastSeen).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="profile-actions">
                                    <button className="edit-profile-btn" onClick={() => {
                                        setShowMyProfile(false);
                                        setShowEditProfile(true);
                                        setEditName(userData.name || '');
                                        setEditBio(userData.bio || '');
                                        setEditUsername(userData.username || '');
                                        setEditImage(null);
                                    }}>
                                        Edit Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Profile Modal */}
                {showEditProfile && userData && (
                    <div className="profile-info-overlay" onClick={() => setShowEditProfile(false)}>
                        <div className="profile-info-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="profile-info-header">
                                <h3>Edit Profile</h3>
                                <button className="close-btn" onClick={() => setShowEditProfile(false)}>×</button>
                            </div>
                            <div className="profile-info-content">
                                <div className="profile-avatar">
                                    <img 
                                        src={editImage ? URL.createObjectURL(editImage) : (userData?.avatar || assets.avatar_icon)} 
                                        alt="Profile" 
                                    />
                                    <input 
                                        type="file" 
                                        id="editProfileImage" 
                                        accept="image/*" 
                                        onChange={handleImageChange}
                                        hidden 
                                    />
                                    <label htmlFor="editProfileImage" className="change-photo-btn">
                                        📷 Change Photo
                                    </label>
                                </div>
                                <div className="profile-edit-form">
                                    <div className="form-group">
                                        <label>Name *</label>
                                        <input 
                                            type="text" 
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Enter your name"
                                            maxLength={50}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Username *</label>
                                        <input 
                                            type="text" 
                                            value={editUsername}
                                            onChange={(e) => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                            placeholder="Enter your username"
                                            maxLength={30}
                                        />
                                        <small className="username-hint">Only letters, numbers, and underscores allowed</small>
                                    </div>
                                    <div className="form-group">
                                        <label>Bio</label>
                                        <textarea 
                                            value={editBio}
                                            onChange={(e) => setEditBio(e.target.value)}
                                            placeholder="Tell us about yourself"
                                            maxLength={200}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <div className="profile-actions">
                                    <button 
                                        className="cancel-btn" 
                                        onClick={() => setShowEditProfile(false)}
                                        disabled={isUpdating}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="save-btn" 
                                        onClick={updateProfile}
                                        disabled={isUpdating || !editName.trim() || !editUsername.trim()}
                                    >
                                        {isUpdating ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Modal */}
                {showSettings && (
                    <div className="profile-info-overlay" onClick={() => setShowSettings(false)}>
                        <div className="profile-info-modal settings-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="profile-info-header">
                                <h3>Settings</h3>
                                <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
                            </div>
                            <div className="profile-info-content">
                                <div className="settings-section">
                                    <h4>Notifications</h4>
                                    <div className="setting-item">
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={settings.soundNotifications}
                                                onChange={(e) => handleSettingChange('soundNotifications', e.target.checked)}
                                            />
                                            <span>Sound notifications</span>
                                        </label>
                                    </div>
                                    <div className="setting-item">
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={settings.browserNotifications}
                                                onChange={(e) => handleSettingChange('browserNotifications', e.target.checked)}
                                            />
                                            <span>Browser notifications</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="settings-section">
                                    <h4>Privacy</h4>
                                    <div className="setting-item">
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={settings.showOnlineStatus}
                                                onChange={(e) => handleSettingChange('showOnlineStatus', e.target.checked)}
                                            />
                                            <span>Show online status</span>
                                        </label>
                                    </div>
                                    <div className="setting-item">
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={settings.readReceipts}
                                                onChange={(e) => handleSettingChange('readReceipts', e.target.checked)}
                                            />
                                            <span>Read receipts</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="settings-section">
                                    <h4>Chat</h4>
                                    <div className="setting-item">
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={settings.autoDownloadMedia}
                                                onChange={(e) => handleSettingChange('autoDownloadMedia', e.target.checked)}
                                            />
                                            <span>Auto-download media</span>
                                        </label>
                                    </div>
                                    <div className="setting-item">
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={settings.darkMode}
                                                onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                                            />
                                            <span>Dark mode</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="settings-section">
                                    <h4>Account</h4>
                                    <div className="setting-item">
                                        <button className="settings-btn danger" onClick={deleteAccount}>
                                            Delete Account
                                        </button>
                                    </div>
                                    <div className="setting-item">
                                        <button className="settings-btn" onClick={exportChatData}>
                                            Export Chat Data
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="ls-search">
                    <img src={assets.search_icon} alt="Search" style={{display: 'block', minWidth: '18px'}} />
                    <input 
                        ref={inputRef} 
                        onChange={inputHandler} 
                        type="text" 
                        placeholder={searchMode === 'add' ? 'Search users to add...' : 'Search your contacts...'}
                    />
                    <button 
                        className={`search-mode-btn ${searchMode === 'add' ? 'active' : ''}`}
                        onClick={toggleSearchMode}
                        title={searchMode === 'add' ? 'Search contacts' : 'Add new contact'}
                    >
                        {searchMode === 'add' ? '👥' : '+'}
                    </button>
                </div>
                
                <div className="ls-list">
                    {showSearch ? (
                        <div className="search-results">
                            {searchMode === 'add' ? (
                                // Add new user mode
                                user ? (
                                    <div onClick={async () => {
                                        // Add user to chat logic (existing)
                                        const messagesRef = collection(db, 'messages');
                                        const chatsRef = collection(db, 'chats');
                                        try {
                                            const newMessageRef = doc(messagesRef);
                                            await setDoc(newMessageRef, {
                                                createAt: serverTimestamp(),
                                                messages: []
                                            });
                                            
                                            await updateDoc(doc(chatsRef, user.id), {
                                                chatData: arrayUnion({
                                                    messagesId: newMessageRef.id,
                                                    lastMessage: "",
                                                    rId: userData.id,
                                                    updateAt: Date.now(),
                                                    messageSeen: true
                                                })
                                            });
                                            
                                            await updateDoc(doc(chatsRef, userData.id), {
                                                chatData: arrayUnion({
                                                    messagesId: newMessageRef.id,
                                                    lastMessage: "",
                                                    rId: user.id,
                                                    updateAt: Date.now(),
                                                    messageSeen: true
                                                })
                                            });
                                            
                                            const uSnap = await getDoc(doc(db,'users',user.id));
                                            const uData = uSnap.data();
                                            setChat({
                                                messagesId: newMessageRef.id,
                                                lastMessage: "",
                                                rId: uData.id,
                                                updateAt: Date.now(),
                                                messageSeen: true,
                                                userData: uData
                                            });
                                            
                                            setShowSearch(false);
                                            setChatVisible(true);
                                            setUser(null);
                                            setSearchQuery('');
                                            if (inputRef.current) {
                                                inputRef.current.value = '';
                                            }
                                        } catch (error) {
                                            toast.error(error.message);
                                            console.error(error);
                                        }
                                    }} className="friends add-user">
                                        <div className="friend-avatar">
                                            <img src={user?.avatar || assets.avatar_icon} alt="" />
                                            {user && Date.now() - user.lastSeen <= 70000 && (
                                                <div className="online-dot"></div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="friend-name-status">
                                                <p>{user.name}</p>
                                                {user && Date.now() - user.lastSeen <= 70000 ? (
                                                    <span className="online-badge">online</span>
                                                ) : (
                                                    <span className="offline-badge">offline</span>
                                                )}
                                            </div>
                                            <span>@{user.username}</span>
                                        </div>
                                        <span className="add-icon">+</span>
                                    </div>
                                ) : (
                                    <div className="no-results">
                                        <p>No user found with that username</p>
                                    </div>
                                )
                            ) : (
                                // Search existing contacts mode
                                filteredContacts.length > 0 ? (
                                    filteredContacts.map((item, index) => {
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
                                            <div onClick={()=>setChat(item)} className={`friends ${chatUser && chatUser.messagesId === safeItem.messagesId ? 'active' : ''} ${!safeItem.messageSeen ? 'unread' : ''} ${safeItem.userData && Date.now() - safeItem.userData.lastSeen <= 70000 ? 'online-user' : ''}`} key={index}>
                                                <div className="friend-avatar">
                                                    <img 
                                                        src={avatar} 
                                                        alt="" 
                                                        onError={(e) => {
                                                            e.target.src = assets.avatar_icon;
                                                        }} 
                                                    />
                                                    {safeItem.userData && Date.now() - safeItem.userData.lastSeen <= 70000 && (
                                                        <div className="online-dot"></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="friend-name-status">
                                                        <p>{name}</p>
                                                        {safeItem.userData && Date.now() - safeItem.userData.lastSeen <= 70000 ? (
                                                            <span className="online-badge">online</span>
                                                        ) : (
                                                            <span className="offline-badge">offline</span>
                                                        )}
                                                    </div>
                                                    <span>{safeItem.lastMessage}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="no-results">
                                        <p>No contacts found</p>
                                    </div>
                                )
                            )}
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
                                    <div onClick={()=>setChat(item)} className={`friends ${chatUser && chatUser.messagesId === safeItem.messagesId ? 'active' : ''} ${!safeItem.messageSeen ? 'unread' : ''} ${safeItem.userData && Date.now() - safeItem.userData.lastSeen <= 70000 ? 'online-user' : ''}`} key={index}>
                                        <div className="friend-avatar">
                                            <img 
                                                src={avatar} 
                                                alt="" 
                                                onError={(e) => {
                                                    e.target.src = assets.avatar_icon;
                                                }} 
                                            />
                                            {/* Online Status Indicator */}
                                            {safeItem.userData && Date.now() - safeItem.userData.lastSeen <= 70000 && (
                                                <div className="online-dot"></div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="friend-name-status">
                                                <p>{name}</p>
                                                {safeItem.userData && Date.now() - safeItem.userData.lastSeen <= 70000 ? (
                                                    <span className="online-badge">Online</span>
                                                ) : (
                                                    <span className="offline-badge">Offline</span>
                                                )}
                                            </div>
                                            <span>{safeItem.lastMessage}</span>
                                        </div>
                                        {!safeItem.messageSeen && (
                                            <div className="unread-indicator"></div>
                                        )}
                                        {/* Contact Options Dropdown */}
                                        <div className="contact-options">
                                            <button 
                                                className="options-btn"
                                                onClick={(e) => toggleDropdown(safeItem.messagesId, e)}
                                                title="Contact options"
                                            >
                                                ⋮
                                            </button>
                                            {activeDropdown === safeItem.messagesId && (
                                                <div className="dropdown-menu">
                                                    <button 
                                                        className="dropdown-item remove"
                                                        onClick={(e) => {
                                                            removeContact(item, e);
                                                            setActiveDropdown(null);
                                                        }}
                                                    >
                                                        🗑️ Remove Contact
                                                    </button>
                                                    <button 
                                                        className="dropdown-item block"
                                                        onClick={(e) => {
                                                            blockUser(item, e);
                                                            setActiveDropdown(null);
                                                        }}
                                                    >
                                                        🚫 Block User
                                                    </button>
                                                </div>
                                            )}
                                        </div>
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