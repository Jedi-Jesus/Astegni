"""
Test sending email to your inbox
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import sys

load_dotenv()

def send_test_email(to_email):
    """Send test email"""

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL")
    from_name = os.getenv("FROM_NAME")

    print(f"Sending test email from {from_email} to {to_email}...")

    try:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.starttls()
        server.login(smtp_user, smtp_password)

        msg = MIMEMultipart('alternative')
        msg['Subject'] = "SUCCESS - Astegni Email Configuration Working!"
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email

        html = f"""
<html>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">✓ Email Configuration Successful!</h1>
        </div>
        <div style="padding: 30px;">
            <div style="background: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <strong style="color: #065F46;">Great news!</strong> Your SMTP configuration is working perfectly!
            </div>

            <h2 style="color: #1F2937; margin-top: 0;">Configuration Details</h2>
            <table style="width: 100%; background: #F9FAFB; border-radius: 4px; padding: 15px; margin: 15px 0;">
                <tr>
                    <td style="padding: 8px; color: #6B7280;"><strong>SMTP Host:</strong></td>
                    <td style="padding: 8px; color: #1F2937;">{smtp_host}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; color: #6B7280;"><strong>Port:</strong></td>
                    <td style="padding: 8px; color: #1F2937;">{smtp_port}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; color: #6B7280;"><strong>From Email:</strong></td>
                    <td style="padding: 8px; color: #1F2937;">{from_email}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; color: #6B7280;"><strong>Display Name:</strong></td>
                    <td style="padding: 8px; color: #1F2937;">{from_name}</td>
                </tr>
            </table>

            <h2 style="color: #1F2937;">Features Now Available</h2>
            <ul style="color: #4B5563; line-height: 1.8;">
                <li><strong>OTP Verification</strong> - Users can verify their email addresses</li>
                <li><strong>Password Reset</strong> - Automated password recovery emails</li>
                <li><strong>Admin Invitations</strong> - Send invites to new administrators</li>
                <li><strong>Notifications</strong> - Course approvals, system alerts, and more</li>
                <li><strong>User Communications</strong> - Platform announcements and updates</li>
            </ul>

            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <strong style="color: #92400E;">Note:</strong> Emails are sent from <code style="background: #FDE68A; padding: 2px 6px; border-radius: 3px;">{from_email}</code>
            </div>

            <p style="color: #6B7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                This is an automated test email from the <strong>Astegni Educational Platform</strong>.<br>
                If you received this email, your email configuration is working correctly!
            </p>
        </div>
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 12px;">
            <p style="margin: 0;">&copy; 2024 Astegni - Ethiopian Educational Platform</p>
            <p style="margin: 5px 0 0 0;">Automated test email - No action required</p>
        </div>
    </div>
</body>
</html>
        """

        msg.attach(MIMEText(html, 'html'))
        server.send_message(msg)
        server.quit()

        print(f"\nSUCCESS! Test email sent to {to_email}")
        print("\nCheck your inbox (and spam folder if not in inbox)")
        print("\nYour email configuration is working perfectly!")
        return True

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_email = sys.argv[1]
    else:
        test_email = input("Enter your email address: ").strip()

    if test_email:
        send_test_email(test_email)
    else:
        print("No email address provided")
