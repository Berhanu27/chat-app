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
    const [showCreateGroup, setShowCreateGroup] = useState(false)
    const [showGroupSettings, setShowGroupSettings] = useState(false)
    const [showAddMembers, setShowAddMembers] = useState(false)
    const [showGroupsManager, setShowGroupsManager] = useState(false)
    const [showInviteLink, setShowInviteLink] = useState(false)
    const [showMemberManagement, setShowMemberManagement] = useState(false)
    const [groupInviteLink, setGroupInviteLink] = useState('')
    const [currentGroup, setCurrentGroup] = useState(null)
    const [groupName, setGroupName] = useState('')
    const [groupDescription, setGroupDescription] = useState('')
    const [selectedMembers, setSelectedMembers] = useState([])
    const [groupAvatar, setGroupAvatar] = useState(null)
    const [editGroupName, setEditGroupName] = useState('')
    const [editGroupDescription, setEditGroupDescription] = useState('')
    const [editGroupAvatar, setEditGroupAvatar] = useState(null)
    const [isUpdatingGroup, setIsUpdatingGroup] = useState(false)
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

            // Handle profile image update/removal
            if (editImage === 'remove') {
                // Remove profile image
                updateData.avatar = '';
            } else if (editImage && editImage !== 'remove') {
                // Upload new profile image
                const uploadResult = await upload(editImage);
                updateData.avatar = uploadResult.url;
            }
            // If editImage is null, keep existing avatar

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
                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    toast.error('Image size should be less than 5MB');
                    return;
                }
                setEditImage(file);
            } else {
                toast.error('Please select an image file');
            }
        }
    };

    const removeProfileImage = () => {
        setEditImage('remove');
    };

    const cancelImageRemoval = () => {
        setEditImage(null);
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

    const handleChatClick = (item) => {
        // Close any open dropdown first
        setActiveDropdown(null);
        // Then set the chat
        setChat(item);
    };

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

    const refreshChatData = async () => {
        try {
            if (userData?.id) {
                const userChatsRef = doc(db, 'chats', userData.id);
                const userChatsSnapshot = await getDoc(userChatsRef);
                
                if (userChatsSnapshot.exists()) {
                    const freshChatData = userChatsSnapshot.data().chatData || [];
                    console.log('Fresh chat data from Firebase:', freshChatData);
                    setChatData(freshChatData);
                    toast.success('Chat data refreshed');
                } else {
                    console.log('No chat document found for user');
                }
            }
        } catch (error) {
            console.error('Error refreshing chat data:', error);
            toast.error('Failed to refresh chat data');
        }
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

    // Group creation functions
    const handleCreateGroup = () => {
        setShowCreateGroup(true);
        setGroupName('');
        setGroupDescription('');
        setSelectedMembers([]);
        setGroupAvatar(null);
    };

    const toggleMemberSelection = (contact) => {
        setSelectedMembers(prev => {
            const isSelected = prev.some(member => member.rId === contact.rId);
            if (isSelected) {
                return prev.filter(member => member.rId !== contact.rId);
            } else {
                return [...prev, contact];
            }
        });
    };

    const createGroup = async () => {
        if (!groupName.trim()) {
            toast.error('Please enter a group name');
            return;
        }

        if (selectedMembers.length === 0) {
            toast.error('Please select at least one member');
            return;
        }

        try {
            // Create group messages collection first
            const messagesRef = doc(collection(db, 'messages'));
            await setDoc(messagesRef, {
                messages: [{
                    sId: 'system',
                    text: `${userData.name} created the group "${groupName.trim()}"`,
                    createdAt: Date.now(),
                    type: 'system',
                    id: `system_${Date.now()}`
                }]
            });

            // Handle group avatar upload
            let avatarUrl = '';
            if (groupAvatar && groupAvatar !== 'remove') {
                const uploadResult = await upload(groupAvatar);
                avatarUrl = uploadResult.url;
            }

            // Create group data
            const groupData = {
                id: messagesRef.id, // Use messages ID as group ID for consistency
                name: groupName.trim(),
                description: groupDescription.trim(),
                createdBy: userData.id,
                createdAt: Date.now(),
                members: [userData.id, ...selectedMembers.map(member => member.rId)],
                admins: [userData.id],
                avatar: avatarUrl,
                lastMessage: `${userData.name} created the group`,
                lastMessageTime: Date.now()
            };

            // Add group to all members' chat lists
            const allMembers = [userData.id, ...selectedMembers.map(member => member.rId)];
            
            for (const memberId of allMembers) {
                const userChatsRef = doc(db, 'chats', memberId);
                const userChatsSnapshot = await getDoc(userChatsRef);
                
                if (userChatsSnapshot.exists()) {
                    const userChatData = userChatsSnapshot.data();
                    const newGroupChat = {
                        messagesId: messagesRef.id,
                        lastMessage: `${userData.name} created the group`,
                        rId: messagesRef.id, // Use messages ID as rId for groups
                        updateAt: Date.now(),
                        updatedAt: Date.now(), // Add both for compatibility
                        messageSeen: memberId === userData.id,
                        isGroup: true,
                        groupData: groupData
                    };
                    
                    const updatedChatData = [...(userChatData.chatData || []), newGroupChat];
                    
                    await updateDoc(userChatsRef, { chatData: updatedChatData });
                    
                    // If this is the current user, update local state immediately
                    if (memberId === userData.id) {
                        setChatData(prev => [...(prev || []), newGroupChat]);
                    }
                }
            }

            toast.success('Group created successfully!');
            setShowCreateGroup(false);
            setGroupName('');
            setGroupDescription('');
            setSelectedMembers([]);
            setGroupAvatar(null);
            
        } catch (error) {
            console.error('Error creating group:', error);
            toast.error('Failed to create group: ' + error.message);
        }
    };

    const deleteGroup = async (groupToDelete, event) => {
        event.stopPropagation();
        
        // Check if user is admin or creator
        const isAdmin = groupToDelete.groupData?.admins?.includes(userData.id) || 
                       groupToDelete.groupData?.createdBy === userData.id;
        
        if (!isAdmin) {
            toast.error('Only group admins can delete the group');
            return;
        }

        if (window.confirm(`Are you sure you want to delete the group "${groupToDelete.groupData?.name}"? This action cannot be undone.`)) {
            try {
                // Remove group from all members' chat lists
                const allMembers = groupToDelete.groupData?.members || [];
                
                for (const memberId of allMembers) {
                    const userChatsRef = doc(db, 'chats', memberId);
                    const userChatsSnapshot = await getDoc(userChatsRef);
                    
                    if (userChatsSnapshot.exists()) {
                        const userChatData = userChatsSnapshot.data();
                        const updatedChatData = userChatData.chatData.filter(
                            chat => chat.messagesId !== groupToDelete.messagesId
                        );
                        
                        await updateDoc(userChatsRef, { chatData: updatedChatData });
                    }
                }

                // If the deleted group was the active chat, clear it
                if (chatUser && chatUser.messagesId === groupToDelete.messagesId) {
                    setChatUser(null);
                    setMessagesId(null);
                    setMessages([]);
                    setChatVisible(false);
                }
                
                toast.success('Group deleted successfully');
            } catch (error) {
                console.error('Error deleting group:', error);
                toast.error('Failed to delete group');
            }
        }
    };

    // Group admin functions
    const openGroupSettings = (group, event) => {
        event.stopPropagation();
        
        // Check if user is admin or creator
        const isAdmin = group.groupData?.admins?.includes(userData.id) || 
                       group.groupData?.createdBy === userData.id;
        
        if (!isAdmin) {
            toast.error('Only group admins can edit group settings');
            return;
        }

        setCurrentGroup(group);
        setEditGroupName(group.groupData?.name || '');
        setEditGroupDescription(group.groupData?.description || '');
        setEditGroupAvatar(null);
        setShowGroupSettings(true);
    };

    const openAddMembers = (group, event) => {
        event.stopPropagation();
        
        // Check if user is admin or creator
        const isAdmin = group.groupData?.admins?.includes(userData.id) || 
                       group.groupData?.createdBy === userData.id;
        
        if (!isAdmin) {
            toast.error('Only group admins can add members');
            return;
        }

        setCurrentGroup(group);
        setSelectedMembers([]);
        setShowAddMembers(true);
    };

    const addMembersToGroup = async () => {
        if (selectedMembers.length === 0) {
            toast.error('Please select at least one member to add');
            return;
        }

        if (!currentGroup) {
            toast.error('No group selected');
            return;
        }

        try {
            const newMemberIds = selectedMembers.map(member => member.rId);
            const existingMembers = currentGroup.groupData?.members || [];
            const updatedMembers = [...existingMembers, ...newMemberIds];

            // Update group data for all members (existing + new)
            const updatedGroupData = {
                ...currentGroup.groupData,
                members: updatedMembers,
                updatedAt: Date.now(),
                updatedBy: userData.id
            };

            // Add group to new members' chat lists
            for (const newMemberId of newMemberIds) {
                const userChatsRef = doc(db, 'chats', newMemberId);
                const userChatsSnapshot = await getDoc(userChatsRef);
                
                if (userChatsSnapshot.exists()) {
                    const userChatData = userChatsSnapshot.data();
                    const newGroupChat = {
                        messagesId: currentGroup.messagesId,
                        lastMessage: `${userData.name} added you to the group`,
                        rId: currentGroup.messagesId,
                        updateAt: Date.now(),
                        updatedAt: Date.now(),
                        messageSeen: false,
                        isGroup: true,
                        groupData: updatedGroupData
                    };
                    
                    const updatedChatData = [...(userChatData.chatData || []), newGroupChat];
                    await updateDoc(userChatsRef, { chatData: updatedChatData });
                }
            }

            // Update group data for existing members
            for (const memberId of existingMembers) {
                const userChatsRef = doc(db, 'chats', memberId);
                const userChatsSnapshot = await getDoc(userChatsRef);
                
                if (userChatsSnapshot.exists()) {
                    const userChatData = userChatsSnapshot.data();
                    const updatedChatData = userChatData.chatData.map(chat => {
                        if (chat.messagesId === currentGroup.messagesId) {
                            return {
                                ...chat,
                                groupData: updatedGroupData,
                                lastMessage: `${userData.name} added ${selectedMembers.length} new member(s)`,
                                updatedAt: Date.now(),
                                messageSeen: memberId === userData.id
                            };
                        }
                        return chat;
                    });
                    
                    await updateDoc(userChatsRef, { chatData: updatedChatData });
                }
            }

            // Add system message to group chat
            const messagesRef = doc(db, 'messages', currentGroup.messagesId);
            const messagesSnapshot = await getDoc(messagesRef);
            
            if (messagesSnapshot.exists()) {
                const messagesData = messagesSnapshot.data();
                const memberNames = selectedMembers.map(member => member.userData?.name || 'Unknown').join(', ');
                const systemMessage = {
                    sId: 'system',
                    text: `${userData.name} added ${memberNames} to the group`,
                    createdAt: Date.now(),
                    type: 'system',
                    id: `system_${Date.now()}`
                };
                
                await updateDoc(messagesRef, {
                    messages: [...(messagesData.messages || []), systemMessage]
                });
            }

            toast.success(`${selectedMembers.length} member(s) added successfully!`);
            setShowAddMembers(false);
            setSelectedMembers([]);
            setCurrentGroup(null);
            
        } catch (error) {
            console.error('Error adding members:', error);
            toast.error('Failed to add members');
        }
    };

    const updateGroupProfile = async () => {
        if (!editGroupName.trim()) {
            toast.error('Please enter a group name');
            return;
        }

        if (!currentGroup) {
            toast.error('No group selected');
            return;
        }

        setIsUpdatingGroup(true);
        try {
            let avatarUrl = currentGroup.groupData?.avatar || '';
            
            // Handle group avatar update/removal
            if (editGroupAvatar === 'remove') {
                avatarUrl = '';
            } else if (editGroupAvatar && editGroupAvatar !== 'remove') {
                // Upload new avatar if selected
                const uploadResult = await upload(editGroupAvatar);
                avatarUrl = uploadResult.url;
            }
            // If editGroupAvatar is null, keep existing avatar

            // Update group data for all members
            const allMembers = currentGroup.groupData?.members || [];
            const updatedGroupData = {
                ...currentGroup.groupData,
                name: editGroupName.trim(),
                description: editGroupDescription.trim(),
                avatar: avatarUrl,
                updatedAt: Date.now(),
                updatedBy: userData.id
            };

            for (const memberId of allMembers) {
                const userChatsRef = doc(db, 'chats', memberId);
                const userChatsSnapshot = await getDoc(userChatsRef);
                
                if (userChatsSnapshot.exists()) {
                    const userChatData = userChatsSnapshot.data();
                    const updatedChatData = userChatData.chatData.map(chat => {
                        if (chat.messagesId === currentGroup.messagesId) {
                            return {
                                ...chat,
                                groupData: updatedGroupData,
                                lastMessage: `${userData.name} updated the group`,
                                updatedAt: Date.now()
                            };
                        }
                        return chat;
                    });
                    
                    await updateDoc(userChatsRef, { chatData: updatedChatData });
                }
            }

            // Add system message to group chat
            const messagesRef = doc(db, 'messages', currentGroup.messagesId);
            const messagesSnapshot = await getDoc(messagesRef);
            
            if (messagesSnapshot.exists()) {
                const messagesData = messagesSnapshot.data();
                const systemMessage = {
                    sId: 'system',
                    text: `${userData.name} updated the group profile`,
                    createdAt: Date.now(),
                    type: 'system',
                    id: `system_${Date.now()}`
                };
                
                await updateDoc(messagesRef, {
                    messages: [...(messagesData.messages || []), systemMessage]
                });
            }

            toast.success('Group profile updated successfully!');
            setShowGroupSettings(false);
            setCurrentGroup(null);
            setEditGroupAvatar(null);
            
        } catch (error) {
            console.error('Error updating group profile:', error);
            toast.error('Failed to update group profile');
        } finally {
            setIsUpdatingGroup(false);
        }
    };

    const handleCreateGroupAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    toast.error('Image size should be less than 5MB');
                    return;
                }
                setGroupAvatar(file);
            } else {
                toast.error('Please select an image file');
            }
        }
    };

    const removeCreateGroupAvatar = () => {
        setGroupAvatar('remove');
    };

    const cancelCreateGroupAvatarRemoval = () => {
        setGroupAvatar(null);
    };

    // Invite Link Functions - Simple permanent link like Telegram
    const showGroupInviteLink = (group) => {
        // Use the group's messagesId as the permanent invite code
        const inviteCode = group.messagesId;
        const inviteLink = `${window.location.origin}/join-group/${inviteCode}`;
        
        console.log('Showing permanent group invite link:', inviteLink);
        console.log('Group:', group);
        
        setGroupInviteLink(inviteLink);
        setCurrentGroup(group);
        setShowInviteLink(true);
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText(groupInviteLink).then(() => {
            toast.success('Invite link copied to clipboard!');
        }).catch(() => {
            toast.error('Failed to copy link');
        });
    };

    const sendInviteToCurrentChat = async () => {
        if (!chatUser || !messagesId || !groupInviteLink) {
            toast.error('No active chat to send invite to');
            return;
        }

        try {
            const messageData = {
                sId: userData.id,
                text: `Join our group "${currentGroup.groupData?.name}": ${groupInviteLink}`,
                createdAt: Date.now(),
                id: `${userData.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            
            await setDoc(doc(db, 'messages', messagesId), {
                messages: arrayUnion(messageData)
            }, { merge: true });
            
            // Update chat data for all participants
            const userIDs = chatUser.isGroup 
                ? (chatUser.groupData?.members || [])
                : [chatUser.rId, userData.id];
            
            userIDs.forEach(async (id) => {
                const userChatsRef = doc(db, 'chats', id);
                const userChatsSnapshot = await getDoc(userChatsRef);
                if (userChatsSnapshot.exists()) {
                    const userChatData = userChatsSnapshot.data();
                    const chatIndex = userChatData.chatData.findIndex((c) => c.messagesId === messagesId);
                    if (chatIndex !== -1) {
                        userChatData.chatData[chatIndex].lastMessage = `🔗 Group invite: ${currentGroup.groupData?.name}`;
                        userChatData.chatData[chatIndex].updatedAt = Date.now();
                        userChatData.chatData[chatIndex].updateAt = Date.now();
                        if (userChatData.chatData[chatIndex].rId === userData.id) {
                            userChatData.chatData[chatIndex].messageSeen = false;
                        }
                    }
                    
                    await setDoc(userChatsRef, {
                        chatData: userChatData.chatData
                    }, { merge: true });
                }
            });
            
            toast.success('Invite link sent to current chat!');
            setShowInviteLink(false);
            
        } catch (error) {
            console.error('Error sending invite to chat:', error);
            toast.error('Failed to send invite to chat');
        }
    };

    // Admin Management Functions
    const openMemberManagement = (group, event) => {
        event.stopPropagation();
        
        const isAdmin = group.groupData?.admins?.includes(userData.id) || 
                       group.groupData?.createdBy === userData.id;
        
        if (!isAdmin) {
            toast.error('Only group admins can manage members');
            return;
        }

        setCurrentGroup(group);
        setShowMemberManagement(true);
    };

    const promoteToAdmin = async (memberId, memberName) => {
        if (!currentGroup) return;
        
        try {
            const updatedAdmins = [...(currentGroup.groupData?.admins || []), memberId];
            const updatedGroupData = {
                ...currentGroup.groupData,
                admins: updatedAdmins,
                updatedAt: Date.now(),
                updatedBy: userData.id
            };

            // Update group data for all members
            const allMembers = currentGroup.groupData?.members || [];
            for (const member of allMembers) {
                const userChatsRef = doc(db, 'chats', member);
                const userChatsSnapshot = await getDoc(userChatsRef);
                
                if (userChatsSnapshot.exists()) {
                    const userChatData = userChatsSnapshot.data();
                    const updatedChatData = userChatData.chatData.map(chat => {
                        if (chat.messagesId === currentGroup.messagesId) {
                            return { ...chat, groupData: updatedGroupData };
                        }
                        return chat;
                    });
                    
                    await updateDoc(userChatsRef, { chatData: updatedChatData });
                }
            }

            // Add system message
            const messagesRef = doc(db, 'messages', currentGroup.messagesId);
            const messagesSnapshot = await getDoc(messagesRef);
            
            if (messagesSnapshot.exists()) {
                const messagesData = messagesSnapshot.data();
                const systemMessage = {
                    sId: 'system',
                    text: `${userData.name} promoted ${memberName} to admin`,
                    createdAt: Date.now(),
                    type: 'system',
                    id: `system_${Date.now()}`
                };
                
                await updateDoc(messagesRef, {
                    messages: [...(messagesData.messages || []), systemMessage]
                });
            }

            toast.success(`${memberName} promoted to admin`);
            
        } catch (error) {
            console.error('Error promoting to admin:', error);
            toast.error('Failed to promote member');
        }
    };

    const removeAdmin = async (memberId, memberName) => {
        if (!currentGroup) return;
        
        // Can't remove the creator
        if (memberId === currentGroup.groupData?.createdBy) {
            toast.error('Cannot remove creator admin status');
            return;
        }
        
        try {
            const updatedAdmins = (currentGroup.groupData?.admins || []).filter(id => id !== memberId);
            const updatedGroupData = {
                ...currentGroup.groupData,
                admins: updatedAdmins,
                updatedAt: Date.now(),
                updatedBy: userData.id
            };

            // Update group data for all members
            const allMembers = currentGroup.groupData?.members || [];
            for (const member of allMembers) {
                const userChatsRef = doc(db, 'chats', member);
                const userChatsSnapshot = await getDoc(userChatsRef);
                
                if (userChatsSnapshot.exists()) {
                    const userChatData = userChatsSnapshot.data();
                    const updatedChatData = userChatData.chatData.map(chat => {
                        if (chat.messagesId === currentGroup.messagesId) {
                            return { ...chat, groupData: updatedGroupData };
                        }
                        return chat;
                    });
                    
                    await updateDoc(userChatsRef, { chatData: updatedChatData });
                }
            }

            // Add system message
            const messagesRef = doc(db, 'messages', currentGroup.messagesId);
            const messagesSnapshot = await getDoc(messagesRef);
            
            if (messagesSnapshot.exists()) {
                const messagesData = messagesSnapshot.data();
                const systemMessage = {
                    sId: 'system',
                    text: `${userData.name} removed ${memberName} from admin`,
                    createdAt: Date.now(),
                    type: 'system',
                    id: `system_${Date.now()}`
                };
                
                await updateDoc(messagesRef, {
                    messages: [...(messagesData.messages || []), systemMessage]
                });
            }

            toast.success(`${memberName} removed from admin`);
            
        } catch (error) {
            console.error('Error removing admin:', error);
            toast.error('Failed to remove admin');
        }
    };

    const removeMember = async (memberId, memberName) => {
        if (!currentGroup) return;
        
        // Can't remove the creator
        if (memberId === currentGroup.groupData?.createdBy) {
            toast.error('Cannot remove group creator');
            return;
        }
        
        if (window.confirm(`Remove ${memberName} from the group?`)) {
            try {
                const updatedMembers = (currentGroup.groupData?.members || []).filter(id => id !== memberId);
                const updatedAdmins = (currentGroup.groupData?.admins || []).filter(id => id !== memberId);
                
                const updatedGroupData = {
                    ...currentGroup.groupData,
                    members: updatedMembers,
                    admins: updatedAdmins,
                    updatedAt: Date.now(),
                    updatedBy: userData.id
                };

                // Remove group from removed member's chat list
                const userChatsRef = doc(db, 'chats', memberId);
                const userChatsSnapshot = await getDoc(userChatsRef);
                
                if (userChatsSnapshot.exists()) {
                    const userChatData = userChatsSnapshot.data();
                    const updatedChatData = userChatData.chatData.filter(
                        chat => chat.messagesId !== currentGroup.messagesId
                    );
                    
                    await updateDoc(userChatsRef, { chatData: updatedChatData });
                }

                // Update group data for remaining members
                for (const member of updatedMembers) {
                    const memberChatsRef = doc(db, 'chats', member);
                    const memberChatsSnapshot = await getDoc(memberChatsRef);
                    
                    if (memberChatsSnapshot.exists()) {
                        const memberChatData = memberChatsSnapshot.data();
                        const updatedChatData = memberChatData.chatData.map(chat => {
                            if (chat.messagesId === currentGroup.messagesId) {
                                return { ...chat, groupData: updatedGroupData };
                            }
                            return chat;
                        });
                        
                        await updateDoc(memberChatsRef, { chatData: updatedChatData });
                    }
                }

                // Add system message
                const messagesRef = doc(db, 'messages', currentGroup.messagesId);
                const messagesSnapshot = await getDoc(messagesRef);
                
                if (messagesSnapshot.exists()) {
                    const messagesData = messagesSnapshot.data();
                    const systemMessage = {
                        sId: 'system',
                        text: `${userData.name} removed ${memberName} from the group`,
                        createdAt: Date.now(),
                        type: 'system',
                        id: `system_${Date.now()}`
                    };
                    
                    await updateDoc(messagesRef, {
                        messages: [...(messagesData.messages || []), systemMessage]
                    });
                }

                toast.success(`${memberName} removed from group`);
                
            } catch (error) {
                console.error('Error removing member:', error);
                toast.error('Failed to remove member');
            }
        }
    };

    const handleGroupAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    toast.error('Image size should be less than 5MB');
                    return;
                }
                setEditGroupAvatar(file);
            } else {
                toast.error('Please select an image file');
            }
        }
    };

    const removeGroupAvatar = () => {
        setEditGroupAvatar('remove');
    };

    const cancelGroupAvatarRemoval = () => {
        setEditGroupAvatar(null);
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
                            <p onClick={() => setShowGroupsManager(true)} className="groups-menu-item">👥 Groups</p>
                            <hr />
                            <p onClick={refreshChatData}>Refresh Chats</p>
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
                                        src={
                                            editImage === 'remove' 
                                                ? assets.avatar_icon 
                                                : editImage && editImage !== 'remove' 
                                                    ? URL.createObjectURL(editImage) 
                                                    : (userData?.avatar || assets.avatar_icon)
                                        } 
                                        alt="Profile" 
                                    />
                                    <div>
                                        <input 
                                            type="file" 
                                            id="editProfileImage" 
                                            accept="image/*" 
                                            onChange={handleImageChange}
                                            hidden 
                                        />
                                        <label htmlFor="editProfileImage" className="change-photo-btn">
                                            📷 {userData?.avatar ? 'Change Photo' : 'Add Photo'}
                                        </label>
                                        {(userData?.avatar || editImage) && editImage !== 'remove' && (
                                            <button 
                                                type="button"
                                                className="remove-photo-btn"
                                                onClick={removeProfileImage}
                                            >
                                                🗑️ Remove
                                            </button>
                                        )}
                                        {editImage === 'remove' && (
                                            <button 
                                                type="button"
                                                className="change-photo-btn"
                                                onClick={cancelImageRemoval}
                                                style={{marginLeft: '8px', background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'}}
                                            >
                                                ↶ Undo Remove
                                            </button>
                                        )}
                                    </div>
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

                {/* Create Group Modal */}
                {showCreateGroup && (
                    <div className="profile-info-overlay" onClick={() => setShowCreateGroup(false)}>
                        <div className="profile-info-modal create-group-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="profile-info-header create-group-header">
                                <div className="header-content">
                                    <span className="group-icon-large">👥</span>
                                    <h3>Create New Group</h3>
                                </div>
                                <button className="close-btn" onClick={() => setShowCreateGroup(false)}>×</button>
                            </div>
                            <div className="profile-info-content">
                                <div className="group-form">
                                    <div className="form-section">
                                        <h4 className="section-title">�️G Group Avatar (Optional)</h4>
                                        <div className="group-avatar-section">
                                            <img 
                                                src={
                                                    groupAvatar === 'remove' 
                                                        ? assets.avatar_icon 
                                                        : groupAvatar && groupAvatar !== 'remove' 
                                                            ? URL.createObjectURL(groupAvatar) 
                                                            : assets.avatar_icon
                                                } 
                                                alt="Group Avatar" 
                                                className="group-avatar-preview"
                                            />
                                            <div>
                                                <input 
                                                    type="file" 
                                                    id="createGroupAvatar" 
                                                    accept="image/*" 
                                                    onChange={handleCreateGroupAvatarChange}
                                                    hidden 
                                                />
                                                <label htmlFor="createGroupAvatar" className="change-photo-btn">
                                                    📷 {groupAvatar && groupAvatar !== 'remove' ? 'Change Photo' : 'Add Photo'}
                                                </label>
                                                {groupAvatar && groupAvatar !== 'remove' && (
                                                    <button 
                                                        type="button"
                                                        className="remove-photo-btn"
                                                        onClick={removeCreateGroupAvatar}
                                                    >
                                                        🗑️ Remove
                                                    </button>
                                                )}
                                                {groupAvatar === 'remove' && (
                                                    <button 
                                                        type="button"
                                                        className="change-photo-btn"
                                                        onClick={cancelCreateGroupAvatarRemoval}
                                                        style={{marginLeft: '8px', background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'}}
                                                    >
                                                        ↶ Undo Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-section">
                                        <h4 className="section-title">📝 Group Details</h4>
                                        <div className="form-group">
                                            <label>Group Name *</label>
                                            <input 
                                                type="text" 
                                                value={groupName}
                                                onChange={(e) => setGroupName(e.target.value)}
                                                placeholder="Enter a catchy group name..."
                                                maxLength={50}
                                                className="group-name-input"
                                            />
                                            <small className="char-count">{groupName.length}/50</small>
                                        </div>
                                        <div className="form-group">
                                            <label>Description (Optional)</label>
                                            <textarea 
                                                value={groupDescription}
                                                onChange={(e) => setGroupDescription(e.target.value)}
                                                placeholder="What's this group about? Add a description..."
                                                maxLength={200}
                                                rows={3}
                                                className="group-description-input"
                                            />
                                            <small className="char-count">{groupDescription.length}/200</small>
                                        </div>
                                    </div>
                                    
                                    <div className="form-section">
                                        <h4 className="section-title">
                                            👥 Add Members 
                                            <span className="member-count-badge">
                                                {selectedMembers.length} selected
                                            </span>
                                        </h4>
                                        <div className="members-list">
                                            {chatData && chatData.filter(item => item.userData && !item.isGroup).length > 0 ? (
                                                chatData.filter(item => item.userData && !item.isGroup).map((contact, index) => (
                                                    <div 
                                                        key={index} 
                                                        className={`member-item ${selectedMembers.some(member => member.rId === contact.rId) ? 'selected' : ''}`}
                                                        onClick={() => toggleMemberSelection(contact)}
                                                    >
                                                        <div className="member-avatar">
                                                            <img 
                                                                src={contact.userData?.avatar || assets.avatar_icon} 
                                                                alt="" 
                                                                onError={(e) => { e.target.src = assets.avatar_icon; }}
                                                            />
                                                            {contact.userData && Date.now() - contact.userData.lastSeen <= 70000 && (
                                                                <div className="online-dot"></div>
                                                            )}
                                                        </div>
                                                        <div className="member-info">
                                                            <p className="member-name">{contact.userData?.name || 'Loading...'}</p>
                                                            <span className="member-username">@{contact.userData?.username}</span>
                                                            {contact.userData && Date.now() - contact.userData.lastSeen <= 70000 && (
                                                                <span className="member-status online">🟢 Online</span>
                                                            )}
                                                        </div>
                                                        <div className="member-checkbox">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedMembers.some(member => member.rId === contact.rId)}
                                                                readOnly
                                                            />
                                                            <span className="checkmark">✓</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="no-contacts">
                                                    <p>📭 No contacts available</p>
                                                    <small>Add some friends first to create a group!</small>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="profile-actions group-actions">
                                    <button 
                                        className="cancel-btn" 
                                        onClick={() => setShowCreateGroup(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="save-btn create-group-submit" 
                                        onClick={createGroup}
                                        disabled={!groupName.trim() || selectedMembers.length === 0}
                                    >
                                        <span className="btn-icon">🚀</span>
                                        Create Group
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Group Settings Modal */}
                {showGroupSettings && currentGroup && (
                    <div className="profile-info-overlay" onClick={() => setShowGroupSettings(false)}>
                        <div className="profile-info-modal group-settings-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="profile-info-header group-settings-header">
                                <div className="header-content">
                                    <span className="group-icon-large">⚙️</span>
                                    <h3>Group Settings</h3>
                                </div>
                                <button className="close-btn" onClick={() => setShowGroupSettings(false)}>×</button>
                            </div>
                            <div className="profile-info-content">
                                <div className="group-avatar-section">
                                    <img 
                                        src={
                                            editGroupAvatar === 'remove' 
                                                ? assets.avatar_icon 
                                                : editGroupAvatar && editGroupAvatar !== 'remove' 
                                                    ? URL.createObjectURL(editGroupAvatar) 
                                                    : (currentGroup.groupData?.avatar || assets.avatar_icon)
                                        } 
                                        alt="Group Avatar" 
                                        className="group-avatar-preview"
                                    />
                                    <div>
                                        <input 
                                            type="file" 
                                            id="editGroupAvatar" 
                                            accept="image/*" 
                                            onChange={handleGroupAvatarChange}
                                            hidden 
                                        />
                                        <label htmlFor="editGroupAvatar" className="change-photo-btn">
                                            📷 {currentGroup.groupData?.avatar ? 'Change Group Photo' : 'Add Group Photo'}
                                        </label>
                                        {(currentGroup.groupData?.avatar || editGroupAvatar) && editGroupAvatar !== 'remove' && (
                                            <button 
                                                type="button"
                                                className="remove-photo-btn"
                                                onClick={removeGroupAvatar}
                                            >
                                                🗑️ Remove
                                            </button>
                                        )}
                                        {editGroupAvatar === 'remove' && (
                                            <button 
                                                type="button"
                                                className="change-photo-btn"
                                                onClick={cancelGroupAvatarRemoval}
                                                style={{marginLeft: '8px', background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'}}
                                            >
                                                ↶ Undo Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="group-form">
                                    <div className="form-section">
                                        <h4 className="section-title">📝 Group Information</h4>
                                        <div className="form-group">
                                            <label>Group Name *</label>
                                            <input 
                                                type="text" 
                                                value={editGroupName}
                                                onChange={(e) => setEditGroupName(e.target.value)}
                                                placeholder="Enter group name..."
                                                maxLength={50}
                                                className="group-name-input"
                                            />
                                            <small className="char-count">{editGroupName.length}/50</small>
                                        </div>
                                        <div className="form-group">
                                            <label>Description</label>
                                            <textarea 
                                                value={editGroupDescription}
                                                onChange={(e) => setEditGroupDescription(e.target.value)}
                                                placeholder="What's this group about?"
                                                maxLength={200}
                                                rows={3}
                                                className="group-description-input"
                                            />
                                            <small className="char-count">{editGroupDescription.length}/200</small>
                                        </div>
                                    </div>
                                    
                                    <div className="form-section">
                                        <h4 className="section-title">
                                            👥 Group Members 
                                            <span className="member-count-badge">
                                                {currentGroup.groupData?.members?.length || 0} members
                                            </span>
                                        </h4>
                                        <div className="group-info-stats">
                                            <div className="stat-item">
                                                <span className="stat-label">Created by:</span>
                                                <span className="stat-value">
                                                    {currentGroup.groupData?.createdBy === userData.id ? 'You' : 'Admin'}
                                                </span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Created on:</span>
                                                <span className="stat-value">
                                                    {currentGroup.groupData?.createdAt 
                                                        ? new Date(currentGroup.groupData.createdAt).toLocaleDateString()
                                                        : 'Unknown'
                                                    }
                                                </span>
                                            </div>
                                            {currentGroup.groupData?.updatedAt && (
                                                <div className="stat-item">
                                                    <span className="stat-label">Last updated:</span>
                                                    <span className="stat-value">
                                                        {new Date(currentGroup.groupData.updatedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="profile-actions group-actions">
                                    <button 
                                        className="cancel-btn" 
                                        onClick={() => setShowGroupSettings(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="save-btn" 
                                        onClick={updateGroupProfile}
                                        disabled={isUpdatingGroup || !editGroupName.trim()}
                                    >
                                        {isUpdatingGroup ? 'Updating...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Members Modal */}
                {showAddMembers && currentGroup && (
                    <div className="profile-info-overlay" onClick={() => setShowAddMembers(false)}>
                        <div className="profile-info-modal add-members-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="profile-info-header add-members-header">
                                <div className="header-content">
                                    <span className="group-icon-large">👥</span>
                                    <h3>Add Members to "{currentGroup.groupData?.name}"</h3>
                                </div>
                                <button className="close-btn" onClick={() => setShowAddMembers(false)}>×</button>
                            </div>
                            <div className="profile-info-content">
                                <div className="form-section">
                                    <h4 className="section-title">
                                        👥 Select Members to Add
                                        <span className="member-count-badge">
                                            {selectedMembers.length} selected
                                        </span>
                                    </h4>
                                    <div className="members-list">
                                        {chatData && chatData.filter(item => 
                                            item.userData && 
                                            !item.isGroup && 
                                            !currentGroup.groupData?.members?.includes(item.rId)
                                        ).length > 0 ? (
                                            chatData.filter(item => 
                                                item.userData && 
                                                !item.isGroup && 
                                                !currentGroup.groupData?.members?.includes(item.rId)
                                            ).map((contact, index) => (
                                                <div 
                                                    key={index} 
                                                    className={`member-item ${selectedMembers.some(member => member.rId === contact.rId) ? 'selected' : ''}`}
                                                    onClick={() => toggleMemberSelection(contact)}
                                                >
                                                    <div className="member-avatar">
                                                        <img 
                                                            src={contact.userData?.avatar || assets.avatar_icon} 
                                                            alt="" 
                                                            onError={(e) => { e.target.src = assets.avatar_icon; }}
                                                        />
                                                        {contact.userData && Date.now() - contact.userData.lastSeen <= 70000 && (
                                                            <div className="online-dot"></div>
                                                        )}
                                                    </div>
                                                    <div className="member-info">
                                                        <p className="member-name">{contact.userData?.name || 'Loading...'}</p>
                                                        <span className="member-username">@{contact.userData?.username}</span>
                                                        {contact.userData && Date.now() - contact.userData.lastSeen <= 70000 && (
                                                            <span className="member-status online">🟢 Online</span>
                                                        )}
                                                    </div>
                                                    <div className="member-checkbox">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedMembers.some(member => member.rId === contact.rId)}
                                                            readOnly
                                                        />
                                                        <span className="checkmark">✓</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-contacts">
                                                <p>📭 No new members to add</p>
                                                <small>All your contacts are already in this group!</small>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="profile-actions group-actions">
                                    <button 
                                        className="cancel-btn" 
                                        onClick={() => setShowAddMembers(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="save-btn add-members-submit" 
                                        onClick={addMembersToGroup}
                                        disabled={selectedMembers.length === 0}
                                    >
                                        <span className="btn-icon">➕</span>
                                        Add {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Groups Manager Modal */}
                {showGroupsManager && (
                    <div className="profile-info-overlay" onClick={() => setShowGroupsManager(false)}>
                        <div className="profile-info-modal groups-manager-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="profile-info-header groups-manager-header">
                                <div className="header-content">
                                    <span className="group-icon-large">👥</span>
                                    <h3>Groups Manager</h3>
                                </div>
                                <button className="close-btn" onClick={() => setShowGroupsManager(false)}>×</button>
                            </div>
                            <div className="profile-info-content">
                                {/* Create New Group Section */}
                                <div className="form-section">
                                    <div className="section-header">
                                        <h4 className="section-title">🆕 Create New Group</h4>
                                        <button 
                                            className="create-group-btn-inline"
                                            onClick={() => {
                                                setShowGroupsManager(false);
                                                handleCreateGroup();
                                            }}
                                        >
                                            ➕ Create Group
                                        </button>
                                    </div>
                                </div>

                                {/* My Groups Section */}
                                <div className="form-section">
                                    <h4 className="section-title">
                                        📋 My Groups 
                                        <span className="member-count-badge">
                                            {chatData ? chatData.filter(item => item.isGroup).length : 0} groups
                                        </span>
                                    </h4>
                                    <div className="groups-list">
                                        {chatData && chatData.filter(item => item.isGroup).length > 0 ? (
                                            chatData.filter(item => item.isGroup).map((group, index) => {
                                                const isAdmin = group.groupData?.createdBy === userData.id || 
                                                               group.groupData?.admins?.includes(userData.id);
                                                return (
                                                    <div key={index} className="group-item">
                                                        <div className="group-avatar">
                                                            <img 
                                                                src={group.groupData?.avatar || assets.avatar_icon} 
                                                                alt="" 
                                                                onError={(e) => { e.target.src = assets.avatar_icon; }}
                                                            />
                                                            <div className="group-indicator-small">👥</div>
                                                        </div>
                                                        <div className="group-info">
                                                            <div className="group-name-row">
                                                                <p className="group-name">{group.groupData?.name || 'Unnamed Group'}</p>
                                                                {isAdmin && <span className="admin-badge-small">Admin</span>}
                                                            </div>
                                                            <span className="group-members">
                                                                {group.groupData?.members?.length || 0} members
                                                            </span>
                                                            {group.groupData?.description && (
                                                                <span className="group-description">
                                                                    {group.groupData.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isAdmin && (
                                                            <div className="group-actions">
                                                                <button 
                                                                    className="group-action-btn invite-btn"
                                                                    onClick={() => showGroupInviteLink(group)}
                                                                    title="Show Invite Link"
                                                                >
                                                                    🔗
                                                                </button>
                                                                <button 
                                                                    className="group-action-btn members-btn"
                                                                    onClick={(e) => openMemberManagement(group, e)}
                                                                    title="Manage Members"
                                                                >
                                                                    👤
                                                                </button>
                                                                <button 
                                                                    className="group-action-btn add-members-btn"
                                                                    onClick={() => {
                                                                        setShowGroupsManager(false);
                                                                        openAddMembers(group, { stopPropagation: () => {} });
                                                                    }}
                                                                    title="Add Members"
                                                                >
                                                                    👥
                                                                </button>
                                                                <button 
                                                                    className="group-action-btn edit-group-btn"
                                                                    onClick={() => {
                                                                        setShowGroupsManager(false);
                                                                        openGroupSettings(group, { stopPropagation: () => {} });
                                                                    }}
                                                                    title="Group Settings"
                                                                >
                                                                    ⚙️
                                                                </button>
                                                                <button 
                                                                    className="group-action-btn delete-group-btn"
                                                                    onClick={() => {
                                                                        setShowGroupsManager(false);
                                                                        deleteGroup(group, { stopPropagation: () => {} });
                                                                    }}
                                                                    title="Delete Group"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="no-groups">
                                                <p>📭 No groups yet</p>
                                                <small>Create your first group to get started!</small>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Invite Link Modal */}
                {showInviteLink && currentGroup && (
                    <div className="profile-info-overlay" onClick={() => setShowInviteLink(false)}>
                        <div className="profile-info-modal invite-link-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="profile-info-header invite-link-header">
                                <div className="header-content">
                                    <span className="group-icon-large">🔗</span>
                                    <h3>Invite to "{currentGroup.groupData?.name}"</h3>
                                </div>
                                <button className="close-btn" onClick={() => setShowInviteLink(false)}>×</button>
                            </div>
                            <div className="profile-info-content">
                                <div className="form-section">
                                    <h4 className="section-title">📋 Share Invite Link</h4>
                                    <p className="invite-description">
                                        Share this link with friends to invite them to join your group. 
                                        The link will expire in 7 days.
                                    </p>
                                    
                                    <div className="invite-link-container">
                                        <input 
                                            type="text" 
                                            value={groupInviteLink}
                                            readOnly
                                            className="invite-link-input"
                                        />
                                        <button 
                                            className="copy-link-btn"
                                            onClick={copyInviteLink}
                                        >
                                            📋 Copy
                                        </button>
                                        {chatUser && messagesId && (
                                            <button 
                                                className="send-to-chat-btn"
                                                onClick={sendInviteToCurrentChat}
                                                title={`Send invite to ${chatUser.isGroup ? chatUser.groupData?.name : chatUser.userData?.name}`}
                                            >
                                                💬 Send to Current Chat
                                            </button>
                                        )}
                                        <button 
                                            className="test-link-btn"
                                            onClick={() => {
                                                const inviteCode = groupInviteLink.split('/join-group/')[1];
                                                if (inviteCode) {
                                                    window.open(`/join-group/${inviteCode}`, '_blank');
                                                }
                                            }}
                                        >
                                            🔗 Test
                                        </button>
                                    </div>
                                    
                                    <div className="share-options">
                                        <h5>Quick Share:</h5>
                                        <div className="share-buttons">
                                            <button 
                                                className="share-btn whatsapp"
                                                onClick={() => window.open(`https://wa.me/?text=Join our group: ${encodeURIComponent(groupInviteLink)}`, '_blank')}
                                            >
                                                💬 WhatsApp
                                            </button>
                                            <button 
                                                className="share-btn telegram"
                                                onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(groupInviteLink)}&text=Join our group`, '_blank')}
                                            >
                                                ✈️ Telegram
                                            </button>
                                            <button 
                                                className="share-btn email"
                                                onClick={() => window.open(`mailto:?subject=Join our group&body=Join our group: ${encodeURIComponent(groupInviteLink)}`, '_blank')}
                                            >
                                                📧 Email
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Member Management Modal */}
                {showMemberManagement && currentGroup && (
                    <div className="profile-info-overlay" onClick={() => setShowMemberManagement(false)}>
                        <div className="profile-info-modal member-management-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="profile-info-header member-management-header">
                                <div className="header-content">
                                    <span className="group-icon-large">👤</span>
                                    <h3>Manage "{currentGroup.groupData?.name}"</h3>
                                </div>
                                <button className="close-btn" onClick={() => setShowMemberManagement(false)}>×</button>
                            </div>
                            <div className="profile-info-content">
                                <div className="form-section">
                                    <h4 className="section-title">
                                        👥 Group Members 
                                        <span className="member-count-badge">
                                            {currentGroup.groupData?.members?.length || 0} members
                                        </span>
                                    </h4>
                                    <div className="members-management-list">
                                        {currentGroup.groupData?.members?.map((memberId, index) => {
                                            // Get member data from chatData
                                            const memberData = chatData?.find(item => 
                                                item.userData && item.rId === memberId
                                            )?.userData;
                                            
                                            const isCreator = memberId === currentGroup.groupData?.createdBy;
                                            const isAdmin = currentGroup.groupData?.admins?.includes(memberId);
                                            const isCurrentUser = memberId === userData.id;
                                            
                                            return (
                                                <div key={index} className="member-management-item">
                                                    <div className="member-avatar">
                                                        <img 
                                                            src={memberData?.avatar || assets.avatar_icon} 
                                                            alt="" 
                                                            onError={(e) => { e.target.src = assets.avatar_icon; }}
                                                        />
                                                        {memberData && Date.now() - memberData.lastSeen <= 70000 && (
                                                            <div className="online-dot"></div>
                                                        )}
                                                    </div>
                                                    <div className="member-info">
                                                        <p className="member-name">
                                                            {memberData?.name || 'Unknown User'}
                                                            {isCurrentUser && ' (You)'}
                                                        </p>
                                                        <span className="member-username">@{memberData?.username || 'unknown'}</span>
                                                        <div className="member-badges">
                                                            {isCreator && <span className="creator-badge">Creator</span>}
                                                            {isAdmin && !isCreator && <span className="admin-badge-small">Admin</span>}
                                                        </div>
                                                    </div>
                                                    {!isCurrentUser && (
                                                        <div className="member-actions">
                                                            {!isCreator && (
                                                                <>
                                                                    {!isAdmin ? (
                                                                        <button 
                                                                            className="member-action-btn promote-btn"
                                                                            onClick={() => promoteToAdmin(memberId, memberData?.name || 'Unknown')}
                                                                            title="Promote to Admin"
                                                                        >
                                                                            ⬆️
                                                                        </button>
                                                                    ) : (
                                                                        <button 
                                                                            className="member-action-btn demote-btn"
                                                                            onClick={() => removeAdmin(memberId, memberData?.name || 'Unknown')}
                                                                            title="Remove Admin"
                                                                        >
                                                                            ⬇️
                                                                        </button>
                                                                    )}
                                                                    <button 
                                                                        className="member-action-btn remove-btn"
                                                                        onClick={() => removeMember(memberId, memberData?.name || 'Unknown')}
                                                                        title="Remove Member"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                                            <div onClick={()=>handleChatClick(item)} className={`friends ${chatUser && chatUser.messagesId === safeItem.messagesId ? 'active' : ''} ${!safeItem.messageSeen ? 'unread' : ''} ${safeItem.userData && Date.now() - safeItem.userData.lastSeen <= 70000 ? 'online-user' : ''}`} key={index}>
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
                            chatData.map((item, index) => {
                                // Handle both groups and individual chats
                                const safeItem = {
                                    messagesId: item.messagesId || '',
                                    lastMessage: item.lastMessage || 'No messages yet',
                                    messageSeen: item.messageSeen !== false,
                                    rId: item.rId || '',
                                    userData: item.userData || null,
                                    isGroup: item.isGroup || false,
                                    groupData: item.groupData || null
                                };

                                const avatar = safeItem.isGroup 
                                    ? (safeItem.groupData?.avatar || assets.avatar_icon)
                                    : (safeItem.userData?.avatar || assets.avatar_icon);
                                const name = safeItem.isGroup 
                                    ? (safeItem.groupData?.name || 'Group')
                                    : (safeItem.userData?.name || 'Loading...');

                                return (
                                    <div 
                                        onClick={() => handleChatClick(item)} 
                                        className={`friends ${chatUser && chatUser.messagesId === safeItem.messagesId ? 'active' : ''} ${!safeItem.messageSeen ? 'unread' : ''} ${!safeItem.isGroup && safeItem.userData && Date.now() - safeItem.userData.lastSeen <= 70000 ? 'online-user' : ''} ${safeItem.isGroup ? 'group-chat' : ''}`} 
                                        key={index}
                                    >
                                        <div className="friend-avatar">
                                            <img 
                                                src={avatar} 
                                                alt="" 
                                                onError={(e) => {
                                                    e.target.src = assets.avatar_icon;
                                                }} 
                                            />
                                            {/* Show online dot only for individual users, not groups */}
                                            {!safeItem.isGroup && safeItem.userData && Date.now() - safeItem.userData.lastSeen <= 70000 && (
                                                <div className="online-dot"></div>
                                            )}
                                            {/* Show group indicator */}
                                            {safeItem.isGroup && (
                                                <div className="group-indicator">👥</div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="friend-name-status">
                                                <p>{name}</p>
                                                {safeItem.isGroup ? (
                                                    <span className="group-badge">👥</span>
                                                ) : (
                                                    safeItem.userData && Date.now() - safeItem.userData.lastSeen <= 70000 ? (
                                                        <span className="online-badge">Online</span>
                                                    ) : (
                                                        <span className="offline-badge">Offline</span>
                                                    )
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
                                                title="Options"
                                            >
                                                ⋮
                                            </button>
                                            {activeDropdown === safeItem.messagesId && (
                                                <div className="dropdown-menu">
                                                    {safeItem.isGroup ? (
                                                        // Group options - simplified
                                                        <button 
                                                            className="dropdown-item remove"
                                                            onClick={(e) => {
                                                                removeContact(item, e);
                                                                setActiveDropdown(null);
                                                            }}
                                                        >
                                                            🚪 Leave Group
                                                        </button>
                                                    ) : (
                                                        // Individual chat options
                                                        <>
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
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-chats-message">
                                <p>No chats yet. Search for users to start chatting or create a group from the menu!</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}

export default LeftSidebar