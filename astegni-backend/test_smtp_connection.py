"""
Test SMTP connection and send test email
Run this after updating your App Password in .env
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_smtp_connection():
    """Test SMTP connection and authentication"""

    # Get SMTP settings from .env
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("FROM_EMAIL", smtp_user)
    from_name = os.getenv("FROM_NAME", "Astegni")

    print("=" * 60)
    print("SMTP Configuration Test")
    print("=" * 60)
    print(f"SMTP Host: {smtp_host}")
    print(f"SMTP Port: {smtp_port}")
    print(f"SMTP User: {smtp_user}")
    print(f"From Email: {from_email}")
    print(f"From Name: {from_name}")
    print(f"Password: {'*' * len(smtp_password) if smtp_password else '(NOT SET)'}")
    print("=" * 60)

    # Check if credentials are set
    if not smtp_user or not smtp_password:
        print("\n❌ ERROR: SMTP_USER or SMTP_PASSWORD not set in .env file")
        return False

    try:
        print("\n🔌 Step 1: Connecting to SMTP server...")
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        print("✅ Connected to SMTP server")

        print("\n🔒 Step 2: Starting TLS encryption...")
        server.starttls()
        print("✅ TLS encryption started")

        print(f"\n🔑 Step 3: Authenticating as {smtp_user}...")
        server.login(smtp_user, smtp_password)
        print("✅ Authentication successful!")

        # Ask if user wants to send a test email
        print("\n" + "=" * 60)
        test_email = input("Enter email address to send test email (or press Enter to skip): ").strip()

        if test_email:
            print(f"\n📧 Sending test email to {test_email}...")

            # Create test message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = "✓ Astegni SMTP Test - Configuration Successful"
            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = test_email

            # Plain text version
            text = f"""
Hello,

This is a test email from Astegni Educational Platform.

Your SMTP configuration is working correctly!

Configuration Details:
- SMTP Host: {smtp_host}
- SMTP Port: {smtp_port}
- From: {from_email}

Best regards,
Astegni Team
            """

            # HTML version
            html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
        .success-badge {{ background: #10B981; color: white; border-radius: 5px; padding: 10px; text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }}
        .info-box {{ background: #fff; border-left: 4px solid #10B981; padding: 15px; margin: 15px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✓ SMTP Configuration Successful</h1>
        </div>
        <div class="content">
            <div class="success-badge">
                Your email configuration is working correctly!
            </div>
            <p>Hello,</p>
            <p>This is a test email from <strong>Astegni Educational Platform</strong>.</p>
            <p>If you're seeing this message, it means your SMTP configuration has been set up successfully and emails are being sent correctly.</p>

            <div class="info-box">
                <strong>Configuration Details:</strong><br>
                • SMTP Host: {smtp_host}<br>
                • SMTP Port: {smtp_port}<br>
                • From Email: {from_email}
            </div>

            <p>You can now use this configuration for:</p>
            <ul>
                <li>OTP verification emails</li>
                <li>Password reset emails</li>
                <li>User notifications</li>
                <li>Admin invitations</li>
            </ul>

            <div class="footer">
                <p>&copy; 2024 Astegni - Ethiopian Educational Platform</p>
                <p>This is an automated test email.</p>
            </div>
        </div>
    </div>
</body>
</html>
            """

            # Attach both versions
            part1 = MIMEText(text, 'plain')
            part2 = MIMEText(html, 'html')
            msg.attach(part1)
            msg.attach(part2)

            # Send the email
            server.send_message(msg)
            print(f"✅ Test email sent successfully to {test_email}!")
            print("\n📬 Check your inbox (and spam folder) for the test email.")

        server.quit()

        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED - SMTP Configuration is working!")
        print("=" * 60)
        print("\n✓ You can now use email features in your application:")
        print("  • OTP verification")
        print("  • Password resets")
        print("  • Notifications")
        print("  • Admin invitations")
        print("\n")

        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"\n❌ Authentication Error: {str(e)}")
        print("\n🔧 Troubleshooting:")
        print("  1. Make sure you're using an App Password, NOT your regular password")
        print("  2. Enable 2-Step Verification on your Google account")
        print("  3. Generate a new App Password at: https://myaccount.google.com/apppasswords")
        print("  4. Update SMTP_PASSWORD in your .env file")
        print("  5. Make sure there are no extra spaces in the password")
        return False

    except smtplib.SMTPException as e:
        print(f"\n❌ SMTP Error: {str(e)}")
        print("\n🔧 Check your SMTP settings in .env file")
        return False

    except Exception as e:
        print(f"\n❌ Unexpected Error: {str(e)}")
        print(f"Error Type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    success = test_smtp_connection()
    exit(0 if success else 1)
