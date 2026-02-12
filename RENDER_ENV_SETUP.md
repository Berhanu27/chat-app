# Render.com Environment Variables Setup

## ⚠️ CRITICAL: Fix "Firebase: Error (auth/invalid-api-key)"

This error happens because Render.com doesn't have access to your `.env` file. You need to manually add environment variables.

---

## Step-by-Step Instructions

### 1. Go to Your Render Dashboard
- After creating your static site on Render.com
- Click on your site name
- Go to the "Environment" tab (left sidebar)

### 2. Add Environment Variables
Click "Add Environment Variable" and add each of these **one by one**:

#### Variable 1:
```
Key: VITE_FIREBASE_API_KEY
Value: AIzaSyAZt04SDexf_o1HvlpvEJ5bC2lqtQPnubs
```

#### Variable 2:
```
Key: VITE_FIREBASE_AUTH_DOMAIN
Value: chat-app-8062e.firebaseapp.com
```

#### Variable 3:
```
Key: VITE_FIREBASE_PROJECT_ID
Value: chat-app-8062e
```

#### Variable 4:
```
Key: VITE_FIREBASE_STORAGE_BUCKET
Value: chat-app-8062e.appspot.com
```

#### Variable 5:
```
Key: VITE_FIREBASE_MESSAGING_SENDER_ID
Value: 1053821046224
```

#### Variable 6:
```
Key: VITE_FIREBASE_APP_ID
Value: 1:1053821046224:web:b8389e12e1cbcc82e27dd5
```

#### Variable 7:
```
Key: VITE_CLOUDINARY_CLOUD_NAME
Value: dlruksedk
```

### 3. Save Changes
- After adding all 7 variables
- Click "Save Changes" button
- Render will automatically redeploy your app

### 4. Wait for Rebuild
- The rebuild takes 2-5 minutes
- Watch the "Events" tab for progress
- Once complete, your app will work!

---

## Quick Copy-Paste Format

If Render allows bulk import, use this format:

```env
VITE_FIREBASE_API_KEY=AIzaSyAZt04SDexf_o1HvlpvEJ5bC2lqtQPnubs
VITE_FIREBASE_AUTH_DOMAIN=chat-app-8062e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=chat-app-8062e
VITE_FIREBASE_STORAGE_BUCKET=chat-app-8062e.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1053821046224
VITE_FIREBASE_APP_ID=1:1053821046224:web:b8389e12e1cbcc82e27dd5
VITE_CLOUDINARY_CLOUD_NAME=dlruksedk
```

---

## Verification

After deployment completes:

1. Open your deployed app URL
2. Try to log in or sign up
3. If you see the login page without errors, it's working!
4. If you still see errors, check:
   - All 7 variables are added correctly
   - No extra spaces in keys or values
   - Variable names start with `VITE_` (case-sensitive)

---

## Troubleshooting

### Error: "Firebase: Error (auth/invalid-api-key)"
**Cause**: Environment variables not set or incorrect
**Solution**: 
- Double-check all 7 variables are added
- Verify no typos in variable names
- Make sure values match exactly from `.env` file
- Trigger manual redeploy if needed

### Error: "Firebase: Error (auth/invalid-project-id)"
**Cause**: `VITE_FIREBASE_PROJECT_ID` is wrong or missing
**Solution**: 
- Check the value is: `chat-app-8062e`
- No extra spaces or quotes

### Error: Image upload not working
**Cause**: `VITE_CLOUDINARY_CLOUD_NAME` is wrong or missing
**Solution**: 
- Check the value is: `dlruksedk`
- Verify Cloudinary account is active

### Variables not taking effect
**Solution**:
- Go to "Manual Deploy" → "Clear build cache & deploy"
- This forces a fresh build with new variables

---

## Security Note

⚠️ **Important**: These Firebase config values are safe to expose in client-side code. They're meant to be public and are protected by Firebase Security Rules on the backend.

However, never commit:
- Private keys
- Service account credentials
- Database passwords
- API secrets

Your current `.env` file is already in `.gitignore`, which is correct.

---

## Alternative: Use Render Blueprint (Optional)

You can also create a `render.yaml` with environment variables, but they'll still be visible in your repo. The manual method above is more secure.

---

## Summary

✅ Add all 7 environment variables in Render dashboard
✅ Save changes and wait for rebuild
✅ Test your deployed app
✅ You're live!

**Need help?** Check the main `DEPLOYMENT_GUIDE.md` for more details.
