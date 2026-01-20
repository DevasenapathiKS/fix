# Login Debugging Guide

## Current Setup
- Client running on: https://fixzep.com
- Backend API: https://admin.eopsys.xyz/api
- Login endpoint: POST /customer/auth/login

## Test Credentials
You need to create a customer account first. Use the signup page or create directly in MongoDB.

## Debugging Steps

1. **Check if backend is running:**
```bash
curl https://admin.eopsys.xyz/api/customer/auth/login
```
Should return 401 (expected without credentials)

2. **Check browser console:**
Open browser DevTools (F12) and check:
- Network tab for API requests
- Console tab for debug logs
- Check the request payload and response

3. **Test login API directly:**
```bash
curl -X POST https://admin.eopsys.xyz/api/customer/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "your_email@example.com",
    "password": "your_password"
  }'
```

## Common Issues

1. **No .env file**: Make sure `/client/.env` exists with:
   ```
   VITE_API_URL=https://admin.eopsys.xyz/api
   ```

2. **CORS issues**: Backend should have cors() enabled (already configured)

3. **Invalid credentials**: Make sure you have a customer account in the database

4. **Port mismatch**: Client runs on 5174, make sure no conflicts

## Debug Logs
The code now includes console.log statements that will show:
- Login attempt data
- API URL being used
- Response from server
- Any errors

Check browser console for these logs.
