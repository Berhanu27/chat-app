# Firebase Setup Instructions

## Overview
The group invite link system has been updated to use a permanent link approach (like Telegram). Groups are now stored in a dedicated `groups` collection in Firestore for easy access via invite links.

## Changes Made

### 1. Group Creation
- Groups are now stored in both:
  - Each member's chat data (as before)
  - A new `groups` collection (for invite link functionality)
- The group's `messagesId` is used as the permanent invite code

### 2. Invite Link System
- Invite links are permanent: `https://your-domain.com/join-group/{groupId}`
- No expiration or temporary codes
- Links can be shared in chats or copied to clipboard

### 3. Group Updates
All group modification functions now update both:
- Members' chat data
- The `groups` collection

## Required Firebase Security Rules

You MUST add these security rules to your Firebase Firestore to allow the app to work properly:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User documents - users can read all, but only write their own
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Chat documents - users can only access their own chats
    match /chats/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Message documents - authenticated users can read and write
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Groups collection - NEW! Required for invite link functionality
    match /groups/{groupId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## How to Apply Security Rules

### Option 1: Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `chat-app-8062e`
3. Click on "Firestore Database" in the left sidebar
4. Click on the "Rules" tab
5. Replace the existing rules with the rules above
6. Click "Publish"

### Option 2: Firebase CLI
1. Create a file named `firestore.rules` in your project root
2. Copy the security rules above into this file
3. Run: `firebase deploy --only firestore:rules`

## Testing the Invite Link System

### Step 1: Create a Group
1. Log in to the app
2. Click the menu icon → "👥 Groups"
3. Click "Create New Group"
4. Add members and create the group

### Step 2: Generate Invite Link
1. In the Groups Manager, find your group
2. Click "🔗 Invite Link" button
3. The permanent invite link will be displayed

### Step 3: Share the Link
You can:
- Copy the link to clipboard
- Send it to the current chat
- Share it anywhere (email, SMS, etc.)

### Step 4: Join via Link
1. Open the invite link in a browser
2. If not logged in, you'll be redirected to login
3. After login, you'll see the group preview
4. Click "Join Group" to join

## Troubleshooting

### "Permission denied" errors
- Make sure you've applied the Firebase security rules above
- Check that the user is logged in
- Verify the `groups` collection has proper read/write permissions

### "Group not found" errors
- Make sure the group was created after this update
- Old groups (created before this update) won't have entries in the `groups` collection
- You may need to recreate old groups or manually migrate them

### Invite link not working
- Check browser console for detailed error logs
- Verify the invite code in the URL matches a group ID in the `groups` collection
- Ensure Firebase security rules are published

## Migration for Existing Groups (Optional)

If you have existing groups that were created before this update, they won't have entries in the `groups` collection. You have two options:

### Option 1: Recreate Groups (Easiest)
Simply create new groups and delete the old ones.

### Option 2: Manual Migration (Advanced)
You can manually add existing groups to the `groups` collection using Firebase Console or a migration script.

## Deployment

The app is configured for Firebase Hosting. To deploy:

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Build and deploy
npm run deploy
```

Your app will be available at:
- https://chat-app-8062e.web.app
- https://chat-app-8062e.firebaseapp.com

## Summary

The group invite link system now works like Telegram:
- ✅ Permanent invite links (no expiration)
- ✅ Simple sharing (copy link or send in chat)
- ✅ Easy joining (click link → join)
- ✅ Proper group data storage in `groups` collection
- ✅ All group operations update both chat data and groups collection

Make sure to apply the Firebase security rules above for everything to work properly!
