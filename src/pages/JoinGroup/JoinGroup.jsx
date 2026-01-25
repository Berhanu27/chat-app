import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../../config/Firebase';
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';
import assets from '../../assets/assets';
import './JoinGroup.css';

const JoinGroup = () => {
    const { inviteCode } = useParams();
    const navigate = useNavigate();
    const { userData } = useContext(AppContext);
    const [inviteData, setInviteData] = useState(null);
    const [groupData, setGroupData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log('JoinGroup component mounted');
        console.log('Invite code from URL:', inviteCode);
        console.log('Current user data:', userData);
        console.log('Current location:', window.location.href);
        console.log('Current pathname:', window.location.pathname);
    }, [inviteCode, userData]);

    useEffect(() => {
        const loadGroupData = async () => {
            try {
                console.log('=== LOADING GROUP DATA ===');
                console.log('Group ID from URL:', inviteCode);
                console.log('User data available:', !!userData);
                console.log('User ID:', userData?.id);
                
                if (!inviteCode) {
                    console.log('No group ID provided');
                    setError('Invalid invite link - no group ID provided');
                    setLoading(false);
                    return;
                }
                
                // The inviteCode is actually the group's messagesId
                const groupId = inviteCode;
                
                // Find the group by looking through users' chat data
                // We'll check the creator's chat data first, then expand if needed
                console.log('Looking for group with ID:', groupId);
                
                // For now, let's create a simple approach - store group info in a separate collection
                // when groups are created, then read from there
                const groupRef = doc(db, 'groups', groupId);
                console.log('Checking group ref:', groupRef.path);
                
                const groupSnap = await getDoc(groupRef);
                console.log('Group snapshot exists:', groupSnap.exists());
                
                if (groupSnap.exists()) {
                    const group = groupSnap.data();
                    console.log('Group data found:', group);
                    setGroupData(group);
                } else {
                    console.log('Group not found');
                    setError('Group not found or invite link is invalid');
                }
                
            } catch (error) {
                console.error('Error loading group:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                
                if (error.code === 'permission-denied') {
                    setError('Permission denied. Please make sure you are logged in.');
                } else if (error.code === 'unavailable') {
                    setError('Service temporarily unavailable. Please try again later.');
                } else {
                    setError(`Failed to load group information: ${error.message}`);
                }
            } finally {
                setLoading(false);
            }
        };

        if (inviteCode) {
            loadGroupData();
        } else {
            console.log('No invite code provided');
            setError('Invalid invite link');
            setLoading(false);
        }
    }, [inviteCode]);

    const joinGroup = async () => {
        console.log('Join group function called');
        console.log('User data:', userData);
        console.log('Invite data:', inviteData);
        console.log('Group data:', groupData);
        
        if (!userData) {
            console.log('No user data, redirecting to login');
            toast.error('Please log in to join the group');
            navigate('/');
            return;
        }

        if (!inviteData || !groupData) {
            console.log('Missing invite or group data');
            toast.error('Invalid invite data');
            return;
        }

        // Check if user is already a member
        if (groupData.members?.includes(userData.id)) {
            console.log('User already a member');
            toast.info('You are already a member of this group');
            navigate('/chat');
            return;
        }

        setJoining(true);
        
        try {
            console.log('Starting join process...');
            
            // Add user to group members
            const updatedMembers = [...(groupData.members || []), userData.id];
            const updatedGroupData = {
                ...groupData,
                members: updatedMembers,
                updatedAt: Date.now()
            };
            
            console.log('Updated group data:', updatedGroupData);

            // Add group to new member's chat list
            console.log('Adding group to user chat list...');
            const userChatsRef = doc(db, 'chats', userData.id);
            const userChatsSnapshot = await getDoc(userChatsRef);
            
            if (userChatsSnapshot.exists()) {
                const userChatData = userChatsSnapshot.data();
                console.log('User chat data:', userChatData);
                
                const newGroupChat = {
                    messagesId: inviteData.groupId,
                    lastMessage: `${userData.name} joined the group`,
                    rId: inviteData.groupId,
                    updateAt: Date.now(),
                    updatedAt: Date.now(),
                    messageSeen: false,
                    isGroup: true,
                    groupData: updatedGroupData
                };
                
                console.log('New group chat object:', newGroupChat);
                
                const updatedChatData = [...(userChatData.chatData || []), newGroupChat];
                await updateDoc(userChatsRef, { chatData: updatedChatData });
                console.log('Updated user chat data successfully');
            } else {
                console.log('User chat document does not exist, creating...');
                await setDoc(userChatsRef, {
                    chatData: [{
                        messagesId: inviteData.groupId,
                        lastMessage: `${userData.name} joined the group`,
                        rId: inviteData.groupId,
                        updateAt: Date.now(),
                        updatedAt: Date.now(),
                        messageSeen: false,
                        isGroup: true,
                        groupData: updatedGroupData
                    }]
                });
            }

            // Update group data for all existing members
            console.log('Updating group data for existing members...');
            for (const memberId of groupData.members || []) {
                console.log('Updating member:', memberId);
                const memberChatsRef = doc(db, 'chats', memberId);
                const memberChatsSnapshot = await getDoc(memberChatsRef);
                
                if (memberChatsSnapshot.exists()) {
                    const memberChatData = memberChatsSnapshot.data();
                    const updatedChatData = memberChatData.chatData.map(chat => {
                        if (chat.messagesId === inviteData.groupId) {
                            return {
                                ...chat,
                                groupData: updatedGroupData,
                                lastMessage: `${userData.name} joined the group`,
                                updatedAt: Date.now(),
                                messageSeen: memberId === userData.id
                            };
                        }
                        return chat;
                    });
                    
                    await updateDoc(memberChatsRef, { chatData: updatedChatData });
                    console.log('Updated member chat data for:', memberId);
                }
            }

            // Add system message to group chat
            console.log('Adding system message...');
            const messagesRef = doc(db, 'messages', inviteData.groupId);
            const messagesSnapshot = await getDoc(messagesRef);
            
            if (messagesSnapshot.exists()) {
                const messagesData = messagesSnapshot.data();
                const systemMessage = {
                    sId: 'system',
                    text: `${userData.name} joined the group via invite link`,
                    createdAt: Date.now(),
                    type: 'system',
                    id: `system_${Date.now()}`
                };
                
                await updateDoc(messagesRef, {
                    messages: [...(messagesData.messages || []), systemMessage]
                });
                console.log('Added system message successfully');
            }

            console.log('Join process completed successfully');
            toast.success(`Successfully joined "${groupData.name}"!`);
            navigate('/chat');
            
        } catch (error) {
            console.error('Error joining group:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            if (error.code === 'permission-denied') {
                toast.error('Permission denied. You may not have access to join this group.');
            } else if (error.code === 'unavailable') {
                toast.error('Service temporarily unavailable. Please try again later.');
            } else {
                toast.error(`Failed to join group: ${error.message}`);
            }
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="join-group-container">
                <div className="join-group-card">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>Loading invite...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="join-group-container">
                <div className="join-group-card error-card">
                    <div className="error-content">
                        <div className="error-icon">❌</div>
                        <h2>Invite Error</h2>
                        <p>{error}</p>
                        <button 
                            className="back-btn"
                            onClick={() => navigate('/')}
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="join-group-container">
            <div className="join-group-card">
                <div className="group-invite-header">
                    <h2>Group Invitation</h2>
                    <p>You've been invited to join a group</p>
                </div>
                
                <div className="group-preview">
                    <div className="group-avatar-large">
                        <img 
                            src={groupData?.avatar || assets.avatar_icon} 
                            alt="Group Avatar"
                            onError={(e) => { e.target.src = assets.avatar_icon; }}
                        />
                        <div className="group-indicator-large">👥</div>
                    </div>
                    
                    <div className="group-details">
                        <h3>{groupData?.name || 'Unknown Group'}</h3>
                        {groupData?.description && (
                            <p className="group-description">{groupData.description}</p>
                        )}
                        <div className="group-stats">
                            <span className="member-count">
                                👥 {groupData?.members?.length || 0} members
                            </span>
                            <span className="created-date">
                                📅 Created {groupData?.createdAt ? new Date(groupData.createdAt).toLocaleDateString() : 'Recently'}
                            </span>
                        </div>
                    </div>
                </div>

                {userData ? (
                    <div className="join-actions">
                        <p className="join-as">
                            Joining as: <strong>{userData.name}</strong> (@{userData.username})
                        </p>
                        <div className="action-buttons">
                            <button 
                                className="decline-btn"
                                onClick={() => navigate('/chat')}
                            >
                                Decline
                            </button>
                            <button 
                                className="join-btn"
                                onClick={joinGroup}
                                disabled={joining}
                            >
                                {joining ? 'Joining...' : 'Join Group'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="login-prompt">
                        <p>Please log in to join this group</p>
                        <button 
                            className="login-btn"
                            onClick={() => navigate('/')}
                        >
                            Go to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JoinGroup;