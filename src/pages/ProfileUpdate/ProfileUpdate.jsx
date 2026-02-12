import { useContext, useEffect, useState } from 'react'
import './ProfileUpdate.css'
import assets from '../../assets/assets'
import upload from '../../lib/upload'
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../../config/Firebase'
import { AppContext } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { onAuthStateChanged } from 'firebase/auth'


const ProfileUpdate = () => {
  const [image, setImage] = useState(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [uid, setUid] = useState('')
  const [prevImage, setPrevImage] = useState('')
  const { setUserData } = useContext(AppContext)
  const navigate = useNavigate()

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid)
        const docRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(docRef)
        const data = docSnap.data()
        if (data?.name) setName(data.name)
        if (data?.bio) setBio(data.bio)
        if (data?.avatar) setPrevImage(data.avatar)
      } else {
        navigate('/')
      }
    })
  }, [navigate])

  const profileUpdate = async (e) => {
    e.preventDefault()
    
    try {
      if (!prevImage && !image) {
        toast.error('Please upload a profile image')
        return
      }

      const docRef = doc(db, 'users', uid);
      
      // Check if document exists
      const docSnap = await getDoc(docRef);
      
      if (image) {
        // Upload new image
        const uploadResult = await upload(image);
        const imageUrl = uploadResult?.url || uploadResult;
        
        // Use setDoc with merge to create or update
        await setDoc(docRef, {
          avatar: imageUrl,
          bio: bio,
          name: name,
          id: uid,
          lastSeen: Date.now()
        }, { merge: true });
        
        setPrevImage(imageUrl);
      } else {
        // Update without new image
        await setDoc(docRef, {
          bio: bio,
          name: name,
          id: uid,
          lastSeen: Date.now()
        }, { merge: true });
      }
      
      // Refresh user data
      const updatedSnap = await getDoc(docRef);
      setUserData(updatedSnap.data());
      
      toast.success('Profile updated successfully!');
      navigate('/chat');
      
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile: ' + error.message);
    }
  }

  return (
    <div className='profile'>
      <div className="profile-container">
        <form onSubmit={profileUpdate}>
          <h3>Profile Details</h3>
          <label htmlFor="avatar">
            <input 
              onChange={(e) => setImage(e.target.files[0])} 
              type="file" 
              id='avatar' 
              accept='.png, .jpg, .jpeg' 
              hidden 
            />
            <img src={image ? URL.createObjectURL(image) : prevImage || assets.avatar_icon} alt="" />
            Upload profile image
          </label>
          <input 
            type="text" 
            placeholder='Your name' 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <textarea 
            placeholder='Write profile bio' 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <button type='submit'>Save</button>
        </form>
        <img 
          className='profile-pic' 
          src={image ? URL.createObjectURL(image) : prevImage || assets.logo_icon} 
          alt="" 
        />
      </div>
    </div>
  )
}

export default ProfileUpdate
