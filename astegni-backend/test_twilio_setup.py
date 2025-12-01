"""
Test Twilio SMS configuration
Run this script after setting up your Twilio credentials in .env
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_twilio_credentials():
    """Check if Twilio credentials are set"""
    print("=" * 60)
    print("TWILIO CONFIGURATION CHECK")
    print("=" * 60)

    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    from_number = os.getenv("TWILIO_FROM_NUMBER", "")

    print(f"\n1. Account SID: {'✓ SET' if account_sid and account_sid != 'your_twilio_account_sid_here' else '✗ NOT SET'}")
    if account_sid and account_sid != 'your_twilio_account_sid_here':
        print(f"   Value: {account_sid[:10]}...{account_sid[-4:]}")

    print(f"\n2. Auth Token: {'✓ SET' if auth_token and auth_token != 'your_twilio_auth_token_here' else '✗ NOT SET'}")
    if auth_token and auth_token != 'your_twilio_auth_token_here':
        print(f"   Value: {auth_token[:4]}...{auth_token[-4:]}")

    print(f"\n3. From Number: {'✓ SET' if from_number and from_number != '+1234567890' else '✗ NOT SET'}")
    if from_number and from_number != '+1234567890':
        print(f"   Value: {from_number}")

    all_set = (
        account_sid and account_sid != 'your_twilio_account_sid_here' and
        auth_token and auth_token != 'your_twilio_auth_token_here' and
        from_number and from_number != '+1234567890'
    )

    print("\n" + "=" * 60)
    if all_set:
        print("✓ All Twilio credentials are configured!")
        return True
    else:
        print("✗ Twilio credentials are NOT fully configured")
        print("\nPlease update your .env file with:")
        print("  - TWILIO_ACCOUNT_SID (starts with AC...)")
        print("  - TWILIO_AUTH_TOKEN (32 characters)")
        print("  - TWILIO_FROM_NUMBER (e.g., +15551234567)")
        return False

def test_twilio_connection():
    """Test actual connection to Twilio"""
    print("\n" + "=" * 60)
    print("TESTING TWILIO CONNECTION")
    print("=" * 60)

    try:
        from twilio.rest import Client

        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")

        client = Client(account_sid, auth_token)

        # Test by fetching account details
        account = client.api.accounts(account_sid).fetch()

        print(f"\n✓ Successfully connected to Twilio!")
        print(f"  Account Name: {account.friendly_name}")
        print(f"  Account Status: {account.status}")
        print(f"  Account Type: {account.type}")

        return True

    except Exception as e:
        print(f"\n✗ Failed to connect to Twilio")
        print(f"  Error: {str(e)}")
        return False

def test_send_sms():
    """Test sending an SMS"""
    print("\n" + "=" * 60)
    print("TESTING SMS SEND (Optional)")
    print("=" * 60)

    # Ask user if they want to send a test SMS
    print("\nWould you like to send a test SMS?")
    print("Note: This will use your Twilio credits (~$0.0075 per SMS)")
    response = input("Enter 'yes' to send test SMS, or press Enter to skip: ").strip().lower()

    if response != 'yes':
        print("\nSkipping SMS send test.")
        return True

    # Get phone number
    print("\nEnter the phone number to test (include country code):")
    print("Examples: +251912345678 (Ethiopia) or +15551234567 (US)")
    to_number = input("Phone number: ").strip()

    if not to_number:
        print("No phone number provided. Skipping test.")
        return True

    try:
        from twilio.rest import Client

        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_number = os.getenv("TWILIO_FROM_NUMBER")

        client = Client(account_sid, auth_token)

        # Send test message
        message = client.messages.create(
            body="Test message from Astegni Platform. Your Twilio SMS is working! 🎉",
            from_=from_number,
            to=to_number
        )

        print(f"\n✓ Test SMS sent successfully!")
        print(f"  Message SID: {message.sid}")
        print(f"  Status: {message.status}")
        print(f"  To: {message.to}")
        print(f"  From: {message.from_}")

        print("\n📱 Check your phone for the test message!")

        return True

    except Exception as e:
        print(f"\n✗ Failed to send test SMS")
        print(f"  Error: {str(e)}")

        # Provide helpful error messages
        error_str = str(e).lower()
        if "authenticate" in error_str or "credentials" in error_str:
            print("\n💡 Tip: Check your Account SID and Auth Token")
        elif "unverified" in error_str:
            print("\n💡 Tip: Trial accounts can only send to verified numbers")
            print("   Verify numbers at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified")
        elif "not a valid" in error_str or "invalid" in error_str:
            print("\n💡 Tip: Check phone number format (must include country code with +)")

        return False

def main():
    """Run all tests"""
    print("\n🚀 Starting Twilio Setup Tests...\n")

    # Step 1: Check credentials
    credentials_ok = test_twilio_credentials()

    if not credentials_ok:
        print("\n❌ Setup incomplete. Please configure Twilio credentials first.")
        return

    # Step 2: Test connection
    connection_ok = test_twilio_connection()

    if not connection_ok:
        print("\n❌ Cannot connect to Twilio. Check your credentials.")
        return

    # Step 3: Optional SMS test
    test_send_sms()

    print("\n" + "=" * 60)
    print("✓ TWILIO SETUP COMPLETE!")
    print("=" * 60)
    print("\nYour Twilio integration is ready to use.")
    print("You can now send OTPs via SMS in your application.")
    print("\nNext steps:")
    print("  1. Start your backend: cd astegni-backend && python app.py")
    print("  2. Test OTP endpoint: POST /api/send-otp")
    print("\n")

if __name__ == "__main__":
    main()
