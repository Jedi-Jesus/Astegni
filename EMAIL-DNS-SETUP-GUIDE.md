# Email Authentication DNS Setup Guide

## Problem: Email Delivery Blocked

Gmail is blocking emails from `noreplay@astegni.com` with error:

```
550 5.7.26 Your email has been blocked because the sender is unauthenticated.
Gmail requires all senders to authenticate with either SPF or DKIM.
```

**Cause**: Missing SPF and DKIM DNS records for astegni.com domain

**Solution**: Configure DNS records in Squarespace to authenticate emails

---

## Required DNS Records

You need to add **2 TXT records** to your Squarespace DNS:

### 1. SPF Record (Sender Policy Framework)
Tells Gmail that Google is allowed to send emails for astegni.com

### 2. DKIM Record (DomainKeys Identified Mail)
Provides digital signature to verify email authenticity

---

## Step-by-Step: Add SPF Record in Squarespace

### 1. Log into Squarespace
Go to: https://account.squarespace.com

### 2. Navigate to DNS Settings
- Click **Settings** (left sidebar)
- Click **Domains**
- Click **astegni.com**
- Click **DNS Settings** or **Advanced Settings**

### 3. Check for Existing SPF Record
Look for a TXT record with:
- Host: `@` or blank
- Value starting with: `v=spf1`

### 4. Add SPF Record (if missing)

**Click "Add Record" or "Add"**

Fill in:
```
Record Type: TXT
Host: @
Data/Value: v=spf1 include:_spf.google.com ~all
TTL: 3600 (or leave default)
```

**Click Save**

---

## Step-by-Step: Add DKIM Record

### 1. Get DKIM Record from Google Workspace

**Go to Google Admin Console:**
1. Visit: https://admin.google.com
2. Log in with your admin account (noreplay@astegni.com or your admin email)
3. Navigate to: **Apps → Google Workspace → Gmail**
4. Click: **Authenticate email**

**Generate DKIM Record:**
1. You'll see a section titled "Authenticate email"
2. Look for **DKIM authentication**
3. Click **"Generate new record"** (if not already generated)
   - Or click **"View details"** if already generated

**Copy the DKIM details:**
You'll see something like:
```
DNS Host name (TXT record name):
google._domainkey

TXT record value:
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx7Hd...
(very long string - 300+ characters)
```

**COPY BOTH**: The host name AND the full TXT value

### 2. Add DKIM Record in Squarespace

**Go back to Squarespace DNS Settings**

**Click "Add Record"**

Fill in:
```
Record Type: TXT
Host: google._domainkey
Data/Value: [paste the entire DKIM value from Google]
TTL: 3600 (or leave default)
```

**Example DKIM value** (yours will be different):
```
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx7HdMm67Yj5X9gLNT...
```

**Click Save**

### 3. Start Authentication in Google Workspace

After adding the DKIM record to Squarespace:

1. **Go back to Google Admin Console**
2. On the **Authenticate email** page
3. Click **"Start authentication"** button
4. Google will verify the DKIM record exists in your DNS

**Note**: This may take 24-48 hours to verify after DNS propagation

---

## Verification Checklist

After adding both records, verify they're configured correctly:

### Check SPF Record
1. Go to: https://mxtoolbox.com/spf.aspx
2. Enter: `astegni.com`
3. Click "SPF Record Lookup"
4. Should show: `v=spf1 include:_spf.google.com ~all`
5. Status should be: ✓ Valid

### Check DKIM Record
1. Go to: https://mxtoolbox.com/dkim.aspx
2. Enter domain: `astegni.com`
3. Enter selector: `google`
4. Click "DKIM Lookup"
5. Should show your DKIM record
6. Status should be: ✓ Valid

### Check Overall Email Authentication
1. Go to: https://toolbox.googleapps.com/apps/checkmx/
2. Enter: `astegni.com`
3. Click "Check domain"
4. Should show:
   - ✓ MX records found
   - ✓ SPF record found
   - ✓ DKIM configured

---

## DNS Propagation Time

**How long does it take?**
- Minimum: 15-30 minutes
- Typical: 1-2 hours
- Maximum: 24-48 hours

**Check if DNS has propagated:**
- Use: https://dnschecker.org
- Enter: `astegni.com`
- Select: TXT records
- Check multiple locations worldwide

---

## Expected DNS Configuration

After setup, your DNS should look like this:

### MX Records (Mail Exchange - probably already there)
```
Priority  Type  Host  Points To                    TTL
1         MX    @     ASPMX.L.GOOGLE.COM          3600
5         MX    @     ALT1.ASPMX.L.GOOGLE.COM     3600
5         MX    @     ALT2.ASPMX.L.GOOGLE.COM     3600
10        MX    @     ALT3.ASPMX.L.GOOGLE.COM     3600
10        MX    @     ALT4.ASPMX.L.GOOGLE.COM     3600
```

