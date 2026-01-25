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

// Get file icon based on file extension
const getFileIcon = (fileName) => {
  if (!fileName) return '📄';
  
  const extension = fileName.toLowerCase().split('.').pop();
  
  const iconMap = {
    // Documents
    'pdf': '📕',
    'doc': '📘',
    'docx': '📘',
    'txt': '📝',
    'rtf': '📝',
    
    // Spreadsheets
    'xls': '📊',
    'xlsx': '📊',
    'csv': '📊',
    
    // Presentations
    'ppt': '📊',
    'pptx': '📊',
    'odp': '📊',
    
    // Archives
    'zip': '🗜️',
    'rar': '🗜️',
    '7z': '🗜️',
    'tar': '🗜️',
    'gz': '🗜️',
    
    // Code files
    'js': '📜',
    'jsx': '📜',
    'ts': '📜',
    'tsx': '📜',
    'html': '📜',
    'css': '📜',
    'py': '📜',
    'java': '📜',
    'cpp': '📜',
    'c': '📜',
    'php': '📜',
    'json': '📜',
    'xml': '📜',
    
    // Audio
    'mp3': '🎵',
    'wav': '🎵',
    'flac': '🎵',
    'aac': '🎵',
    'm4a': '🎵',
    
    // Other
    'exe': '⚙️',
    'msi': '⚙️',
    'dmg': '⚙️',
    'apk': '📱',
    'ipa': '📱'
  };
  
  return iconMap[extension] || '📄';
};

