# SMS Providers Setup Guide

This guide covers setup for multiple SMS providers. Choose the one that best fits your needs.

## 🌍 Provider Comparison for Ethiopia

| Provider | Cost/SMS (ETH) | Ethiopia Coverage | Setup Difficulty | Recommended For |
|----------|----------------|-------------------|------------------|-----------------|
| **Africa's Talking** | ~$0.02-0.04 | ⭐⭐⭐⭐⭐ Excellent | Easy | 🏆 **Best for Ethiopia** |
| **Twilio** | ~$0.08 | ⭐⭐⭐⭐ Good | Easy | Global/International |
| **Vonage** | ~$0.06 | ⭐⭐⭐ Good | Medium | Alternative to Twilio |
| **AWS SNS** | ~$0.06 | ⭐⭐⭐ Good | Hard | Already using AWS |
| **Local Gateway** | $0.01-0.02 | ⭐⭐⭐⭐⭐ Excellent | Varies | Cheapest option |

---

## 1️⃣ Africa's Talking (RECOMMENDED FOR ETHIOPIA)

### Why Choose Africa's Talking?
- **50-75% cheaper** than Twilio for Ethiopian SMS
- Best delivery rates in Ethiopia
- No trial limitations
- African-focused support

### Setup Steps

#### A. Sign Up
1. Go to [https://africastalking.com](https://africastalking.com)
2. Click "Get Started" and create an account
3. Verify your email

#### B. Get Credentials
1. Log in to [https://account.africastalking.com](https://account.africastalking.com)
2. Go to **Settings** → **API Key**
3. Click **Generate API Key** (save this - shown only once!)
4. Your username is usually displayed at the top (often `sandbox` for testing)

#### C. Get a Sender ID or Short Code
- **Sandbox Mode**: Use for free testing (sends to verified numbers only)
- **Production**:
  - Go to **SMS** → **Sender IDs**
  - Request a Sender ID (e.g., "ASTEGNI") - takes 1-2 days for approval
  - Or use a short code

#### D. Add to .env
```bash
# SMS Provider Selection
SMS_PROVIDER=africas_talking

# Africa's Talking Configuration
AT_USERNAME=sandbox                    # Your username (or 'sandbox' for testing)
AT_API_KEY=your_api_key_here          # API key from dashboard
AT_FROM_NUMBER=ASTEGNI                # Your approved sender ID (optional in sandbox)
```

#### E. Install SDK
```bash
pip install africastalking
```

#### F. Test
```bash
python test_africas_talking.py  # We'll create this script
```

---

## 2️⃣ Twilio (Currently Configured)

### Setup Steps

#### A. Sign Up
1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Create account and verify email/phone

#### B. Get Credentials
1. Go to [https://console.twilio.com](https://console.twilio.com)
2. Find on dashboard:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click eye icon to reveal)

#### C. Get Phone Number
1. Go to **Phone Numbers** → **Manage** → **Active Numbers**
2. Or buy new: **Phone Numbers** → **Buy a number**
3. Filter by SMS capability
4. Choose a number (US numbers work for Ethiopian SMS)

#### D. Add to .env
```bash
# SMS Provider Selection
SMS_PROVIDER=twilio

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_32_character_auth_token
TWILIO_FROM_NUMBER=+15551234567
```

#### E. Install SDK
```bash
pip install twilio
```

#### F. Test
```bash
python test_twilio_setup.py
```

---

## 3️⃣ Vonage (Nexmo)

### Setup Steps

#### A. Sign Up
1. Go to [https://dashboard.nexmo.com/sign-up](https://dashboard.nexmo.com/sign-up)
2. Create account (€2 free credit)

#### B. Get Credentials
1. Log in to [https://dashboard.nexmo.com](https://dashboard.nexmo.com)
2. Find on dashboard:
   - **API Key**
   - **API Secret**

#### C. Get Phone Number (Optional)
1. Go to **Numbers** → **Buy Numbers**
2. Or use brand name as sender (e.g., "Astegni")

#### D. Add to .env
```bash
# SMS Provider Selection
SMS_PROVIDER=vonage

# Vonage Configuration
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
VONAGE_FROM_NUMBER=Astegni  # Brand name or phone number
```

#### E. Install SDK
```bash
pip install vonage
```

---

## 4️⃣ AWS SNS

### Setup Steps

#### A. AWS Account
1. Create AWS account at [https://aws.amazon.com](https://aws.amazon.com)
2. Go to IAM and create user with SNS permissions

#### B. Get Credentials
1. Create access key in IAM
2. Download credentials (Access Key ID + Secret Access Key)

#### C. Enable SMS in SNS
1. Go to **SNS** → **Text Messaging (SMS)**
2. Set up spending limit
3. Request production access (for higher limits)

#### D. Add to .env
```bash
# SMS Provider Selection
SMS_PROVIDER=aws_sns

# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
AWS_SNS_SENDER_ID=Astegni
```

#### E. Install SDK
```bash
pip install boto3
```

---

## 📝 Complete .env Template

```bash
# ========================================
# SMS CONFIGURATION
# ========================================

# Choose your provider: twilio, africas_talking, vonage, aws_sns
SMS_PROVIDER=africas_talking

# --- Africa's Talking (RECOMMENDED FOR ETHIOPIA) ---
AT_USERNAME=sandbox
AT_API_KEY=your_api_key_here
AT_FROM_NUMBER=ASTEGNI

# --- Twilio ---
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_32_character_auth_token
TWILIO_FROM_NUMBER=+15551234567

# --- Vonage ---
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
VONAGE_FROM_NUMBER=Astegni

# --- AWS SNS ---
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
AWS_SNS_SENDER_ID=Astegni
```

---

## 🚀 How to Switch Providers

1. Update `.env` file with new provider credentials
2. Set `SMS_PROVIDER` to your chosen provider
3. Install required SDK: `pip install [provider-sdk]`
4. Restart your backend: `python app.py`

No code changes needed! The multi-provider service handles everything.

---

## 💰 Cost Comparison (1000 SMS to Ethiopia)

| Provider | Cost | Setup Fee | Monthly Fee |
|----------|------|-----------|-------------|
| Africa's Talking | $20-40 | Free | None |
| Twilio | $80 | Free | None |
| Vonage | $60 | Free | None |
| AWS SNS | $60 | Free | None |
| Local Gateway | $10-20 | Varies | Varies |

---

## 🧪 Testing Your Setup

### Test Script for All Providers
```bash
python test_sms_providers.py
```

### Manual Test via API
```bash
# Start backend
python app.py

# Send test OTP
curl -X POST http://localhost:8000/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"contact": "+251912345678", "method": "sms"}'
```

---

## 🔥 Quick Recommendations

### For Production (Ethiopia):
1. **Primary**: Africa's Talking (best coverage + price)
2. **Backup**: Twilio (reliable fallback)
3. **Local**: Ethiopian SMS gateway (cheapest)

### For Development:
- Africa's Talking Sandbox (free testing)
- Twilio Trial ($15 free credits)

### For International:
- Twilio (best global coverage)
- Vonage (good alternative)

---

## 📚 Additional Resources

- **Africa's Talking Docs**: [https://developers.africastalking.com](https://developers.africastalking.com)
- **Twilio Docs**: [https://www.twilio.com/docs/sms](https://www.twilio.com/docs/sms)
- **Vonage Docs**: [https://developer.vonage.com/messaging/sms/overview](https://developer.vonage.com/messaging/sms/overview)
- **AWS SNS Docs**: [https://docs.aws.amazon.com/sns/](https://docs.aws.amazon.com/sns/)

---

## ⚠️ Important Notes

### Trial Account Limitations
- **Twilio**: Can only send to verified numbers
- **Africa's Talking Sandbox**: Can only send to verified numbers
- **Vonage**: €2 free credit
- **AWS SNS**: Sandbox mode limits

### Phone Number Format
All providers expect international format: `+251912345678`
- Your service automatically adds +251 if missing

### Delivery Reports
- Check provider dashboard for delivery status
- Failed deliveries don't charge your account

---

## 🆘 Troubleshooting

### "Provider not found" error
- Check `SMS_PROVIDER` value in .env matches: twilio, africas_talking, vonage, or aws_sns

### "Credentials not configured" error
- Verify all required credentials are set in .env
- Restart backend after changing .env

### "Module not found" error
- Install the provider's SDK: `pip install [provider-name]`

### SMS not received
- Check phone number format (include +251)
- Verify number is verified (trial accounts)
- Check provider dashboard for delivery status
- Ensure you have credits/balance
