import React, { useContext, useEffect, useState } from 'react'
import './RightSidebar.css'
import assets from '../../assets/assets'
import { logout } from '../../config/Firebase'
import { AppContext } from '../../context/AppContext'

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

const RightSidebar = () => {
  const {chatUser, messages}=useContext(AppContext);
  const [msgImages, setMsgImages]=useState([]);
  const [msgDocuments, setMsgDocuments]=useState([]);
  
  useEffect(()=>{
    let tempImages = [];
    let tempVideos = [];
    let tempDocuments = [];
    
    messages.map((msg)=>{
      if(msg.image){
        tempImages.push(msg.image)
      }
      if(msg.video){
        tempVideos.push(msg.video)
      }
      if(msg.document){
        tempDocuments.push({
          url: msg.document,
          name: msg.documentName || 'Document',
          size: msg.documentSize
        })
      }
    })
    setMsgImages([...tempImages, ...tempVideos])
    setMsgDocuments(tempDocuments)
  },[messages])

  const downloadFile = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return chatUser? (
    <div className='rs'>
      <div className="rs-profile">
        <img 
          src={chatUser.isGroup 
            ? (chatUser.groupData?.avatar || assets.avatar_icon) 
            : (chatUser.userData?.avatar || assets.avatar_icon)
          } 
          alt="" 
        />
        <h3>
          {chatUser.isGroup 
            ? (chatUser.groupData?.name || 'Group')
            : (chatUser.userData?.name || 'User')
          }
          {!chatUser.isGroup && chatUser.userData && Date.now()-chatUser.userData.lastSeen<=70000 ? 
            <img src={assets.green_dot} className='dot' alt="" /> : null
          }
        </h3>
        <p>
          {chatUser.isGroup 
            ? (chatUser.groupData?.description || `${chatUser.groupData?.members?.length || 0} members`)
            : (chatUser.userData?.bio || '')
          }
        </p>
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
      {msgDocuments.length > 0 && (
        <>
          <hr />
          <div className="rs-documents">
            <p>Files</p>
            <div className="documents-list">
              {msgDocuments.map((doc, index)=>(
                <div key={index} className="document-item" onClick={() => downloadFile(doc.url, doc.name)}>
                  <div className="doc-icon">{getFileIcon(doc.name)}</div>
                  <div className="doc-info">
                    <span className="doc-name">{doc.name}</span>
                    {doc.size && (
                      <span className="doc-size">{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                    )}
                  </div>
                  <div className="doc-download">⬇️</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
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