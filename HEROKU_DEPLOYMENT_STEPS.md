# 🚀 Heroku Deployment Steps

Follow these simple steps to deploy your Order Management Application to Heroku.

## 📋 Prerequisites

1. **Install Heroku CLI**
   - Download from: https://devcenter.heroku.com/articles/heroku-cli
   - Or run: `winget install Heroku.HerokuCLI` (Windows)

2. **Create Heroku Account**
   - Go to: https://heroku.com
   - Sign up for a free account

## 🚀 Deployment Steps

### Option 1: Automated Deployment (Recommended)

Run the automated deployment script:

```bash
deploy-heroku.bat
```

This script will:
- Check if Heroku CLI is installed
- Login to Heroku
- Create a new app
- Configure buildpacks
- Deploy your application

### Option 2: Manual Deployment

#### Step 1: Login to Heroku
```bash
heroku login
```

#### Step 2: Create Heroku App
```bash
heroku create your-app-name
```
*Replace `your-app-name` with your desired app name*

#### Step 3: Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set PYTHON_VERSION=3.9.0
```

#### Step 4: Add Buildpacks
```bash
heroku buildpacks:add heroku/python
heroku buildpacks:add heroku/nodejs
```

#### Step 5: Deploy
```bash
git push heroku main
```

## 🔗 After Deployment

Your app will be available at: `https://your-app-name.herokuapp.com`

### Useful Commands

```bash
# View logs
heroku logs --tail

# Open app in browser
heroku open

# Scale dynos (if needed)
heroku ps:scale web=1

# Check app status
heroku ps
```

## 🛠️ Troubleshooting

### Common Issues

1. **Build Fails**
   ```bash
   # Check build logs
   heroku logs --tail
   ```

2. **App Crashes**
   ```bash
   # Check runtime logs
   heroku logs --tail
   ```

3. **Python Dependencies**
   - Make sure `requirements.txt` is in root directory
   - Check Python version in `runtime.txt`

4. **Node.js Dependencies**
   - Ensure `package.json` is properly configured
   - Check Node.js version compatibility

### Debug Commands

```bash
# Check app info
heroku info

# Check config vars
heroku config

# Check buildpacks
heroku buildpacks

# Restart app
heroku restart
```

## 📊 Monitoring

### Free Tier Limits
- **Dyno hours**: 550 hours/month
- **Sleep**: App sleeps after 30 minutes of inactivity
- **Wake time**: ~10-30 seconds to wake from sleep

### Upgrade Options
- **Hobby Plan**: $7/month - Always on, no sleep
- **Standard Plans**: $25+/month - Better performance

## 🎯 Next Steps

1. **Test Your Deployment**
   - Visit your Heroku URL
   - Test all functionality
   - Upload a PDF to test the extraction

2. **Share with Testers**
   - Send the Heroku URL to your testers
   - No firewall configuration needed
   - Works from any network

3. **Monitor Performance**
   - Check Heroku dashboard
   - Monitor logs for errors
   - Scale if needed

## 🔐 Security Notes

### Current Setup (Testing)
- ✅ HTTPS enabled by default
- ✅ Basic error handling
- ⚠️ No authentication (for testing only)
- ⚠️ Rate limiting not implemented

### Production Recommendations
- Add authentication
- Implement rate limiting
- Add input validation
- Set up monitoring

## 📞 Support

If you encounter issues:

1. Check the deployment logs: `heroku logs --tail`
2. Verify all files are committed: `git status`
3. Check Heroku dashboard for errors
4. Review the troubleshooting section above

## 🎉 Success!

Once deployed, your application will be accessible from anywhere in the world at:
`https://your-app-name.herokuapp.com`

Share this URL with your testers and they can access your Order Management Application from any device and network!
