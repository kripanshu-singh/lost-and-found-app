# Security Guidelines for Lost and Found App

## Overview

This document outlines security best practices for the Lost and Found application, particularly regarding sensitive configuration files and API keys.

## ⚠️ Important: Never Commit Sensitive Files

The following files contain sensitive information and should **NEVER** be committed to the repository:

### Firebase Configuration Files

- `google-services.json` (Android)
- `GoogleService-Info.plist` (iOS)

These files contain:
- Firebase API keys
- Project IDs
- OAuth client IDs
- Other sensitive credentials

### Environment Files

- `.env`
- `.env.local`
- `.env*.local`

These may contain:
- API endpoints
- API keys
- Secret tokens
- Database credentials

## Setting Up Firebase Configuration

### For Android (`google-services.json`)

1. **Download from Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings → General
   - Scroll to "Your apps" section
   - Click on the Android app (or add one if not exists)
   - Download `google-services.json`

2. **Place in Project Root:**
   ```bash
   cp ~/Downloads/google-services.json ./google-services.json
   ```

3. **Verify .gitignore:**
   - The file is already listed in `.gitignore`
   - Confirm it's not being tracked: `git status`

4. **Use the Example Template:**
   - See `google-services.json.example` for the expected structure
   - **DO NOT** use the example file directly - it contains placeholder values

### For iOS (`GoogleService-Info.plist`)

1. **Download from Firebase Console:**
   - Follow similar steps as Android
   - Download `GoogleService-Info.plist`

2. **Place in Project Root:**
   ```bash
   cp ~/Downloads/GoogleService-Info.plist ./GoogleService-Info.plist
   ```

## What to Do If You Accidentally Committed Sensitive Files

If you've already committed `google-services.json` or other sensitive files:

### 1. **Immediate Actions**

```bash
# Remove the file from git tracking (but keep local copy)
git rm --cached google-services.json

# Commit the removal
git commit -m "chore: remove sensitive google-services.json from tracking"

# Push the changes
git push origin main
```

### 2. **Rotate Credentials**

**CRITICAL:** Even after removing the file from the repository, the credentials in the old commits are still accessible in git history. You MUST:

1. **Rotate Firebase API Keys:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Restrict or regenerate API keys
   - Create new restricted keys with minimal necessary permissions

2. **Update API Key Restrictions:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" → "Credentials"
   - For each API key:
     - Set Application restrictions (e.g., Android apps with specific package name)
     - Set API restrictions (only enable necessary APIs)

3. **Enable Firebase App Check:**
   - Adds an additional layer of protection
   - Prevents unauthorized access even with leaked keys

### 3. **Clean Git History (Advanced)**

If the repository hasn't been widely shared yet, you can rewrite history:

⚠️ **WARNING:** This rewrites git history and requires force-pushing. Only do this if:
- The repository is private or hasn't been cloned by others
- You understand the implications

```bash
# Using git-filter-repo (recommended)
pip install git-filter-repo
git filter-repo --path google-services.json --invert-paths

# Or using BFG Repo-Cleaner
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files google-services.json

# After cleaning, force push
git push origin --force --all
```

### 4. **Verify Removal**

```bash
# Check current files
git ls-files | grep google-services

# Search entire history
git log --all --full-history --diff-filter=A -- "*google-services*"

# Search all objects
git rev-list --all --objects | grep google-services
```

## Environment Variables

### Using `.env` Files

1. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your credentials:**
   ```env
   EXPO_PUBLIC_API_BASE_URL=https://your-api-url.com
   GOOGLE_MAPS_API_KEY=your_maps_api_key
   ```

3. **Verify it's gitignored:**
   ```bash
   git status  # Should not show .env
   ```

## CI/CD and Deployment

### Using EAS Secrets

For Expo Application Services (EAS) builds:

```bash
# Set environment secrets
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value "$(cat google-services.json)" --type string

# List secrets
eas secret:list

# Use in eas.json
{
  "build": {
    "production": {
      "env": {
        "GOOGLE_SERVICES_JSON": "@GOOGLE_SERVICES_JSON"
      }
    }
  }
}
```

### GitHub Actions Secrets

If using GitHub Actions:

1. Go to Repository Settings → Secrets and variables → Actions
2. Add secrets:
   - `GOOGLE_SERVICES_JSON`: Content of your google-services.json (base64 encoded)
   - Other sensitive environment variables

3. Use in workflows:
   ```yaml
   - name: Setup google-services.json
     run: |
       echo "${{ secrets.GOOGLE_SERVICES_JSON }}" | base64 -d > google-services.json
   ```

## Additional Security Best Practices

### 1. **API Key Restrictions**

Always restrict your API keys:
- Set application restrictions (package name, bundle ID)
- Set API restrictions (only enable needed APIs)
- Set IP restrictions for server keys

### 2. **Regular Security Audits**

```bash
# Check for exposed secrets
npm install -g secret-scanner
secret-scanner scan .

# Or use git-secrets
git secrets --scan
```

### 3. **Use Environment-Specific Keys**

- Use different Firebase projects for development/staging/production
- Never use production keys in development

### 4. **Monitor API Usage**

- Regularly check Firebase Console for unusual API usage
- Set up billing alerts
- Enable Firebase App Check

## Quick Reference Checklist

Before making repository public:

- [ ] Verify `.gitignore` includes all sensitive files
- [ ] Remove any committed sensitive files
- [ ] Search git history for sensitive data
- [ ] Rotate any exposed credentials
- [ ] Set up API key restrictions
- [ ] Enable Firebase App Check
- [ ] Document setup process for new developers
- [ ] Test building the app without committed credentials

## Resources

- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/basics)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [GitHub Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

## Support

If you've accidentally exposed credentials and need help:

1. Rotate credentials immediately (don't wait)
2. Check Firebase/Google Cloud Console for suspicious activity
3. Contact the project maintainers
4. Consider making the repository private temporarily while addressing the issue

---

**Remember:** Prevention is better than cure. Always double-check before committing!
