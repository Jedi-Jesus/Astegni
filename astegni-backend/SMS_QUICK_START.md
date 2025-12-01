# SMS Quick Start Guide

## 🚀 Quick Setup (Choose One Provider)

### Option 1: Africa's Talking (Recommended for Ethiopia - 75% cheaper!)

```bash
# 1. Sign up at https://africastalking.com
# 2. Get API key from dashboard
# 3. Add to .env:
SMS_PROVIDER=africas_talking
AT_USERNAME=sandbox
AT_API_KEY=your_api_key_here
AT_FROM_NUMBER=ASTEGNI

# 4. Install & test
pip install africastalking
python test_africas_talking.py
```

**Cost**: $0.02-0.04/SMS to Ethiopia

---

### Option 2: Twilio (Global, Most Popular)

```bash
# 1. Sign up at https://www.twilio.com/try-twilio
# 2. Get credentials from https://console.twilio.com
# 3. Add to .env:
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_32_character_auth_token
TWILIO_FROM_NUMBER=+15551234567

# 4. Install & test
pip install twilio
python test_twilio_setup.py
```

**Cost**: $0.08/SMS to Ethiopia

---

### Option 3: Vonage (Alternative)

```bash
# 1. Sign up at https://dashboard.nexmo.com/sign-up
# 2. Get API key and secret from dashboard
# 3. Add to .env:
SMS_PROVIDER=vonage
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
VONAGE_FROM_NUMBER=Astegni

# 4. Install
pip install vonage
```

**Cost**: $0.06/SMS to Ethiopia

---

## 📝 .env Configuration

Add these lines to `astegni-backend/.env`:

```bash
# Choose your provider
SMS_PROVIDER=africas_talking  # or twilio, vonage, aws_sns

# Africa's Talking
AT_USERNAME=sandbox
AT_API_KEY=your_api_key_here
AT_FROM_NUMBER=ASTEGNI

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_32_character_auth_token
TWILIO_FROM_NUMBER=+15551234567

# Vonage
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
VONAGE_FROM_NUMBER=Astegni
```

---

## 🧪 Testing

```bash
# Test any configured provider
python test_sms_providers.py

# Test Africa's Talking specifically
python test_africas_talking.py

# Test Twilio specifically
python test_twilio_setup.py
```

---

## 🔧 Using in Your App

### Option A: Use Multi-Provider Service (Recommended)

Replace your current `sms_service.py` import:

```python
# In your app.py or routes
from sms_service_multi_provider import sms_service

# Send OTP (works with any provider!)
success = sms_service.send_otp_sms("+251912345678", "123456", "verification")
```

### Option B: Keep Current Service (Twilio Only)

No changes needed - continue using:
```python
from sms_service import sms_service
```

---

## 💰 Cost Comparison for 1000 SMS to Ethiopia

| Provider | Cost | Savings vs Twilio |
|----------|------|-------------------|
| **Africa's Talking** | **$20-40** | **Save $40-60 (50-75%)** |
| Vonage | $60 | Save $20 (25%) |
| Twilio | $80 | - |

---

## 📞 Phone Number Format

All providers expect international format:
- ✅ `+251912345678` (with country code)
- ✅ `0912345678` (auto-converted to +251)
- ❌ `912345678` (missing leading 0)

Your service handles conversion automatically!

---

## 🆘 Quick Troubleshooting

### "Provider not configured"
→ Check .env has correct credentials for chosen provider

### "Module not found"
→ Install provider SDK: `pip install [provider-name]`

### "SMS not received"
→ Trial accounts need verified numbers (check provider dashboard)

### "Authentication failed"
→ Double-check API keys/tokens in .env

---

## 📚 Full Documentation

- **Complete Guide**: `SMS_PROVIDERS_SETUP_GUIDE.md`
- **Twilio Setup**: Run `python test_twilio_setup.py`
- **Africa's Talking**: Run `python test_africas_talking.py`

---

## ⭐ Recommendation

**For Ethiopia: Use Africa's Talking**
- 50-75% cheaper than Twilio
- Best delivery rates
- Free sandbox testing
- African-focused support

**For Global: Use Twilio**
- Best worldwide coverage
- Excellent documentation
- Most reliable

---

## 🎯 Next Steps

1. Choose a provider (Africa's Talking recommended)
2. Sign up and get credentials
3. Update `.env` file
4. Install SDK: `pip install [provider]`
5. Test: `python test_sms_providers.py`
6. Start backend: `python app.py`
7. Test OTP endpoint: `POST /api/send-otp`

Done! 🎉
