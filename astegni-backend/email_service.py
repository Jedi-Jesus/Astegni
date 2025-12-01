"""
Email service for sending OTP and notifications
Supports both SMTP and SendGrid
Reads configuration from database with .env fallback
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import asyncio
import aiosmtplib
import psycopg
from dotenv import load_dotenv

# CRITICAL: Load environment variables before anything else
load_dotenv()

class EmailService:
    def __init__(self):
        # Load configuration from database, fallback to .env
        self._load_config()

    def _load_config(self):
        """Load email configuration from database or .env file"""
        try:
            # Try to load from database first
            DATABASE_URL = os.getenv('DATABASE_URL')
            if DATABASE_URL:
                conn = psycopg.connect(DATABASE_URL)
                cursor = conn.cursor()

                cursor.execute("""
                    SELECT smtp_host, smtp_port, smtp_username, smtp_password,
                           from_email, from_name, enabled
                    FROM system_email_config
                    WHERE id = 1 AND enabled = true
                    LIMIT 1
                """)

                row = cursor.fetchone()
                cursor.close()
                conn.close()

                if row:
                    # Use database configuration
                    self.smtp_host = row[0] or "smtp.gmail.com"
                    self.smtp_port = row[1] or 587
                    self.smtp_user = row[2] or ""
                    self.smtp_password = row[3] or ""
                    self.from_email = row[4] or self.smtp_user
                    self.from_name = row[5] or "Astegni"
                    print("[EMAIL] Configuration loaded from database")
                else:
                    # No config in database, use .env
                    self._load_from_env()
            else:
                # No database URL, use .env
                self._load_from_env()

        except Exception as e:
            # Database error, fallback to .env
            print(f"[EMAIL] Database config failed, using .env: {str(e)}")
            self._load_from_env()

        # Check if email is configured
        self.is_configured = bool(self.smtp_user and self.smtp_password)

    def _load_from_env(self):
        """Load configuration from environment variables"""
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)
        self.from_name = os.getenv("FROM_NAME", "Astegni")
        print("[EMAIL] Configuration loaded from .env file")

    def send_otp_email(self, to_email: str, otp_code: str, purpose: str = "verification") -> bool:
        """Send OTP email synchronously"""
        if not self.is_configured:
            print(f"[EMAIL] Email not configured. OTP for {to_email}: {otp_code}")
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Your Astegni OTP Code - {otp_code}"
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email

            # Plain text version
            text = f"""
Hello,

Your Astegni OTP code is: {otp_code}

This code is valid for 5 minutes.

Purpose: {purpose}

