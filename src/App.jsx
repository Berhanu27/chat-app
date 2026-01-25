import React, { useContext, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Login from './pages/Login/Login'
import Chat from './pages/Chat/Chat'
import ProfileUpdate from './pages/ProfileUpdate/ProfileUpdate'
import JoinGroup from './pages/JoinGroup/JoinGroup'
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './config/Firebase'
import { useNavigate } from 'react-router-dom'
import { AppContext } from './context/AppContext'


const App = () => {
  const navigate=useNavigate();
  const {loadUserData}=useContext(AppContext);
  
  useEffect(()=>{
    onAuthStateChanged(auth,async(user)=>{
      if(user){
         await loadUserData(user.uid)
         
         // Check if there's a pending invite link to redirect to
         const pendingInviteLink = sessionStorage.getItem('pendingInviteLink');
         if (pendingInviteLink) {
           console.log('Redirecting to pending invite link:', pendingInviteLink);
           sessionStorage.removeItem('pendingInviteLink');
           navigate(pendingInviteLink);
           return;
         }
         
         // Only navigate to chat if we're currently on the login page
         const currentPath = window.location.pathname;
         if (currentPath === '/') {
           navigate('/chat');
         }
      }else{
        // Check if user is trying to access a join-group link
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/join-group/')) {
          // Store the invite link in sessionStorage to redirect after login
          sessionStorage.setItem('pendingInviteLink', currentPath);
          console.log('Stored pending invite link:', currentPath);
        }
        navigate('/')
      }
    })
  },[])
  
  return (
   <>
   <ToastContainer/>
   <Routes>
    <Route path='/' element={<Login/>}/>
    <Route path='/chat' element={<Chat/>}/>
    <Route path='/profile' element={<ProfileUpdate/>}/>
    <Route path='/join-group/:inviteCode' element={<JoinGroup/>}/>
   </Routes>
   </>
  )
}

export default App