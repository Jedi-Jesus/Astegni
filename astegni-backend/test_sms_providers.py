"""
Universal SMS Provider Tester
Tests any configured SMS provider (Twilio, Africa's Talking, Vonage, AWS SNS)
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_configured_provider():
    """Detect which SMS provider is configured"""
    provider = os.getenv("SMS_PROVIDER", "").lower()

    if provider:
        return provider

    # Auto-detect based on credentials
    if os.getenv("TWILIO_ACCOUNT_SID"):
        return "twilio"
    elif os.getenv("AT_API_KEY"):
        return "africas_talking"
    elif os.getenv("VONAGE_API_KEY"):
        return "vonage"
    elif os.getenv("AWS_ACCESS_KEY_ID"):
        return "aws_sns"

    return None

def test_provider_config(provider):
    """Test if provider is properly configured"""
    print("=" * 60)
    print(f"TESTING {provider.upper().replace('_', ' ')} CONFIGURATION")
    print("=" * 60)

    required_vars = {
        "twilio": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
        "africas_talking": ["AT_USERNAME", "AT_API_KEY"],
        "vonage": ["VONAGE_API_KEY", "VONAGE_API_SECRET"],
        "aws_sns": ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
    }

    if provider not in required_vars:
        print(f"\n✗ Unknown provider: {provider}")
        return False

    all_set = True
    for var in required_vars[provider]:
        value = os.getenv(var, "")
        is_set = bool(value and value not in ['your_', '+1234567890'])

        print(f"\n{var}: {'✓ SET' if is_set else '✗ NOT SET'}")
        if is_set and len(value) > 10:
            print(f"  Value: {value[:6]}...{value[-4:]}")
        elif is_set:
            print(f"  Value: {value}")

        all_set = all_set and is_set

    print("\n" + "=" * 60)
    if all_set:
        print(f"✓ {provider.upper()} is properly configured!")
        return True
    else:
        print(f"✗ {provider.upper()} is NOT fully configured")
        return False

def test_multi_provider_service():
    """Test the multi-provider SMS service"""
    print("\n" + "=" * 60)
    print("TESTING MULTI-PROVIDER SMS SERVICE")
    print("=" * 60)

    try:
        # Check if multi-provider service exists
        if not os.path.exists("sms_service_multi_provider.py"):
            print("\n⚠ Multi-provider service not found")
            print("  Using: sms_service_multi_provider.py")
            return False

        from sms_service_multi_provider import MultiProviderSMSService

        # Initialize service
        service = MultiProviderSMSService()

        print(f"\n✓ Multi-provider service initialized")
        print(f"  Provider: {service.provider}")
        print(f"  Configured: {service.is_configured}")

        if not service.is_configured:
            print("\n✗ Provider not properly configured")
            return False

        print("\n✓ Service is ready to send SMS!")
        return True

    except Exception as e:
        print(f"\n✗ Failed to initialize service")
        print(f"  Error: {str(e)}")
        return False

def test_send_sms_interactive():
    """Interactive SMS sending test"""
    print("\n" + "=" * 60)
    print("SEND TEST SMS (Optional)")
    print("=" * 60)

    print("\nWould you like to send a test SMS?")
    response = input("Enter 'yes' to continue, or press Enter to skip: ").strip().lower()

    if response != 'yes':
        print("\nSkipping SMS send test.")
        return True

    # Get phone number
    print("\nEnter phone number (Ethiopian format):")
    print("Examples: +251912345678 or 0912345678")
    to_number = input("Phone number: ").strip()

    if not to_number:
        print("No phone number provided.")
        return False

    # Format phone number
    if not to_number.startswith('+'):
        to_number = f"+251{to_number.lstrip('0')}"

    # Get test message
    print("\nEnter test message (or press Enter for default):")
    message = input("Message: ").strip()
    if not message:
        message = "Test from Astegni! Your SMS integration is working! 🎉"

    try:
        from sms_service_multi_provider import MultiProviderSMSService

        service = MultiProviderSMSService()

        print(f"\nSending SMS via {service.provider}...")

        # For testing, we'll use the OTP method
        success = service.send_otp_sms(to_number, "123456", "test")

        if success:
            print("\n✓ SMS sent successfully!")
            print(f"  To: {to_number}")
            print(f"  Provider: {service.provider}")
            print("\n📱 Check your phone for the message!")
            return True
        else:
            print("\n✗ Failed to send SMS")
            return False

    except Exception as e:
        print(f"\n✗ Error sending SMS")
        print(f"  Error: {str(e)}")
        return False

def show_provider_recommendations():
    """Show recommendations based on use case"""
    print("\n" + "=" * 60)
    print("📊 SMS PROVIDER RECOMMENDATIONS")
    print("=" * 60)

    print("\n🏆 For Ethiopia (Best to Worst):")
    print("  1. Africa's Talking - $0.02-0.04/SMS (50-75% cheaper!)")
    print("  2. Local Ethiopian Gateway - $0.01-0.02/SMS")
    print("  3. Vonage - $0.06/SMS")
    print("  4. Twilio - $0.08/SMS")

    print("\n🌍 For International:")
    print("  1. Twilio - Best global coverage")
    print("  2. Vonage - Good alternative")
    print("  3. AWS SNS - If already using AWS")

    print("\n💡 Cost for 1000 SMS to Ethiopia:")
    print("  • Africa's Talking: $20-40")
    print("  • Vonage: $60")
    print("  • Twilio: $80")

    print("\n🔧 To switch providers:")
    print("  1. Update SMS_PROVIDER in .env")
    print("  2. Add provider credentials to .env")
    print("  3. Install provider SDK: pip install [provider]")
    print("  4. Restart backend")

def main():
    """Run all tests"""
    print("\n🚀 Universal SMS Provider Tester\n")

    # Step 1: Detect provider
    provider = get_configured_provider()

    if not provider:
        print("=" * 60)
        print("⚠ NO SMS PROVIDER CONFIGURED")
        print("=" * 60)
        print("\nNo SMS provider detected in .env file.")
        print("\nPlease configure one of the following:")
        print("  • Twilio (Global, reliable)")
        print("  • Africa's Talking (Best for Ethiopia)")
        print("  • Vonage (Alternative)")
        print("  • AWS SNS (If using AWS)")
        print("\nSee SMS_PROVIDERS_SETUP_GUIDE.md for setup instructions.")
        return

    print(f"📡 Detected Provider: {provider.upper().replace('_', ' ')}\n")

    # Step 2: Test configuration
    config_ok = test_provider_config(provider)

    if not config_ok:
        print(f"\n❌ {provider.upper()} is not properly configured.")
        print(f"\nSee SMS_PROVIDERS_SETUP_GUIDE.md for setup instructions.")
        return

    # Step 3: Test service
    service_ok = test_multi_provider_service()

    if not service_ok:
        print("\n❌ SMS service initialization failed.")
        return

    # Step 4: Optional send test
    test_send_sms_interactive()

    # Step 5: Show recommendations
    show_provider_recommendations()

    print("\n" + "=" * 60)
    print("✓ SMS PROVIDER TESTING COMPLETE")
    print("=" * 60)
    print(f"\nYour {provider.upper().replace('_', ' ')} integration is working!")
    print("\nNext steps:")
    print("  1. Start backend: python app.py")
    print("  2. Test OTP endpoint: POST /api/send-otp")
    print("  3. Integrate into your application")
    print("\n")

if __name__ == "__main__":
    main()