If you didn't request this code, please ignore this email.

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
        .header {{ background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
        .otp-code {{ background: #fff; border: 2px solid #F59E0B; border-radius: 5px; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #F59E0B; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Astegni OTP Verification</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Your Astegni verification code is:</p>
            <div class="otp-code">{otp_code}</div>
            <p><strong>Valid for: 5 minutes</strong></p>
            <p><strong>Purpose:</strong> {purpose}</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <div class="footer">
                <p>&copy; 2024 Astegni - Ethiopian Educational Platform</p>
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

            # Send email using SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.set_debuglevel(0)  # Set to 1 for verbose debugging
                server.starttls()
                print(f"[EMAIL] Attempting login as {self.smtp_user}...")
                server.login(self.smtp_user, self.smtp_password)
                print(f"[EMAIL] Login successful. Sending email to {to_email}...")
                server.send_message(msg)

            print(f"[EMAIL] SUCCESS - OTP sent successfully to {to_email}")
            return True

        except smtplib.SMTPAuthenticationError as e:
            print(f"[EMAIL ERROR] Authentication failed: {str(e)}")
            print(f"[EMAIL] Check that:")
            print(f"  1. SMTP_USER ({self.smtp_user}) is correct")
            print(f"  2. App Password is correct (not regular password)")
            print(f"  3. 2FA is enabled on the account")
            print(f"[EMAIL FALLBACK] OTP for {to_email}: {otp_code}")
            return False
        except smtplib.SMTPException as e:
            print(f"[EMAIL ERROR] SMTP error sending to {to_email}: {str(e)}")
            print(f"[EMAIL FALLBACK] OTP for {to_email}: {otp_code}")
            return False
        except Exception as e:
            print(f"[EMAIL ERROR] Unexpected error sending to {to_email}: {str(e)}")
            print(f"[EMAIL ERROR] Error type: {type(e).__name__}")
            # Fallback to console logging
            print(f"[EMAIL FALLBACK] OTP for {to_email}: {otp_code}")
            return False

    async def send_otp_email_async(self, to_email: str, otp_code: str, purpose: str = "verification") -> bool:
        """Send OTP email asynchronously"""
        if not self.is_configured:
            print(f"[EMAIL] Email not configured. OTP for {to_email}: {otp_code}")
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Your Astegni OTP Code - {otp_code}"
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email

            # Plain text and HTML versions (same as sync version)
            text = f"Your Astegni OTP code is: {otp_code}\n\nThis code is valid for 5 minutes.\n\nPurpose: {purpose}"

            html = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1>Astegni OTP Verification</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
            <p>Your Astegni verification code is:</p>
            <div style="background: #fff; border: 2px solid #F59E0B; border-radius: 5px; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #F59E0B;">
                {otp_code}
            </div>
            <p><strong>Valid for: 5 minutes</strong></p>
            <p><strong>Purpose:</strong> {purpose}</p>
        </div>
    </div>
</body>
</html>
            """

            part1 = MIMEText(text, 'plain')
            part2 = MIMEText(html, 'html')
            msg.attach(part1)
            msg.attach(part2)

            # Send email using async SMTP
            await aiosmtplib.send(
                msg,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True
            )

            print(f"[EMAIL] OTP sent successfully to {to_email}")
            return True

        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send OTP to {to_email}: {str(e)}")
            print(f"[EMAIL FALLBACK] OTP for {to_email}: {otp_code}")
            return False

    def send_admin_invitation_email(self, to_email: str, first_name: str, department: str, otp_code: str) -> bool:
        """Send admin invitation email with OTP and welcome message"""
        if not self.is_configured:
            print(f"[EMAIL] Email not configured. OTP for {to_email}: {otp_code}")
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Welcome to Astegni - Your Administrator Access (OTP: {otp_code})"
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email

            # Plain text version
            text = f"""
Hello {first_name},

Welcome to Astegni! We have chosen you because we think you are qualified for '{department}' and you'll add value to our company, which most are fond of and rely on.

So Welcome! We hope you get the best of your life, experience, and knowledge here at Astegni. May God our Father and the father of our company, our Lord and the Lord of the company, Jesus Christ, and the Holy Spirit that's always with us and the company be with you!

Godspeed!

---
YOUR ADMINISTRATOR ACCESS CODE
---

Your OTP Code: {otp_code}
Valid for: 7 DAYS

Please use this code to complete your administrator account setup.

---

Best regards,
Astegni Team
            """

            # HTML version
            html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Georgia', serif; line-height: 1.8; color: #333; }}
        .container {{ max-width: 650px; margin: 0 auto; padding: 20px; background: #ffffff; }}
        .header {{ background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }}
        .header h1 {{ margin: 0; font-size: 28px; }}
        .content {{ background: #f9fafb; padding: 40px 30px; }}
        .welcome-message {{ background: white; padding: 25px; border-left: 4px solid #F59E0B; margin: 20px 0; font-size: 16px; line-height: 1.8; }}
        .blessing {{ font-style: italic; color: #6B7280; margin: 20px 0; padding: 15px; background: #FEF3C7; border-radius: 5px; }}
        .otp-section {{ background: white; border: 3px solid #F59E0B; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0; }}
        .otp-code {{ background: #FEF3C7; border: 2px dashed #F59E0B; border-radius: 8px; padding: 20px; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; color: #D97706; font-family: 'Courier New', monospace; }}
        .validity {{ color: #DC2626; font-weight: bold; font-size: 18px; margin-top: 15px; }}
        .footer {{ text-align: center; margin-top: 30px; padding: 20px; color: #6B7280; font-size: 13px; border-top: 2px solid #E5E7EB; }}
        .department {{ display: inline-block; background: #DBEAFE; color: #1E40AF; padding: 5px 15px; border-radius: 20px; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Welcome to Astegni</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Ethiopian Educational Platform</p>
        </div>
        <div class="content">
            <div class="welcome-message">
                <p><strong>Hello {first_name},</strong></p>
                <p>Welcome to Astegni! We have chosen you because we think you are qualified for <span class="department">{department}</span> and you'll add value to our company, which most are fond of and rely on.</p>
                <p>So Welcome! We hope you get the best of your life, experience, and knowledge here at Astegni.</p>
                <div class="blessing">
                    <p>May God our Father and the father of our company, our Lord and the Lord of the company, Jesus Christ, and the Holy Spirit that's always with us and the company be with you!</p>
                    <p style="text-align: right; margin: 10px 0 0 0;"><strong>Godspeed!</strong></p>
                </div>
            </div>

            <div class="otp-section">
                <h2 style="color: #F59E0B; margin-top: 0;">Your Administrator Access Code</h2>
                <p>Please use this code to complete your administrator account setup:</p>
                <div class="otp-code">{otp_code}</div>
                <div class="validity">⏰ Valid for 7 DAYS</div>
                <p style="margin-top: 20px; font-size: 14px; color: #6B7280;">Keep this code secure and do not share it with anyone.</p>
            </div>

            <div class="footer">
                <p><strong>Astegni Educational Platform</strong></p>
                <p>Building the future of Ethiopian education</p>
                <p style="margin-top: 10px;">&copy; 2024 Astegni. All rights reserved.</p>
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

            # Send email using SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.set_debuglevel(0)
                server.starttls()
                print(f"[EMAIL] Sending admin invitation to {to_email}...")
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            print(f"[EMAIL] Admin invitation sent successfully to {to_email}")
            return True

        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send admin invitation to {to_email}: {str(e)}")
            print(f"[EMAIL FALLBACK] OTP for {to_email}: {otp_code}")
            return False

    def send_parent_invitation_email(self, to_email: str, parent_name: str, student_name: str, temp_password: str, relationship_type: str) -> bool:
        """Send parent invitation email with temporary password"""
        if not self.is_configured:
            print(f"[EMAIL] Email not configured. Temp password for {to_email}: {temp_password}")
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Astegni - You've been invited as a {relationship_type}"
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email

            # Plain text version
            text = f"""
Hello {parent_name},

You have been invited to join Astegni as a {relationship_type} by {student_name}.

Astegni is Ethiopia's leading educational platform connecting students with tutors and parents.

YOUR ACCOUNT DETAILS
--------------------
Email: {to_email}
Temporary Password: {temp_password}

Please log in to Astegni and change your password immediately.

Once logged in, you can:
- View your child's academic progress
- Track tutoring sessions
- Communicate with tutors
- Monitor learning activities

NEXT STEPS
----------
1. Go to Astegni website/app
2. Log in with your email and temporary password
3. Accept the invitation from {student_name}
4. Change your password to something secure

If you did not expect this invitation, please ignore this email.

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
        .header {{ background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .credentials {{ background: white; border: 2px solid #8B5CF6; border-radius: 10px; padding: 20px; margin: 20px 0; }}
        .password-box {{ background: #EDE9FE; border: 2px dashed #8B5CF6; border-radius: 5px; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 15px 0; color: #6366F1; font-family: monospace; }}
        .steps {{ background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }}
        .step {{ display: flex; align-items: center; margin: 10px 0; }}
        .step-number {{ background: #8B5CF6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        .relationship {{ display: inline-block; background: #EDE9FE; color: #6366F1; padding: 5px 15px; border-radius: 20px; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Astegni!</h1>
            <p>You've been invited as a <span class="relationship">{relationship_type}</span></p>
        </div>
        <div class="content">
            <p>Hello <strong>{parent_name}</strong>,</p>
            <p>You have been invited to join Astegni by <strong>{student_name}</strong>.</p>
            <p>Astegni is Ethiopia's leading educational platform connecting students with tutors and parents.</p>

            <div class="credentials">
                <h3 style="color: #8B5CF6; margin-top: 0;">Your Account Details</h3>
                <p><strong>Email:</strong> {to_email}</p>
                <p><strong>Temporary Password:</strong></p>
                <div class="password-box">{temp_password}</div>
                <p style="color: #DC2626; font-size: 14px;">Please change this password after your first login!</p>
            </div>

            <div class="steps">
                <h3 style="color: #8B5CF6; margin-top: 0;">Next Steps</h3>
                <div class="step">
                    <div class="step-number">1</div>
                    <div>Go to Astegni website/app</div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div>Log in with your email and temporary password</div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div>Accept the invitation from {student_name}</div>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <div>Change your password to something secure</div>
                </div>
            </div>

            <p style="font-size: 14px; color: #666;">If you did not expect this invitation, please ignore this email.</p>

            <div class="footer">
                <p>&copy; 2024 Astegni - Ethiopian Educational Platform</p>
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

            # Send email using SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.set_debuglevel(0)
                server.starttls()
                print(f"[EMAIL] Sending parent invitation to {to_email}...")
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            print(f"[EMAIL] Parent invitation sent successfully to {to_email}")
            return True

        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send parent invitation to {to_email}: {str(e)}")
            print(f"[EMAIL FALLBACK] Temp password for {to_email}: {temp_password}")
            return False

    def send_coparent_invitation_email(self, to_email: str, inviter_name: str, temp_password: str, relationship_type: str) -> bool:
        """Send co-parent invitation email with temporary password"""
        if not self.is_configured:
            print(f"[EMAIL] Email not configured. Temp password for {to_email}: {temp_password}")
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Astegni - Co-Parent Invitation from {inviter_name}"
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email

            # Plain text version
            text = f"""
Hello,

You have been invited to join Astegni as a co-parent by {inviter_name}.

They want to share parenting access to their children with you as their {relationship_type}.

Astegni is Ethiopia's leading educational platform connecting students with tutors and parents.

YOUR ACCOUNT DETAILS
--------------------
Email: {to_email}
Temporary Password: {temp_password}

Please log in to Astegni and change your password immediately.

Once logged in, you can:
- View shared children's academic progress
- Track tutoring sessions together
- Communicate with tutors
- Monitor learning activities

NEXT STEPS
----------
1. Go to Astegni website/app
2. Log in with your email and temporary password
3. Your account will be automatically linked
4. Change your password to something secure

If you did not expect this invitation, please ignore this email.

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
        .header {{ background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .credentials {{ background: white; border: 2px solid #10B981; border-radius: 10px; padding: 20px; margin: 20px 0; }}
        .password-box {{ background: #D1FAE5; border: 2px dashed #10B981; border-radius: 5px; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 15px 0; color: #059669; font-family: monospace; }}
        .steps {{ background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }}
        .step {{ display: flex; align-items: center; margin: 10px 0; }}
        .step-number {{ background: #10B981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        .relationship {{ display: inline-block; background: #D1FAE5; color: #059669; padding: 5px 15px; border-radius: 20px; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Co-Parent Invitation</h1>
            <p>Share parenting together on Astegni</p>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>You have been invited to join Astegni as a co-parent by <strong>{inviter_name}</strong>.</p>
            <p>They want to share parenting access to their children with you as their <span class="relationship">{relationship_type}</span>.</p>

            <div class="credentials">
                <h3 style="color: #10B981; margin-top: 0;">Your Account Details</h3>
                <p><strong>Email:</strong> {to_email}</p>
                <p><strong>Temporary Password:</strong></p>
                <div class="password-box">{temp_password}</div>
                <p style="color: #DC2626; font-size: 14px;">Please change this password after your first login!</p>
            </div>

            <div class="steps">
                <h3 style="color: #10B981; margin-top: 0;">Next Steps</h3>
                <div class="step">
                    <div class="step-number">1</div>
                    <div>Go to Astegni website/app</div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div>Log in with your email and temporary password</div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div>Your account will be automatically linked to the children</div>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <div>Change your password to something secure</div>
                </div>
            </div>

            <p>As a co-parent, you'll be able to:</p>
            <ul>
                <li>View shared children's academic progress</li>
                <li>Track tutoring sessions together</li>
                <li>Communicate with tutors</li>
                <li>Monitor learning activities</li>
            </ul>

            <p style="color: #666; font-size: 14px;">If you did not expect this invitation, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2025 Astegni. All rights reserved.</p>
            <p>Ethiopia's Leading Educational Platform</p>
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

            # Send email using SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.set_debuglevel(0)
                server.starttls()
                print(f"[EMAIL] Sending co-parent invitation to {to_email}...")
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            print(f"[EMAIL] Co-parent invitation sent successfully to {to_email}")
            return True

        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send co-parent invitation to {to_email}: {str(e)}")
            print(f"[EMAIL FALLBACK] Temp password for {to_email}: {temp_password}")
            return False


# Create singleton instance
email_service = EmailService()
