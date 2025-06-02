# 🎃 Halloween Element Collector

A spooky web app for collecting story elements from multiple users and generating random combinations.

## 🚀 Quick Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

3. **⚠️ IMPORTANT: Set your access codes in `.env`:**

   ```bash
   # Edit .env file and set secure codes
   USER_CODE=YourSecretUserCode2024
   ADMIN_CODE=YourSecretAdminCode2024
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

## 🔐 Security

- **NO DEFAULT CODES**: The app will not start without setting environment variables
- **Environment Required**: Must create `.env` file with secure codes
- **Git Safe**: `.env` file is ignored by git, codes stay private

## 📝 Usage

- **Users**: Use `USER_CODE` to submit story elements
- **Admin**: Use `ADMIN_CODE` to access admin portal and generate final stories

## 🌐 Deployment

Set these environment variables on your hosting platform:

- `USER_CODE` - Code for participants
- `ADMIN_CODE` - Code for admin access
- `PORT` - Server port (optional, defaults to 3000)
- `NODE_ENV` - Set to "production" for production