### TXT Records (Need to add these)
```
Type  Host              Value                                           TTL
TXT   @                 v=spf1 include:_spf.google.com ~all            3600
TXT   google._domainkey v=DKIM1; k=rsa; p=MIIBIjANBgkqhki... (long)   3600
```

---

## Testing Email Delivery After DNS Setup

### Wait for DNS Propagation
Give it at least 1-2 hours after adding records

### Test Email Authentication
```bash
cd astegni-backend
python test_send_email.py jediael.s.abebe@gmail.com
```

### Check Email Headers
When you receive the test email:
1. Open the email in Gmail
2. Click the three dots (⋮) menu
3. Click "Show original"
4. Look for these headers:

**Should now show:**
```
SPF: PASS
DKIM: PASS
DMARC: PASS (if configured)
```

---

## Troubleshooting

### SPF Record Issues

**Problem**: SPF not found
**Solution**:
- Make sure Host is `@` or blank (not `astegni.com`)
- Value must be exactly: `v=spf1 include:_spf.google.com ~all`
- No typos in `_spf.google.com`

**Problem**: Multiple SPF records
**Solution**:
- Only ONE SPF record allowed per domain
- If you have multiple, combine them into one record

### DKIM Record Issues

**Problem**: DKIM not found
**Solution**:
- Host must be exactly: `google._domainkey` (not `@`)
- Make sure you copied the ENTIRE DKIM value (it's very long)
- No line breaks in the value

**Problem**: Google can't verify DKIM
**Solution**:
- Wait 24-48 hours for DNS propagation
- Check record exists: `dig TXT google._domainkey.astegni.com`
- Make sure no extra spaces or quotes in the value

### Still Getting Blocked After DNS Setup

**Possible causes:**
1. **DNS not propagated yet** - Wait longer (up to 48 hours)
2. **DKIM not activated in Google** - Click "Start authentication" button
3. **Typo in DNS records** - Double-check spelling
4. **Wrong DNS zone** - Make sure editing astegni.com, not subdomain

---

## Alternative: Use Google Workspace Gmail Interface

If DNS setup is too complex, you can temporarily send emails through Google Workspace's web interface to verify it works, then focus on SMTP authentication.

---

## Squarespace DNS Help

If you need help finding DNS settings in Squarespace:

1. **Squarespace Help**: https://support.squarespace.com/hc/en-us/articles/205812378
2. **Contact Squarespace Support**: They can help add DNS records
3. **Phone**: Available for domains purchased through Squarespace

---

## Google Workspace DKIM Help

If you need help with Google Workspace DKIM:

1. **DKIM Setup Guide**: https://support.google.com/a/answer/174124
2. **Email Authentication**: https://support.google.com/a/answer/33786
3. **Google Workspace Support**: https://support.google.com/a/

---

## Quick Reference: DNS Record Values

Copy these exact values when adding records:

**SPF Record:**
```
Type: TXT
Host: @
Value: v=spf1 include:_spf.google.com ~all
```

**DKIM Record:**
```
Type: TXT
Host: google._domainkey
Value: [GET THIS FROM admin.google.com → Gmail → Authenticate email]
```

---

## Next Steps

1. ✅ Add SPF record to Squarespace DNS
2. ✅ Generate DKIM record in Google Workspace
3. ✅ Add DKIM record to Squarespace DNS
4. ✅ Start authentication in Google Workspace
5. ⏳ Wait 1-2 hours for DNS propagation
6. ✅ Verify records with online tools
7. ✅ Test email delivery again
8. ✅ Check "Show original" headers in Gmail

---

## Priority Actions (Do These Now!)

### 1. Add SPF Record (5 minutes)
- Log into Squarespace
- Add TXT record: `v=spf1 include:_spf.google.com ~all`
- Save

### 2. Get DKIM from Google (5 minutes)
- Log into admin.google.com
- Go to Gmail → Authenticate email
- Copy DKIM record details

### 3. Add DKIM Record (5 minutes)
- Back to Squarespace DNS
- Add TXT record with DKIM value
- Save

### 4. Activate DKIM (1 minute)
- Back to Google Workspace
- Click "Start authentication"

### 5. Wait (1-2 hours)
- DNS propagation takes time
- Check status with online tools

### 6. Test Again (1 minute)
- Send test email
- Should now be delivered!

---

**Total Setup Time**: 15-20 minutes + waiting for DNS propagation

**After DNS propagation, emails will be authenticated and delivered successfully!** ✅
