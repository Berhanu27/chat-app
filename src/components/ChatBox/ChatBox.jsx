import './ChatBox.css'
import assets from '../../assets/assets'
import { useContext, useEffect, useState, useRef } from 'react'
import { AppContext } from '../../context/AppContext'
import { arrayUnion, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../config/Firebase'
import { toast } from 'react-toastify'
import upload from '../../lib/upload'
import { playNotificationSound, requestNotificationPermission, showBrowserNotification } from '../../utils/sound'

// Download function for images and videos
const downloadMedia = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ChatBox = () => {
  const { userData, messagesId, chatUser, messages, setMessages, setChatVisible } = useContext(AppContext)
  const[input, setInput]=useState("");
  const[showContactInfo, setShowContactInfo]=useState(false);
  const messagesEndRef = useRef(null);
  const prevMessagesLength = useRef(0);
  
  // Delete message function
  const deleteMessage = async (messageToDelete) => {
    try {
      if (!messagesId || !messageToDelete) return;
      
      // Filter out the message to delete
      const updatedMessages = messages.filter(msg => 
        msg.id !== messageToDelete.id && 
        !(msg.sId === messageToDelete.sId && msg.createdAt === messageToDelete.createdAt)
      );
      
      // Update Firebase with the filtered messages
      await setDoc(doc(db, 'messages', messagesId), {
        messages: updatedMessages.map(msg => {
          const { id, ...messageWithoutId } = msg;
          return messageWithoutId;
        })
      });
      
      toast.success("Message deleted");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };
  const sendMessage = async () => {
    try {
      if (input && messagesId) {
        console.log("Sending message:", input, "to messagesId:", messagesId); // Debug log
        const messageData = {
          sId: userData.id,
          text: input,
          createdAt: Date.now(),
          id: `${userData.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        await setDoc(doc(db, 'messages', messagesId), {
          messages: arrayUnion(messageData)
        }, { merge: true })
        console.log("Message sent successfully"); // Debug log
        
        const userIDs = [chatUser.rId, userData.id];
        userIDs.forEach(async (id) => {
          const userChatsRef = doc(db, 'chats', id)
          const userChatsSnapshot = await getDoc(userChatsRef);
          if (userChatsSnapshot.exists()) {
            const userChatData = userChatsSnapshot.data();
            const chatIndex = userChatData.chatData.findIndex((c) => c.messagesId === messagesId)
            if (chatIndex !== -1) {
              userChatData.chatData[chatIndex].lastMessage = input.slice(0, 30);
              userChatData.chatData[chatIndex].updatedAt = Date.now();
              if (userChatData.chatData[chatIndex].rId === userData.id) {
                userChatData.chatData[chatIndex].messageSeen = false;
              }
            }
            
            await setDoc(userChatsRef, {
              chatData: userChatData.chatData
            }, { merge: true })
          }
          
        })
        
      
      }
    } catch (error) {
      toast.error(error.message)
    }
      setInput("");

  }
  const sendImage=async(e)=>{
    try {
      const file = e.target.files[0];
      if (!file) return;
      
      // Show loading toast
      const loadingToast = toast.loading(`Uploading ${file.type.startsWith('video/') ? 'video' : 'image'}...`);
      
      const uploadResult = await upload(file);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      if(uploadResult && messagesId){
        const messageData = {
          sId: userData.id,
          createdAt: Date.now(),
          id: `${userData.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        // Add appropriate field based on file type
        if (uploadResult.type === 'video') {
          messageData.video = uploadResult.url;
          messageData.videoFormat = uploadResult.format;
          messageData.videoDuration = uploadResult.duration;
        } else {
          messageData.image = uploadResult.url;
        }
        
         await setDoc(doc(db, 'messages', messagesId), {
          messages: arrayUnion(messageData)
        }, { merge: true })
        
          const userIDs = [chatUser.rId, userData.id];
        userIDs.forEach(async (id) => {
          const userChatsRef = doc(db, 'chats', id)
          const userChatsSnapshot = await getDoc(userChatsRef);
          if (userChatsSnapshot.exists()) {
            const userChatData = userChatsSnapshot.data();
            const chatIndex = userChatData.chatData.findIndex((c) => c.messagesId === messagesId)
            if (chatIndex !== -1) {
              userChatData.chatData[chatIndex].lastMessage = uploadResult.type === 'video' ? "Video" : "Image";
              userChatData.chatData[chatIndex].updatedAt = Date.now();
              if (userChatData.chatData[chatIndex].rId === userData.id) {
                userChatData.chatData[chatIndex].messageSeen = false;
              }
            }
            
            await setDoc(userChatsRef, {
              chatData: userChatData.chatData
            }, { merge: true })
          }
        })
        
        toast.success(`${uploadResult.type === 'video' ? 'Video' : 'Image'} uploaded successfully!`);
      } else {
        toast.error('Upload failed. Please try again.');
      }
      
      // Clear the input
      e.target.value = '';
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
      // Clear the input even on error
      e.target.value = '';
    }
  }

  const convertTimeStamp = (timestamp) => {
    let data;
    if (timestamp && typeof timestamp.toDate === 'function') {
      // Firebase Timestamp
      data = timestamp.toDate();
    } else if (timestamp && typeof timestamp === 'number') {
      // Regular timestamp number
      data = new Date(timestamp);
    } else if (timestamp && typeof timestamp === 'string') {
      // String timestamp
      data = new Date(timestamp);
    } else {
      // Fallback to current time
      data = new Date();
    }
    
    const hour = data.getHours();
    const minute = data.getMinutes().toString().padStart(2, '0');
    if (hour > 12) {
      return (hour - 12) + ":" + minute + " PM";
    } else if (hour === 0) {
      return "12:" + minute + " AM";
    } else {
      return hour + ":" + minute + " AM";
    }
  }
  

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    
    // Play notification sound for new messages (not from current user)
    if (messages.length > prevMessagesLength.current && prevMessagesLength.current > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage && latestMessage.sId !== userData?.id) {
        // Play sound notification
        playNotificationSound();
        
        // Show browser notification if permission granted
        if (chatUser) {
          const messageText = latestMessage.text || 'Sent an image';
          const senderName = chatUser.isGroup ? chatUser.groupData?.name : chatUser.userData?.name;
          const senderAvatar = chatUser.isGroup ? (chatUser.groupData?.avatar || assets.logo_icon) : (chatUser.userData?.avatar || assets.avatar_icon);
          showBrowserNotification(
            `New message from ${senderName}`,
            messageText,
            senderAvatar
          );
        }
      }
    }
    
    prevMessagesLength.current = messages.length;
  }, [messages, userData?.id, chatUser])

  // Request notification permission when component mounts
  useEffect(() => {
    requestNotificationPermission();
  }, [])

  useEffect(()=>{
    if(messagesId && messagesId.length > 0){
      console.log("Setting up listener for messagesId:", messagesId);
      setMessages([]);
      
      try {
        const unSub = onSnapshot(doc(db, 'messages', messagesId), (res) => {
          console.log("Message document snapshot:", res.exists());
          if(res.exists() && res.data()?.messages){
            const messagesData = res.data().messages;
            
            // Clean and validate messages
            const validMessages = messagesData
              .filter(msg => msg && (msg.text || msg.image || msg.video))
              .map((msg, index) => ({
                ...msg,
                createdAt: msg.createdAt || Date.now(),
                id: msg.id || `msg_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              }))
              .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            
            console.log("Setting messages:", validMessages.length);
            setMessages(validMessages);
          } else {
            console.log("No messages found");
            setMessages([]);
          }
        }, (error) => {
          console.error("Firestore listener error:", error);
          setMessages([]);
        });
        
        return () => unSub();
      } catch (error) {
        console.error("Error setting up listener:", error);
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [messagesId])
  return chatUser ? (
    <div className='chat-box'>
      <div className="chat-user">
        <img src={assets.arrow_icon} alt="Back" className='back-btn' onClick={() => setChatVisible(false)} />
        <img src={chatUser.isGroup ? (chatUser.groupData?.avatar || assets.logo_icon) : (chatUser.userData?.avatar || assets.avatar_icon)} alt="" onClick={() => setShowContactInfo(true)} style={{cursor: 'pointer'}} />
        <p onClick={() => setShowContactInfo(true)} style={{cursor: 'pointer'}}>
          {chatUser.isGroup ? chatUser.groupData?.name : chatUser.userData?.name} 
          {!chatUser.isGroup && chatUser.userData && Date.now()-chatUser.userData.lastSeen<=70000 ? <img className='dot' src={assets.green_dot} alt="" />: null}
        </p>
        <img src={assets.help_icon} alt="" className='help' />
      </div>

      {/* Contact Info Modal */}
      {showContactInfo && (
        <div className="contact-info-overlay" onClick={() => setShowContactInfo(false)}>
          <div className="contact-info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="contact-info-header">
              <h3>{chatUser.isGroup ? 'Group Info' : 'Contact Info'}</h3>
              <button className="close-btn" onClick={() => setShowContactInfo(false)}>×</button>
            </div>
            <div className="contact-info-content">
              <div className="contact-avatar">
                <img src={chatUser.isGroup ? (chatUser.groupData?.avatar || assets.logo_icon) : (chatUser.userData?.avatar || assets.avatar_icon)} alt={chatUser.isGroup ? (chatUser.groupData?.name || 'Group') : (chatUser.userData?.name || 'User')} />
                <div className="online-status">
                  {chatUser.isGroup ? (
                    <span className="status online">
                      👥 Group Chat
                    </span>
                  ) : chatUser.userData && Date.now()-chatUser.userData.lastSeen<=70000 ? (
                    <span className="status online">
                      <img src={assets.green_dot} alt="" />
                      Online
                    </span>
                  ) : (
                    <span className="status offline">
                      Last seen {chatUser.userData ? new Date(chatUser.userData.lastSeen).toLocaleString() : 'Unknown'}
                    </span>
                  )}
                </div>
              </div>
              <div className="contact-details">
                <div className="detail-item">
                  <label>Name:</label>
                  <span>{chatUser.isGroup ? chatUser.groupData?.name : chatUser.userData?.name}</span>
                </div>
                {chatUser.isGroup ? (
                  <>
                    {chatUser.groupData?.description && (
                      <div className="detail-item">
                        <label>Description:</label>
                        <span>{chatUser.groupData.description}</span>
                      </div>
                    )}
                    <div className="detail-item">
                      <label>Members:</label>
                      <span>{chatUser.groupData?.members?.length || 1} member(s)</span>
                    </div>
                    <div className="detail-item">
                      <label>Created:</label>
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                    {/* Add Members Button for Groups */}
                    <div className="detail-item">
                      <button 
                        onClick={() => {
                          const username = prompt('Enter username to add to group:');
                          if (username) {
                            // TODO: Implement add member functionality
                            toast.info('Add member feature coming soon!');
                          }
                        }}
                        style={{
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          marginTop: '10px'
                        }}
                      >
                        👥 Add Members
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="detail-item">
                      <label>Username:</label>
                      <span>@{chatUser.userData?.username}</span>
                    </div>
                    {chatUser.userData?.bio && (
                      <div className="detail-item">
                        <label>Bio:</label>
                        <span>{chatUser.userData.bio}</span>
                      </div>
                    )}
                    <div className="detail-item">
                      <label>Member since:</label>
                      <span>{chatUser.userData ? new Date(chatUser.userData.id).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="chat-msg">
        {messages && messages.length > 0 ? (
          messages.map((msg, index) => (
            <div key={index} className={`s-msg ${msg.sId === userData.id ? 'smsg' : 'rmsg'}`}>
              <div className="msg-wrapper">
                {msg.image ? (
                  <div className="msg-content">
                    <img 
                      className="msg-image" 
                      src={msg.image} 
                      alt="Shared image"
                      onClick={() => downloadMedia(msg.image, `image_${index}.jpg`)}
                      title="Click to download"
                    />
                  </div>
                ) : msg.video ? (
                  <div className="msg-content">
                    <video 
                      className="msg-video" 
                      src={msg.video} 
                      controls
                      onClick={() => downloadMedia(msg.video, `video_${index}.mp4`)}
                      title="Click to download"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  <p className='msg'>{msg.text}</p>
                )}
                
                {/* Delete button - only show for own messages */}
                {msg.sId === userData.id && (
                  <button 
                    className="delete-btn"
                    onClick={() => deleteMessage(msg)}
                    title="Delete message"
                  >
                    ×
                  </button>
                )}
              </div>
              
              <div className="msg-avatar">
                <img src={msg.sId === userData.id ? (userData?.avatar || assets.avatar_icon) : (chatUser.isGroup ? (chatUser.groupData?.avatar || assets.logo_icon) : (chatUser.userData?.avatar || assets.avatar_icon))} alt="" />
                <p>{convertTimeStamp(msg.createdAt)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input onChange={(e)=>setInput(e.target.value)} value={input} type="text" placeholder='Send a message' />
        <input onChange={sendImage} type="file" id='media' accept='image/*,video/*' hidden />
        <label htmlFor="media" title="Upload image or video">
          <img src={assets.gallery_icon} alt="" />
        </label>
        <img onClick={sendMessage} src={assets.send_button} alt="" />
      </div>
    </div>
  ) : (
    <div className='chat-welcome'>
      <img src={assets.logo_icon} alt="" />
      <p>chat anytime, anywhere</p>
    </div>
  )
}

export default ChatBox
