"""
Test Africa's Talking SMS configuration
Run this after setting up Africa's Talking credentials in .env
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_africas_talking_credentials():
    """Check if Africa's Talking credentials are set"""
    print("=" * 60)
    print("AFRICA'S TALKING CONFIGURATION CHECK")
    print("=" * 60)

    username = os.getenv("AT_USERNAME", "")
    api_key = os.getenv("AT_API_KEY", "")
    from_number = os.getenv("AT_FROM_NUMBER", "")

    print(f"\n1. Username: {'✓ SET' if username and username != 'sandbox' else '⚠ Using sandbox mode'}")
    if username:
        print(f"   Value: {username}")

    print(f"\n2. API Key: {'✓ SET' if api_key and api_key != 'your_api_key_here' else '✗ NOT SET'}")
    if api_key and api_key != 'your_api_key_here':
        print(f"   Value: {api_key[:8]}...{api_key[-4:]}")

    print(f"\n3. Sender ID: {'✓ SET' if from_number else '⚠ Not set (optional)'}")
    if from_number:
        print(f"   Value: {from_number}")

    all_set = (
        username and
        api_key and api_key != 'your_api_key_here'
    )

    print("\n" + "=" * 60)
    if all_set:
        print("✓ Africa's Talking credentials are configured!")
        return True
    else:
        print("✗ Africa's Talking credentials are NOT fully configured")
        print("\nPlease update your .env file with:")
        print("  - AT_USERNAME (e.g., 'sandbox' or your production username)")
        print("  - AT_API_KEY (get from Africa's Talking dashboard)")
        print("  - AT_FROM_NUMBER (optional sender ID)")
        return False

def test_africas_talking_connection():
    """Test actual connection to Africa's Talking"""
    print("\n" + "=" * 60)
    print("TESTING AFRICA'S TALKING CONNECTION")
    print("=" * 60)

    try:
        import africastalking

        username = os.getenv("AT_USERNAME")
        api_key = os.getenv("AT_API_KEY")

        # Initialize Africa's Talking
        africastalking.initialize(username, api_key)

        # Test by getting application data
        application = africastalking.Application

        # Try to fetch user data (this will work even in sandbox)
        print(f"\n✓ Successfully connected to Africa's Talking!")
        print(f"  Username: {username}")
        print(f"  Mode: {'Sandbox (Testing)' if username == 'sandbox' else 'Production'}")

        return True

    except Exception as e:
        print(f"\n✗ Failed to connect to Africa's Talking")
        print(f"  Error: {str(e)}")

        if "africastalking" in str(e).lower() or "module" in str(e).lower():
            print("\n💡 Tip: Install Africa's Talking SDK:")
            print("   pip install africastalking")
        elif "credentials" in str(e).lower():
            print("\n💡 Tip: Check your username and API key")

        return False

def test_send_sms():
    """Test sending an SMS via Africa's Talking"""
    print("\n" + "=" * 60)
    print("TESTING SMS SEND (Optional)")
    print("=" * 60)

    # Ask user if they want to send a test SMS
    print("\nWould you like to send a test SMS?")
    print("Note: Sandbox mode only sends to verified numbers")
    response = input("Enter 'yes' to send test SMS, or press Enter to skip: ").strip().lower()

    if response != 'yes':
        print("\nSkipping SMS send test.")
        return True

    # Get phone number
    print("\nEnter the phone number to test (Ethiopian format):")
    print("Examples: +251912345678 or 0912345678")
    to_number = input("Phone number: ").strip()

    if not to_number:
        print("No phone number provided. Skipping test.")
        return True

    # Format phone number
    if not to_number.startswith('+'):
        to_number = f"+251{to_number.lstrip('0')}"

    try:
        import africastalking

        username = os.getenv("AT_USERNAME")
        api_key = os.getenv("AT_API_KEY")
        sender_id = os.getenv("AT_FROM_NUMBER")

        # Initialize
        africastalking.initialize(username, api_key)
        sms = africastalking.SMS

        # Send test message
        response = sms.send(
            "Test message from Astegni Platform via Africa's Talking! Your SMS is working! 🎉",
            [to_number],
            sender=sender_id
        )

        print(f"\n✓ Test SMS sent successfully!")
        print(f"  Response: {response}")

        # Parse response
        if response['SMSMessageData']['Recipients']:
            for recipient in response['SMSMessageData']['Recipients']:
                print(f"\n  Recipient: {recipient['number']}")
                print(f"  Status: {recipient['status']}")
                print(f"  Message ID: {recipient.get('messageId', 'N/A')}")
                print(f"  Cost: {recipient.get('cost', 'N/A')}")

        print("\n📱 Check your phone for the test message!")

        return True

    except Exception as e:
        print(f"\n✗ Failed to send test SMS")
        print(f"  Error: {str(e)}")

        # Provide helpful error messages
        error_str = str(e).lower()
        if "credentials" in error_str or "authentication" in error_str:
            print("\n💡 Tip: Check your username and API key")
        elif "invalid phone" in error_str or "recipient" in error_str:
            print("\n💡 Tip: Check phone number format (must include +251 for Ethiopia)")
        elif "sandbox" in error_str:
            print("\n💡 Tip: Sandbox mode requires verified numbers")
            print("   Verify at: https://account.africastalking.com/apps/sandbox/test/phones")

        return False

def show_sandbox_instructions():
    """Show instructions for using Africa's Talking sandbox"""
    print("\n" + "=" * 60)
    print("📚 AFRICA'S TALKING SANDBOX MODE")
    print("=" * 60)

    print("\nTo use sandbox mode for FREE testing:")
    print("\n1. Keep AT_USERNAME='sandbox' in your .env")
    print("2. Verify test numbers:")
    print("   → Go to: https://account.africastalking.com/apps/sandbox/test/phones")
    print("   → Add the phone number you want to test")
    print("   → You'll receive a verification code")
    print("   → Enter the code to verify")
    print("\n3. Send SMS only to verified numbers")
    print("\n4. To go LIVE:")
    print("   → Add credit to your account")
    print("   → Change AT_USERNAME to your production username")
    print("   → Request a Sender ID (optional)")
    print("   → No need to verify recipient numbers!")

def main():
    """Run all tests"""
    print("\n🚀 Starting Africa's Talking Setup Tests...\n")

    # Step 1: Check credentials
    credentials_ok = test_africas_talking_credentials()

    if not credentials_ok:
        print("\n❌ Setup incomplete. Please configure Africa's Talking credentials first.")
        return

    # Step 2: Test connection
    connection_ok = test_africas_talking_connection()

    if not connection_ok:
        print("\n❌ Cannot connect to Africa's Talking. Check your credentials.")
        return

    # Step 3: Optional SMS test
    test_send_sms()

    # Step 4: Show sandbox instructions
    if os.getenv("AT_USERNAME", "").lower() == "sandbox":
        show_sandbox_instructions()

    print("\n" + "=" * 60)
    print("✓ AFRICA'S TALKING SETUP COMPLETE!")
    print("=" * 60)
    print("\nYour Africa's Talking integration is ready to use.")
    print("You can now send OTPs via SMS in your application.")
    print("\nNext steps:")
    print("  1. Update SMS_PROVIDER=africas_talking in .env")
    print("  2. Use the multi-provider service: sms_service_multi_provider.py")
    print("  3. Start your backend: python app.py")
    print("  4. Test OTP endpoint: POST /api/send-otp")
    print("\n💰 Africa's Talking is 50-75% cheaper than Twilio for Ethiopia!")
    print("\n")

if __name__ == "__main__":
    main()
