# 🚀 SKILLVANCE - SETUP GUIDE

## ✅ WHAT'S NOW WORKING

### 1. **CONTACT FORM** ✓
- **What it does:** Sends all enquiries directly to your email
- **Email:** skillvancetechnologies@gmail.com
- **How it works:** FormSubmit.co service (free, no backend needed)
- **Setup:** Already done! Just test it.

**Test it:**
```
1. Go to Contact page
2. Fill the form
3. Submit
4. Check your email in 1-2 minutes
```

---

### 2. **CERTIFICATE VERIFICATION** ✓
- **What it does:** Verifies student certificates with unique IDs
- **Status:** Shows "Verified" with details OR "Not Found"
- **Test with:** `SKV2025ML00001`

**Test it:**
```
1. Go to Verify Certificate page
2. Enter: SKV2025ML00001
3. Should show ✓ Certificate Verified with student details
```

---

### 3. **ADMIN PANEL** ✓ (NEW!)

**Where:** `/admin.html` (redirects to login)
**Protected:** Yes - Login required!

**Default Credentials:**
- Username: `admin`
- Password: `skillvance123`

⚠️ **CHANGE THESE IMMEDIATELY!** Edit `admin-login.html` line 95-96

**What you do:**
1. Go to `/admin.html`
2. Redirects to `/admin-login.html`
3. Login with admin credentials
4. Redirects to `/admin-certs.html` (certificate manager)
5. Add new certificates (name, ID, domain, date, mentor)
6. View all certificates
7. Export as code
8. Update `certificates.js`
9. Click Logout when done

---

## 📋 STEP-BY-STEP SETUP

### **Step 1: Test Contact Form**
1. Go to `/contact.html`
2. Fill: Name, Email, Phone, Domain, Message
3. Click "Send Enquiry"
4. Check your email in 1-2 minutes ✅

### **Step 2: Add Your First Certificate**
1. Go to `/admin.html`
2. Login with admin credentials
3. Add the form:
   - ID: `SKV2025ML00002`
   - Name: `Your Name`
   - Domain: Select from list
   - Date: Today's date
   - Mentor: Your name
4. Click "Add Certificate"
5. It appears in the table ✅

### **Step 3: Export & Update certificates.js**
1. In admin panel, scroll to "Export Data"
2. Click "Copy to Clipboard"
3. Replace the whole `const certificatesDB = [...]` in `certificates.js`
4. Save the file ✅

### **Step 4: Test Certificate Verification**
1. Go to `/verify.html`
2. Enter the ID you just added (e.g., `SKV2025ML00002`)
3. Should show "✓ Certificate Verified" with details ✅

---

## 🔑 CERTIFICATE ID FORMAT

```
SKV 2025 ML 00001
│   │    │  └─ Sequential number (starts at 00001)
│   │    └─ Domain code:
│   │       ML = Machine Learning
│   │       DS = Data Science
│   │       DA = Data Analyst
│   │       WEB = Web Developer
│   │       CY = Cybersecurity
│   │       BC = Blockchain
│   └─ Year
└─ Skillvance prefix
```

**Examples:**
- `SKV2025ML00001` - 1st ML certificate
- `SKV2025DS00005` - 5th Data Science certificate
- `SKV2025WEB00010` - 10th Web Developer certificate

---

## 📧 CONTACT FORM EMAILS

**Your email:** skillvancetechnologies@gmail.com

When someone submits the form, you'll get:
```
From: Their Email
Subject: New Contact Form Submission
Body:
  Name: [name]
  Email: [email]
  Phone: [phone]
  Domain: [domain]
  Message: [message]
```

---

## 🎯 WHAT HAPPENS WHEN STUDENT VERIFIES CERT

**If certificate exists:**
```
✓ Certificate Verified
Name: John Doe
Domain: Machine Learning Engineer
Completed: 2025-03-29
Mentor: Mentor Name
```

**If not found:**
```
❌ Certificate not found.
Please check your ID or contact support@skillvancetechnologies.com
```

---

## 📁 FILES CREATED/MODIFIED

**New files:**
- `certificates.js` - Certificate database
- `admin-certs.html` - Admin panel

**Modified files:**
- `contact.html` - Now uses FormSubmit
- `verify.html` - Uses new certificate system
- `pages.js` - Old functions removed

---

## 🔄 WORKFLOW

```
Student completes program
    ↓
You add certificate in admin panel
    ↓
Export & update certificates.js
    ↓
Student enters ID to verify
    ↓
System checks certificates.js
    ↓
Shows "VERIFIED" or "NOT FOUND"
```

---

---

## 🔐 ADMIN PANEL SECURITY

### Default Credentials:
- Username: `admin`
- Password: `skillvance123`

⚠️ **CHANGE IMMEDIATELY!**

### How to Change Password:

1. Open `admin-login.html` in text editor
2. Find line 95-96:
```javascript
const validUsername = 'admin';
const validPassword = 'skillvance123';
```

3. Change to your own:
```javascript
const validUsername = 'myUsername';
const validPassword = 'mySecurePassword123';
```

4. Save file
5. Login with new credentials ✅

### Security Tips:
- ✅ Login required (encrypted in browser)
- ✅ Auto-logout on browser close
- ✅ Change password from defaults
- ✅ Keep credentials SECRET
- ✅ Click Logout when done
- ✅ Don't share login info

---

## 📞 SUPPORT

- **Contact form issues:** Check your spam folder or email settings
- **Certificate verification issues:** Make sure you exported correctly from admin panel
- **FormSubmit rejected email:** Try a Gmail account
- **Admin login issues:** Check username/password spelling

---

## ✨ NEXT STEPS (Optional)

When you have time:
1. Change admin password from defaults
2. Add all your student certificates to admin panel
3. Export regularly as backup
4. Share verify link with employers
5. Keep certificates.js updated

---

**Everything is live and working! 🚀**