const ChatBox = () => {
  const { userData, messagesId, chatUser, messages, setMessages, setChatVisible, appSettings } = useContext(AppContext)
  const[input, setInput]=useState("");
  const[showContactInfo, setShowContactInfo]=useState(false);
  const[activeMessageDropdown, setActiveMessageDropdown]=useState(null);
  const[editingMessage, setEditingMessage]=useState(null);
  const[editText, setEditText]=useState("");
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

  // Edit message function
  const editMessage = async (messageToEdit, newText) => {
    try {
      if (!messagesId || !messageToEdit || !newText.trim()) return;
      
      // Update the message in the messages array
      const updatedMessages = messages.map(msg => {
        if (msg.id === messageToEdit.id) {
          return {
            ...msg,
            text: newText.trim(),
            edited: true,
            editedAt: Date.now()
          };
        }
        return msg;
      });
      
      // Update Firebase with the modified messages
      await setDoc(doc(db, 'messages', messagesId), {
        messages: updatedMessages.map(msg => {
          const { id, ...messageWithoutId } = msg;
          return messageWithoutId;
        })
      });
      
      toast.success("Message edited");
      setEditingMessage(null);
      setEditText("");
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error("Failed to edit message");
    }
  };

  const toggleMessageDropdown = (messageId, event) => {
    event.stopPropagation();
    setActiveMessageDropdown(activeMessageDropdown === messageId ? null : messageId);
  };

  const startEditMessage = (message) => {
    setEditingMessage(message.id);
    setEditText(message.text || "");
    setActiveMessageDropdown(null);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText("");
  };

  const saveEdit = (message) => {
    if (editText.trim() && editText.trim() !== message.text) {
      editMessage(message, editText);
    } else {
      cancelEdit();
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
      
      // Determine file type for display
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isDocument = !isImage && !isVideo;
      
      let fileTypeText;
      if (isVideo) {
        fileTypeText = 'video';
      } else if (isDocument) {
        fileTypeText = 'document';
      } else {
        fileTypeText = 'image';
      }
      
      // Show loading toast
      const loadingToast = toast.loading(`Uploading ${fileTypeText}...`);
      
      const uploadResult = await upload(file);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      if(uploadResult && messagesId){
        const messageData = {
          sId: userData.id,
          createdAt: Date.now(),
          id: `${userData.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        // Add appropriate field based on file type - ensure no undefined values
        if (uploadResult.type === 'video') {
          messageData.video = uploadResult.url || '';
          messageData.videoFormat = uploadResult.format || '';
          if (uploadResult.duration) {
            messageData.videoDuration = uploadResult.duration;
          }
        } else if (uploadResult.type === 'document') {
          messageData.document = uploadResult.url || '';
          messageData.documentName = uploadResult.fileName || 'Unknown File';
          messageData.documentSize = uploadResult.fileSize || 0;
          messageData.documentFormat = uploadResult.format || '';
        } else {
          messageData.image = uploadResult.url || '';
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
              let lastMessage;
              if (uploadResult.type === 'video') {
                lastMessage = "📹 Video";
              } else if (uploadResult.type === 'document') {
                // Show file extension or type in last message
                const extension = uploadResult.fileName.split('.').pop().toUpperCase();
                lastMessage = `📄 ${extension} file`;
              } else {
                lastMessage = "🖼️ Image";
              }
              
              userChatData.chatData[chatIndex].lastMessage = lastMessage;
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
        
        toast.success(`${fileTypeText.charAt(0).toUpperCase() + fileTypeText.slice(1)} uploaded successfully!`);
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
        // Play sound notification only if enabled
        if (appSettings?.soundNotifications) {
          playNotificationSound();
        }
        
        // Show browser notification only if enabled
        if (appSettings?.browserNotifications && chatUser) {
          const messageText = latestMessage.text || 'Sent an image';
          const senderName = chatUser.userData?.name;
          const senderAvatar = chatUser.userData?.avatar || assets.avatar_icon;
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeMessageDropdown && !event.target.closest('.message-options')) {
        setActiveMessageDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMessageDropdown])

  useEffect(()=>{
    if(messagesId && messagesId.length > 0){
      console.log("Setting up listener for messagesId:", messagesId);
      setMessages([]);
      
      try {
        const unSub = onSnapshot(doc(db, 'messages', messagesId), (res) => {
          console.log("Message document snapshot:", res.exists());
          if(res.exists() && res.data()?.messages){
            const messagesData = res.data().messages;
            
            // Clean and validate messages - filter out any with undefined values
            const validMessages = messagesData
              .filter(msg => {
                // Ensure message has required fields and no undefined values
                if (!msg || typeof msg !== 'object') return false;
                if (!msg.sId || (!msg.text && !msg.image && !msg.video && !msg.document)) return false;
                
                // Check for undefined values in the message object
                for (const [key, value] of Object.entries(msg)) {
                  if (value === undefined) {
                    console.warn(`Message has undefined value for key: ${key}`, msg);
                    return false;
                  }
                }
                return true;
              })
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
        <img 
          src={chatUser.userData?.avatar || assets.avatar_icon} 
          alt="" 
          onClick={() => setShowContactInfo(true)} 
          style={{cursor: 'pointer'}}
          onError={(e) => {
            e.target.src = assets.avatar_icon;
          }}
        />
        <p onClick={() => setShowContactInfo(true)} style={{cursor: 'pointer'}}>
          <span className="contact-name">{chatUser.userData?.name || 'Loading...'}</span>
          {chatUser.userData && Date.now()-chatUser.userData.lastSeen<=70000 ? (
            <span className="online-status-text">
              <img className='dot' src={assets.green_dot} alt="" />
              Online
            </span>
          ) : (
            <span className="offline-status-text">
              Last seen {chatUser.userData ? new Date(chatUser.userData.lastSeen).toLocaleTimeString() : 'Unknown'}
            </span>
          )}
        </p>
        <img src={assets.help_icon} alt="" className='help' />
      </div>

      {/* Contact Info Modal */}
      {showContactInfo && (
        <div className="contact-info-overlay" onClick={() => setShowContactInfo(false)}>
          <div className="contact-info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="contact-info-header">
              <h3>Contact Info</h3>
              <button className="close-btn" onClick={() => setShowContactInfo(false)}>×</button>
            </div>
            <div className="contact-info-content">
              <div className="contact-avatar">
                <img 
                  src={chatUser.userData?.avatar || assets.avatar_icon} 
                  alt={chatUser.userData?.name || 'User'}
                  onError={(e) => {
                    e.target.src = assets.avatar_icon;
                  }}
                />
                <div className="online-status">
                  {chatUser.userData && Date.now()-chatUser.userData.lastSeen<=70000 ? (
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
                  <span>{chatUser.userData?.name || 'Loading...'}</span>
                </div>
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
                  <span>
                    {chatUser.userData && chatUser.userData.createdAt 
                      ? new Date(chatUser.userData.createdAt).toLocaleDateString()
                      : chatUser.userData && chatUser.userData.lastSeen 
                        ? new Date(chatUser.userData.lastSeen).toLocaleDateString()
                        : 'Recently joined'
                    }
                  </span>
                </div>
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
                ) : msg.document ? (
                  <div className="msg-content document-message">
                    <div className="document-info">
                      <div className="document-icon">{getFileIcon(msg.documentName)}</div>
                      <div className="document-details">
                        <p className="document-name">{msg.documentName || 'Document'}</p>
                        <span className="document-size">
                          {msg.documentSize ? `${(msg.documentSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                        </span>
                      </div>
                      <button 
                        className="download-btn"
                        onClick={() => downloadMedia(msg.document, msg.documentName || `document_${index}`)}
                        title="Download file"
                      >
                        ⬇️
                      </button>
                    </div>
                  </div>
                ) : (
                  editingMessage === msg.id ? (
                    <div className="edit-message-container">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            saveEdit(msg);
                          } else if (e.key === 'Escape') {
                            cancelEdit();
                          }
                        }}
                        className="edit-message-input"
                        autoFocus
                      />
                      <div className="edit-message-actions">
                        <button onClick={() => saveEdit(msg)} className="save-edit-btn">✓</button>
                        <button onClick={cancelEdit} className="cancel-edit-btn">✕</button>
                      </div>
                    </div>
                  ) : (
                    <div className="message-text-container">
                      <p className='msg'>
                        {msg.text}
                        {msg.edited && <span className="edited-indicator"> (edited)</span>}
                      </p>
                    </div>
                  )
                )}
                
                {/* Message Options Dropdown - only show for own messages */}
                {msg.sId === userData.id && (
                  <div className="message-options">
                    <button 
                      className="message-options-btn"
                      onClick={(e) => toggleMessageDropdown(msg.id, e)}
                      title="Message options"
                    >
                      ⋮
                    </button>
                    {activeMessageDropdown === msg.id && (
                      <div className="message-dropdown-menu">
                        {msg.text && (
                          <button 
                            className="message-dropdown-item edit"
                            onClick={() => startEditMessage(msg)}
                          >
                            ✏️ Edit Message
                          </button>
                        )}
                        <button 
                          className="message-dropdown-item delete"
                          onClick={() => {
                            deleteMessage(msg);
                            setActiveMessageDropdown(null);
                          }}
                        >
                          🗑️ Delete Message
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="msg-avatar">
                <img 
                  src={msg.sId === userData.id 
                    ? (userData?.avatar || assets.avatar_icon) 
                    : (chatUser.userData?.avatar || assets.avatar_icon)
                  } 
                  alt=""
                  onError={(e) => {
                    e.target.src = assets.avatar_icon;
                  }}
                />
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
        <input onChange={sendImage} type="file" id='media' accept='*' hidden />
        <label htmlFor="media" title="Upload any file (images, videos, documents, etc.)">
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
