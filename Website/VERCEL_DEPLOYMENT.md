# 🚀 Vercel Deployment Guide

## ⚠️ IMPORTANT: Environment Variables Setup

Your Vercel build is failing because environment variables are not configured. Follow these steps:

---

## 📋 Step-by-Step Instructions

### 1. Go to Vercel Dashboard
- Navigate to: https://vercel.com/dashboard
- Select your project: **student-nest** (or whatever you named it)

### 2. Open Environment Variables Settings
- Click on **Settings** tab
- Click on **Environment Variables** in the left sidebar

### 3. Add ALL Environment Variables

You need to copy **ALL** variables from your `.env.local` file. For each variable:

1. Click **"Add New"**
2. Enter the **Key** (variable name)
3. Enter the **Value** (from your `.env.local` file)
4. Select environments: Check **Production**, **Preview**, and **Development**
5. Click **Save**

---

## 📝 Required Variables Checklist

Copy these from your `.env.local` file:

### Database (CRITICAL)
- [ ] `MONGODB_URI`

### Authentication (CRITICAL)
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `JWT_EXPIRES_IN`
- [ ] `JWT_REFRESH_EXPIRES_IN`

### Email Service
- [ ] `EMAIL_SERVICE`
- [ ] `EMAIL_FROM`
- [ ] `SENDGRID_API_KEY`
- [ ] `SENDGRID_FROM_EMAIL`

### SMS Service
- [ ] `PHONE_SERVICE`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `TWILIO_VERIFY_SID`

### File Storage
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`

### Google OAuth
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI` (⚠️ Update with your Vercel URL)

### Security Settings
- [ ] `BCRYPT_ROUNDS`
- [ ] `OTP_EXPIRY_MINUTES`
- [ ] `MAX_LOGIN_ATTEMPTS`
- [ ] `LOCK_TIME_HOURS`

### Feature Flags
- [ ] `MOCK_VERIFICATION`
- [ ] `ENABLE_EMAIL_VERIFICATION`
- [ ] `ENABLE_SMS_VERIFICATION`

### Application
- [ ] `NODE_ENV` (set to `production`)
- [ ] `NEXT_PUBLIC_APP_NAME`
- [ ] `NEXT_PUBLIC_APP_URL` (⚠️ Update with your Vercel URL)

---

## 🔄 URLs to Update

After deployment, update these variables with your Vercel domain:

1. **NEXT_PUBLIC_APP_URL**
   - Change from: `http://localhost:3000`
   - Change to: `https://your-app.vercel.app`

2. **GOOGLE_REDIRECT_URI**
   - Change from: `http://localhost:3000/api/auth/google/callback`
   - Change to: `https://your-app.vercel.app/api/auth/google/callback`

---

## 🎯 Quick Copy Method

### Option A: Manual Copy (Recommended for Security)
1. Open your `.env.local` file locally
2. Copy each value manually to Vercel dashboard
3. Double-check each variable

### Option B: Vercel CLI (Advanced)
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Add environment variables from .env.local
# (You'll need to add them one by one or use vercel env pull/push)
```

---

## ✅ After Adding Variables

1. **Trigger a new deployment:**
   - Go to Deployments tab
   - Click "Redeploy" on the latest deployment
   - OR push a new commit to trigger automatic deployment

2. **Verify the build:**
   - Watch the build logs
   - Should see: ✓ Compiled successfully
   - Should NOT see: "Please define the MONGODB_URI environment variable"

---

## 🔧 Troubleshooting

### Build still fails after adding variables?
1. Make sure you selected all environments (Production, Preview, Development)
2. Redeploy from scratch (not just redeploy)
3. Check for typos in variable names (they're case-sensitive)

### Which variables are CRITICAL for build to work?
- `MONGODB_URI` - Without this, build will fail
- `JWT_SECRET` - Required for authentication
- All other services can be added later if needed

### Can I test locally first?
```bash
# Test the production build locally
npm run build

# If this works, Vercel should work too (with env vars added)
```

---

## 📚 Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

## 🎉 Success Checklist

- [ ] All environment variables added to Vercel
- [ ] URLs updated with production domain
- [ ] Redeployment triggered
- [ ] Build completed successfully
- [ ] Application loads without errors
- [ ] Database connection works
- [ ] Authentication works
