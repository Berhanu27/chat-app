import React, { useContext, useEffect, useState } from 'react'
import './Chat.css'
import LeftSidebar from '../../components/LeftSidebar/LeftSidebar'
import RightSidebar from '../../components/RightSidebar/RightSidebar'
import ChatBox from '../../components/ChatBox/ChatBox'
import { AppContext } from '../../context/AppContext'

const Chat = () => {
  const{chatData,userData,chatVisible}=useContext(AppContext);
  const[loading,setLoading]=useState(true)
  useEffect(()=>{
    if(chatData&&userData){
      setLoading(false)

    }
    
    }


  ,[chatData,userData])
  return (
    <div className='chat'>

      {
        loading
        ?<p className='loading'>Loading...</p>
        :
         <div className={`chat-container ${chatVisible ? 'chat-active' : ''}`}>
       <LeftSidebar/>
       <ChatBox/>
       <RightSidebar/>
      </div>
      }
     
       
    </div>
  )
}

export default Chat