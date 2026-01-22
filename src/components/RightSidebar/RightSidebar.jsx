import React, { useContext, useEffect, useState } from 'react'
import './RightSidebar.css'
import assets from '../../assets/assets'
import { logout } from '../../config/Firebase'
import { AppContext } from '../../context/AppContext'
const RightSidebar = () => {
  const {chatUser, messages}=useContext(AppContext);
  const [msgImages, setMsgImages]=useState([]);
  useEffect(()=>{
    let tempImages = [];
    let tempVideos = [];
    messages.map((msg)=>{
      if(msg.image){
        tempImages.push(msg.image)
      }
      if(msg.video){
        tempVideos.push(msg.video)
      }
    })
    setMsgImages([...tempImages, ...tempVideos])
  },[messages])
  return chatUser? (
    <div className='rs'>
      <div className="rs-profile">
        <img src={chatUser.userData?.avatar || assets.avatar_icon} alt="" />
        <h3>
          {chatUser.userData.name}
          {Date.now()-chatUser.userData.lastSeen<=70000 ? <img src={assets.green_dot} className='dot' alt="" /> : null}
        </h3>
        <p>{chatUser.userData.bio}</p>
      </div>
      <hr />
      <div className="rs-media">
        <p>Media</p>
        <div>
          {msgImages.map((url, index)=>(
            <img onClick={()=>window.open(url)} key={index} src={url} alt="" />
          ))}
        </div>
      </div>
      <button onClick={()=>logout()}>Logout</button>
    </div>
  ):
  (
    <div className='rs'>
      <button onClick={()=>logout()} className='rs-button'>Logout</button>
    </div>
  )
}

export default RightSidebar