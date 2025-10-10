# 🎯 Demo Accounts Guide

This document provides information about the pre-configured demo accounts for testing Student Nest.

---

## 📋 Available Demo Accounts

### 👨‍🎓 Demo Student Account

- **Email:** `demo.student@studentnest.com`
- **Phone:** `+1234567890`
- **Password:** `Demo@123`
- **Role:** Student
- **Features Access:**
  - Browse available rooms
  - Save favorite rooms
  - Book rooms
  - Schedule property visits
  - View booking history
  - Manage profile

---

### 🏠 Demo Owner Account

- **Email:** `demo.owner@studentnest.com`
- **Phone:** `+1234567891`
- **Password:** `Demo@123`
- **Role:** Property Owner
- **Features Access:**
  - Post new properties
  - Manage property listings
  - View booking requests
  - Accept/Reject bookings
  - Manage visit schedules
  - View analytics & revenue

---

## 🚀 How to Use Demo Accounts

### Method 1: Via Login Page (Easiest)

1. Go to the login page (Student or Owner)
2. You'll see a blue/green card with demo credentials
3. Click the **copy icon** next to any credential to copy it
4. Paste into the login form
5. Click "Sign In"

### Method 2: Manual Entry

Simply type the credentials shown above into the login form.

---

## 🔧 Creating/Resetting Demo Accounts

### First Time Setup

```bash
npm run seed-accounts
```

This will create both demo accounts in your database.

### Reset Demo Accounts

If you need to reset the demo accounts to their default state:

```bash
# Delete existing demo accounts from MongoDB
# Then re-run the seed script
npm run seed-accounts
```

---

## 🎨 Demo Account Features

### Student Demo Account Includes:
- ✅ Pre-verified email and phone
- ✅ Sample college information
- ✅ Preferred location set
- ✅ Budget preferences configured
- ✅ Ready to browse and book

### Owner Demo Account Includes:
- ✅ Pre-verified email and phone
- ✅ Business information set
- ✅ Verified owner status
- ✅ Ready to post properties
- ✅ Can receive bookings

---

## 🔒 Security Notes

### Development Environment
- Demo accounts are **safe to use** in development
- Password is intentionally simple for testing
- All data is sandboxed in the development database

### Production Environment
- ⚠️ **DO NOT** deploy these demo accounts to production
- Use environment variables to disable demo account creation in production
- Consider adding a feature flag: `ENABLE_DEMO_ACCOUNTS=false` for production

---

## 🛠️ Technical Details

### Database Schema

Demo accounts are created with:
- `isEmailVerified: true`
- `isPhoneVerified: true`
- `isActive: true` (for owner)
- `isVerified: true` (for owner)

### Script Location
```
scripts/seed-demo-accounts.js
```

### Component Location
```
src/components/auth/DemoCredentials.tsx
```

---

## 📝 Customization

### To Change Demo Credentials

Edit the `DEMO_ACCOUNTS` object in `scripts/seed-demo-accounts.js`:

```javascript
const DEMO_ACCOUNTS = {
  student: {
    email: 'your-custom-email@example.com',
    phone: '+1234567890',
    password: 'YourPassword123!',
    // ... other fields
  },
  owner: {
    // ... owner fields
  }
};
```

Then run `npm run seed-accounts` again.

### To Hide Demo Credentials on Login Page

In the login page component, simply remove or comment out:

```tsx
<DemoCredentials type="student" />
```

---

## 🎓 Testing Workflows

### Student Workflow Test
1. Login with student demo account
2. Browse rooms in `/dashboard`
3. Save a room to favorites
4. Book a room
5. Schedule a visit
6. Check booking status

### Owner Workflow Test
1. Login with owner demo account
2. Go to `/owner/post-property`
3. Add a new property
4. View your properties in `/owner/properties`
5. Check analytics in `/owner/analytics`
6. Manage bookings in `/owner/bookings`

---

## 🆘 Troubleshooting

### "Invalid credentials" error
- Make sure you ran `npm run seed-accounts`
- Check your MongoDB connection
- Verify the database name is correct

### Demo accounts not showing on login page
- Check if `DemoCredentials` component is imported
- Ensure the component is rendered in the CardContent
- Clear your browser cache

### Cannot create demo accounts
- Verify MongoDB connection string in `.env.local`
- Check if accounts already exist (script will skip if they do)
- Review console logs for specific errors

---

## 📚 Related Documentation

- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Deployment guide
- [QUICK_START_GUIDE.md](./docs/QUICK_START_GUIDE.md) - General setup guide
- [API Documentation](./docs/API_ROUTES_FIX_SUMMARY.md) - API endpoints

---

## ✅ Quick Reference

```bash
# Create demo accounts
npm run seed-accounts

# Start development server
npm run dev

# Access login pages
# Student: http://localhost:3000/student/login
# Owner: http://localhost:3000/owner/login
```

---

**Happy Testing! 🎉**
