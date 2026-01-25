import { useState } from 'react'
import './Login.css'
import assets from '../../assets/assets'
import { signup, login, resetPass } from '../../config/Firebase'
import { toast } from 'react-toastify'

const Login = () => {
    const [currentState, setCurrentState] = useState("Sign Up")
    const [userName, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    
    const onSubmitHandler = (e) => {
        e.preventDefault();
        if (currentState === "Sign Up") {
            signup(userName, email, password)
        } else {
            login(email, password)
        }
    }

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!resetEmail) {
            toast.error("Please enter your email address");
            return;
        }
        await resetPass(resetEmail);
        setShowForgotPassword(false);
        setResetEmail("");
    }

    return (
        <div className='login'>
            <img src={assets.logo_big} alt="" />
            
            {!showForgotPassword ? (
                <form onSubmit={onSubmitHandler} className='login-form'>
                    <h2>{currentState}</h2>
                    {currentState === "Sign Up" ? 
                        <input 
                            onChange={(e) => setUsername(e.target.value)} 
                            value={userName} 
                            type="text" 
                            placeholder='Username' 
                            className='form-input' 
                            required 
                        /> : null
                    }
                    <input 
                        onChange={(e) => setEmail(e.target.value)} 
                        value={email} 
                        type="email" 
                        placeholder='Email' 
                        className='form-input' 
                        required 
                    />
                    <input 
                        onChange={(e) => setPassword(e.target.value)} 
                        value={password} 
                        type="password" 
                        placeholder='Password' 
                        className='form-input' 
                        required
                    />
                    <button type='submit'>
                        {currentState === "Sign Up" ? "Create an account" : "Login now"}
                    </button>
                    
                    <div className="login-term">
                        <input type="checkbox" /> 
                        <p>By continuing, I agree to the terms of use & privacy policy.</p>
                    </div>
                    
                    <div className="login-forgot">
                        {currentState === "Sign Up" ? 
                            <p className='login-toggle'>
                                Already have an account? 
                                <span onClick={() => setCurrentState("Login")}> login here</span>
                            </p> :
                            <p className='login-toggle'>
                                Create an account 
                                <span onClick={() => setCurrentState("Sign Up")}> click here</span>
                            </p>
                        }
                        
                        {currentState === "Login" && (
                            <p className='login-toggle forgot-password-link'>
                                Forgot Password? 
                                <span onClick={() => setShowForgotPassword(true)}> Reset here</span>
                            </p>
                        )}
                    </div>
                </form>
            ) : (
                <form onSubmit={handleForgotPassword} className='login-form forgot-password-form'>
                    <h2>Reset Password</h2>
                    <p className="forgot-password-description">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <input 
                        onChange={(e) => setResetEmail(e.target.value)} 
                        value={resetEmail} 
                        type="email" 
                        placeholder='Enter your email' 
                        className='form-input' 
                        required 
                    />
                    <button type='submit' className="reset-password-btn">
                        Send Reset Email
                    </button>
                    
                    <div className="login-forgot">
                        <p className='login-toggle'>
                            Remember your password? 
                            <span onClick={() => {
                                setShowForgotPassword(false);
                                setResetEmail("");
                            }}> Back to login</span>
                        </p>
                    </div>
                </form>
            )}
        </div>
    )
}

export default Login