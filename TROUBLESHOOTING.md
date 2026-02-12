# Troubleshooting Guide

## Common Deployment Errors

### ❌ Error: "Firebase: Error (auth/invalid-api-key)"

**What it means**: Firebase can't connect because environment variables are missing.

**Solution**:
1. Go to your Render dashboard
2. Click on your site
3. Go to "Environment" tab
4. Add all 7 environment variables from `.env` file
5. See `RENDER_ENV_SETUP.md` for detailed instructions

**Quick fix**: Copy all variables from `.env` and add them one by one in Render.

---

### ❌ Error: "Group not found" when clicking invite link

**Possible causes**:
1. Firebase security rules don't allow reading `groups` collection
2. Group wasn't created properly
3. Invite code is incorrect

**Solution**:
1. Check Firebase Console → Firestore Database → Rules
2. Add rules for `groups` collection (see `DEPLOYMENT_GUIDE.md`)
3. Verify the group exists in Firestore
4. Test creating a new group and generating a new invite link

---

### ❌ Error: "Permission denied" in Firebase

**Cause**: Firebase security rules are too restrictive or not set up.

**Solution**:
1. Go to Firebase Console
2. Firestore Database → Rules
3. Update rules to include `groups` collection:

```javascript
match /groups/{groupId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update: if request.auth != null && 
    (resource.data.createdBy == request.auth.uid || 
     request.auth.uid in resource.data.admins);
}
```

4. Click "Publish"

---

### ❌ Build fails on Render

**Common causes**:
- Missing dependencies
- Node version mismatch
- Build command incorrect

**Solution**:
1. Check build logs in Render dashboard
2. Verify `package.json` has all dependencies
3. Ensure build command is: `npm run build`
4. Ensure publish directory is: `dist`
5. Try "Clear build cache & deploy"

---

### ❌ Invite link doesn't work after deployment

**Cause**: Routing not configured properly (but it should be with `render.yaml`).

**Solution**:
1. Verify `render.yaml` exists with rewrite rules
2. Check that route is in `App.jsx`: `/join-group/:inviteCode`
3. Test the link format: `https://your-domain.com/join-group/{groupId}`
4. Try opening link in incognito/private window

---

### ❌ Images not uploading

**Cause**: Cloudinary environment variable missing or incorrect.

**Solution**:
1. Check `VITE_CLOUDINARY_CLOUD_NAME` is set in Render
2. Value should be: `dlruksedk`
3. Verify Cloudinary account is active
4. Check file size (max 5MB for images)

---

### ❌ "No document to update" error

**Cause**: User document doesn't exist in Firestore.

**Solution**: This should be auto-fixed now. The app creates user documents automatically. If still happening:
1. Check Firebase Console → Firestore → users collection
2. Verify user document exists with correct ID
3. Try logging out and logging back in

---

### ❌ App loads but shows blank page

**Possible causes**:
1. JavaScript error in console
2. Firebase not initialized
3. Environment variables missing

**Solution**:
1. Open browser console (F12)
2. Check for errors
3. Verify all environment variables are set
4. Clear browser cache and reload
5. Try incognito/private window

---

### ❌ "Cannot read properties of undefined"

**Cause**: Data not loaded yet or missing.

**Solution**: This should be handled in the code with null checks. If still happening:
1. Check browser console for specific error
2. Note which component/file has the error
3. Verify Firebase data structure matches expected format

---

## Testing Checklist

Before reporting an issue, verify:

- [ ] All 7 environment variables added in Render
- [ ] Firebase security rules include `groups` collection
- [ ] Build completed successfully (no errors in Render logs)
- [ ] Can access the deployed URL
- [ ] Can log in / sign up
- [ ] Can create a chat
- [ ] Can send messages
- [ ] Can create a group
- [ ] Can generate invite link
- [ ] Can click invite link and see join page
- [ ] Can join group successfully

---

## Still Having Issues?

### Check These Files:
1. `RENDER_ENV_SETUP.md` - Environment variables setup
2. `DEPLOYMENT_GUIDE.md` - Full deployment instructions
3. `QUICK_START.md` - Quick reference guide

### Verify Configuration:
- **Render Build Command**: `npm run build`
- **Render Publish Directory**: `dist`
- **Firebase Project**: `chat-app-8062e`
- **Repository**: `Berhanu27/chat-app`

### Debug Steps:
1. Check Render build logs for errors
2. Check browser console for JavaScript errors
3. Check Firebase Console for data structure
4. Test locally first: `npm run dev`
5. Compare local vs deployed behavior

---

## Quick Fixes

### Force Rebuild on Render:
1. Go to Render dashboard
2. Click "Manual Deploy"
3. Select "Clear build cache & deploy"
4. Wait for rebuild

### Reset Firebase Connection:
1. Log out of the app
2. Clear browser cache
3. Log back in
4. Try again

### Test Locally:
```bash
npm run dev
```
If it works locally but not deployed, it's likely an environment variable issue.

---

## Environment Variables Checklist

Make sure ALL of these are in Render:

- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`
- [ ] `VITE_CLOUDINARY_CLOUD_NAME`

**Missing even one will cause errors!**

---

## Summary

Most deployment issues are caused by:
1. ⚠️ Missing environment variables (90% of issues)
2. Firebase security rules not updated
3. Build configuration incorrect

**Always check environment variables first!**
