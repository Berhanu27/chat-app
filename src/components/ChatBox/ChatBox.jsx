import './ChatBox.css'
import assets from '../../assets/assets'
import { useContext, useEffect, useState, useRef } from 'react'
import { AppContext } from '../../context/AppContext'
import { arrayUnion, doc, getDoc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../config/Firebase'
import { toast } from 'react-toastify'
import upload from '../../lib/upload'

const ChatBox = () => {
  const { userData, messagesId, chatUser, messages, setMessages,chatVisible, setChatVisible } = useContext(AppContext)
  const[input, setInput]=useState("");
  const messagesEndRef = useRef(null);
  const sendMessage = async () => {
    try {
      if (input && messagesId) {
        console.log("Sending message:", input, "to messagesId:", messagesId); // Debug log
        await setDoc(doc(db, 'messages', messagesId), {
          messages: arrayUnion({
            sId: userData.id,
            text: input,
            createdAt: serverTimestamp()
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
      const fileUrl=await upload(e.target.files[0]);
      if(fileUrl && messagesId){
         await setDoc(doc(db, 'messages', messagesId), {
          messages: arrayUnion({
            sId: userData.id,
            image: fileUrl,
            createdAt: serverTimestamp()
          })
        }, { merge: true })
          const userIDs = [chatUser.rId, userData.id];
        userIDs.forEach(async (id) => {
          const userChatsRef = doc(db, 'chats', id)
          const userChatsSnapshot = await getDoc(userChatsRef);
          if (userChatsSnapshot.exists()) {
            const userChatData = userChatsSnapshot.data();
            const chatIndex = userChatData.chatData.findIndex((c) => c.messagesId === messagesId)
            if (chatIndex !== -1) {
              userChatData.chatData[chatIndex].lastMessage ="Image";
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

  }

  const convertTimeStamp = (timestamp) => {
    let data = timestamp.toDate();
    const hour = data.getHours();
    const minute = data.getMinutes();
    if (hour > 12) {
      return (hour - 12) + ":" + minute + " PM";
    } else {
      return hour + ":" + minute + " AM";
    }
  }
  

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
    <div className={`chat-box${chatVisible? "":"hidden"}`}>
      <div className="chat-user">
        <img src={assets.arrow_icon} alt="Back" className='back-btn' onClick={() => setChatVisible(false)} />
        <img src={chatUser.userData.avatar} alt="" />
        <p>{chatUser.userData.name} {Date.now()-chatUser.userData.lastSeen<=70000 ? <img className='dot' src={assets.green_dot} alt="" />: null}</p>
        <img src={assets.help_icon} alt="" className='help' />
       
      </div>

      <div className="chat-msg">
        {messages && messages.length > 0 ? (
          messages.map((msg, index) => (
            <div key={index} className={msg.sId === userData.id ? 'smsg' : 'rmsg'}>

              {msg["image"] ? (
                <div className="msg-content">
                  <img className="msg-image" src={msg.image} alt="Shared image" />
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
        <input onChange={sendImage} type="file" id='image' accept='image/png, image/jpeg' hidden />
        <label htmlFor="image">
          <img src={assets.gallery_icon} alt="" />
        </label>
        <img onClick={sendMessage} src={assets.send_button} alt="" />
      </div>
    </div>
  ) : (
    <div className={`chat-welcome ${chatVisible? "":"hidden"}`}>
      <img src={assets.logo_icon} alt="" />
      <p>chat anytime, anywhere</p>
    </div>
  )
}

export default ChatBox
