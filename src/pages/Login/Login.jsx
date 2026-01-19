import { useState } from 'react'
import './Login.css'
import assets from '../../assets/assets'
import { signup, login,resetPass } from '../../config/Firebase'

const Login = () => {
    const [currentState, setCurrentState] = useState("Sign Up")
    const [userName, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const onSubmitHandler = (e) => {
        e.preventDefault();
        if (currentState === "Sign Up") {
            signup(userName, email, password)
        } else {
            login(email, password)
        }
    }
  return (
    <div className='login'>
         <img src={assets.logo_big} alt="" />
         <form onSubmit={onSubmitHandler} action="" className='login-form'>
            <h2>{currentState}</h2>
        {currentState==="Sign Up"? <input onChange={(e)=>setUsername(e.target.value)} value={userName} type="text" placeholder='Username' className='form-input' required />:null}
        <input onChange={(e)=>setEmail(e.target.value)} value={email} type="email" placeholder='Email' className='form-input' required />
        <input onChange={(e)=>setPassword(e.target.value)} value={password} type="password" placeholder='Password'  className='form-input' required/>
        <button  type='submit' >{currentState=== "Sign Up"? "Create an account": "Login now"}</button>
        <div className="login-term">
            <input type="checkbox" /> 
              <p>By continuing, I agree to the terms of use & privacy policy.</p>
        </div>
        <div className="login-forgot">
            {
                currentState==="Sign Up"?
                <p className='login-toggle'>Already have an account? <span onClick={() => setCurrentState("Login")}>login here</span></p>:
               <p className='login-toggle'>Create an account <span onClick={() => setCurrentState("Sign Up")}>click here</span></p>
           
            }
            {
                currentState==="Login"?
                <p className='login-toggle'>Forgot Password ? <span onClick={()=>resetPass(email)}>Reset here</span></p>:
                null
            }
           

        
        </div>

         </form>
      

       
    </div>
  )
}

export default Login