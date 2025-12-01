"""
Simple SMTP test without emojis (Windows-compatible)
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_smtp():
    """Test SMTP connection"""

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
    print(f"Password: {'*' * len(smtp_password)}")
    print("=" * 60)

    if not smtp_user or not smtp_password:
        print("\nERROR: SMTP_USER or SMTP_PASSWORD not set")
        return False

    try:
        print("\n[1/3] Connecting to SMTP server...")
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        print("SUCCESS: Connected to SMTP server")

        print("\n[2/3] Starting TLS encryption...")
        server.starttls()
        print("SUCCESS: TLS encryption started")

        print(f"\n[3/3] Authenticating as {smtp_user}...")
        server.login(smtp_user, smtp_password)
        print("SUCCESS: Authentication successful!")

        # Ask for test email
        print("\n" + "=" * 60)
        test_email = input("Enter email to send test (or press Enter to skip): ").strip()

        if test_email:
            print(f"\nSending test email to {test_email}...")

            msg = MIMEMultipart('alternative')
            msg['Subject'] = "Astegni SMTP Test - SUCCESS"
            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = test_email

            html = f"""
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto;">
        <div style="background: #10B981; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0;">SMTP Configuration Successful!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
            <h2 style="color: #10B981;">Email Setup Complete</h2>
            <p>Your SMTP configuration is working correctly!</p>
            <div style="background: white; border-left: 4px solid #10B981; padding: 15px; margin: 15px 0;">
                <strong>Configuration:</strong><br>
                Host: {smtp_host}<br>
                Port: {smtp_port}<br>
                From: {from_email}
            </div>
            <p>You can now use email features:</p>
            <ul>
                <li>OTP verification emails</li>
                <li>Password reset emails</li>
                <li>Admin notifications</li>
                <li>User notifications</li>
            </ul>
        </div>
    </div>
</body>
</html>
            """

            msg.attach(MIMEText(html, 'html'))
            server.send_message(msg)
            print(f"SUCCESS: Test email sent to {test_email}")
            print("Check your inbox (and spam folder)!")

        server.quit()

        print("\n" + "=" * 60)
        print("ALL TESTS PASSED!")
        print("=" * 60)
        print("\nYour SMTP configuration is working correctly.")
        print("You can now use email features in your application.")
        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"\nERROR: Authentication failed - {str(e)}")
        print("\nTroubleshooting:")
        print("1. Check App Password is correct")
        print("2. Remove spaces from password")
        print("3. Generate new App Password if needed")
        return False

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_smtp()
    exit(0 if success else 1)
