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
  const messagesEndRef = useRef(null);
  const prevMessagesLength = useRef(0);
  const sendMessage = async () => {
    try {
      if (input && messagesId) {
        console.log("Sending message:", input, "to messagesId:", messagesId); // Debug log
        await setDoc(doc(db, 'messages', messagesId), {
          messages: arrayUnion({
            sId: userData.id,
            text: input,
            createdAt: Date.now()
          })
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
      
      const uploadResult = await upload(file);
      if(uploadResult && messagesId){
        const messageData = {
          sId: userData.id,
          createdAt: Date.now()
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
      }
      
      // Clear the input
      e.target.value = '';
      
    } catch (error) {
      toast.error(error.message)
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
          showBrowserNotification(
            `New message from ${chatUser.userData.name}`,
            messageText,
            chatUser.userData.avatar
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
    if(messagesId){
      console.log("Setting up listener for messagesId:", messagesId); // Debug log
      setMessages([]); // Clear previous messages immediately
      const unSub=onSnapshot(doc(db, 'messages',messagesId),(res)=>{
        console.log("Message document snapshot:", res.exists(), res.data()); // Debug log
        if(res.exists() && res.data().messages){
          console.log("Setting messages:", res.data().messages); // Debug log
          setMessages(res.data().messages)
        } else {
          console.log("No messages found or document doesn't exist"); // Debug log
          setMessages([]);
        }
      }, (error) => {
        console.error("Error in messages listener:", error); // Error handling
      })
      return () => unSub();
    } else {
      setMessages([]); // Clear messages if no chat selected
    }
  },[messagesId])
  return chatUser ? (
    <div className='chat-box'>
      <div className="chat-user">
        <img src={assets.arrow_icon} alt="Back" className='back-btn' onClick={() => setChatVisible(false)} />
        <img src={chatUser.userData.avatar} alt="" />
        <p>{chatUser.userData.name} {Date.now()-chatUser.userData.lastSeen<=70000 ? <img className='dot' src={assets.green_dot} alt="" />: null}</p>
        <img src={assets.help_icon} alt="" className='help' />
       
      </div>

      <div className="chat-msg">
        {messages && messages.length > 0 ? (
          messages.map((msg, index) => (
            <div key={index} className={`s-msg ${msg.sId === userData.id ? 'smsg' : 'rmsg'}`}>
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
              <div className="msg-avatar">
                <img src={msg.sId === userData.id ? userData.avatar : chatUser.userData.avatar} alt="" />
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
