# SMS Configuration - Quick Start Guide 🚀

## 3-Step Installation

### Step 1: Create Database Tables (2 minutes)
```bash
cd astegni-backend
python migrate_sms_config.py
```

Expected output:
```
Creating system_sms_config table...
✅ system_sms_config table created
Creating system_sms_log table...
✅ system_sms_log table created
Creating indexes...
✅ Indexes created
Inserting default SMS configuration...
✅ Default SMS configuration inserted
✅ SMS configuration migration completed successfully!
```

### Step 2: Add Backend Endpoints (5 minutes)

Open `astegni-backend/system_settings_endpoints.py` and add the endpoints from `SMS_ENDPOINTS_TO_ADD.py` after line 807 (after the `/test-email` endpoint).

**Copy-paste location**: Right after this:
```python
@router.post("/test-email")
async def send_test_email(data: Dict[str, Any]):
    ...
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending test email: {str(e)}")


# ADD SMS ENDPOINTS HERE ⬇️
```

### Step 3: Restart Backend (1 minute)
```bash
# Stop the current server (Ctrl+C)
cd astegni-backend
python app.py
```

## Quick Test

1. **Open Admin Panel**
   - Navigate to: http://localhost:8080/admin-pages/manage-system-settings.html
   - Login if needed

2. **Click "SMS Configuration" in sidebar** (📱 icon)

3. **Enter Test Credentials** (or real Twilio credentials):
   - Account SID: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Auth Token: `your_token_here`
   - Phone Number: `+1234567890`

4. **Test Connection**
   - Click "Test Connection" button
   - Should see success message

5. **Send Test SMS** (optional):
   - Enter your phone number
   - Edit test message
   - Click "Send Test SMS"
   - Check your phone!

## What You Get

✅ **SMS Configuration Panel** - Full Twilio setup interface
✅ **Real-time Statistics** - Track sent, delivered, pending, failed SMS
✅ **Test SMS Feature** - Send test messages to verify setup
✅ **Connection Testing** - Verify Twilio credentials without sending
✅ **OTP Settings** - Configure OTP expiry, length, and format
✅ **Character Counter** - 160-char SMS limit tracking
✅ **Daily Limits** - Set and monitor daily SMS usage
✅ **Templates UI** - Pre-built SMS templates (OTP, Welcome, Notifications)

## Troubleshooting

### Migration fails
```bash
# Check database connection
python test_connection.py

# Check if tables already exist
psql -d astegni_db -c "\dt system_sms*"
```

### Backend won't start
- Make sure you added the endpoints correctly
- Check for syntax errors in system_settings_endpoints.py
- Verify imports are at the top of the file

### Test connection fails
- Verify Twilio credentials are correct
- Check that sms_service.py exists
- Ensure Twilio library is installed: `pip install twilio`

### SMS not sending
- Check Twilio account balance
- Verify phone number format includes country code (+)
- Check backend logs for error messages
- Ensure SMS service is enabled in config

## Configuration via .env (Alternative)

Instead of using the UI, you can configure via environment variables:

```env
# Add to astegni-backend/.env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890
```

The UI will override these values when you save configuration.

## Next Steps

1. ✅ Complete installation (Steps 1-3 above)
2. ✅ Test with real Twilio credentials
3. ✅ Send test SMS to your phone
4. ✅ Monitor statistics in real-time
5. 🔄 Optionally: Implement SMS templates editing (future)
6. 🔄 Optionally: Add SMS logs viewing (future)

## Support

- See [SMS-CONFIGURATION-IMPLEMENTATION-COMPLETE.md](SMS-CONFIGURATION-IMPLEMENTATION-COMPLETE.md) for full documentation
- Check [astegni-backend/sms_service.py](astegni-backend/sms_service.py) for SMS sending implementation
- Review [astegni-backend/SMS_ENDPOINTS_TO_ADD.py](astegni-backend/SMS_ENDPOINTS_TO_ADD.py) for endpoint code

---

**Total Setup Time**: ~10 minutes
**Difficulty**: Easy
**Status**: Ready to use ✅
