"""
SMS service for sending OTP via Twilio or other providers
"""
import os
from typing import Optional

class SMSService:
    def __init__(self):
        self.twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.twilio_from_number = os.getenv("TWILIO_FROM_NUMBER", "")

        # Check if Twilio is configured
        self.is_configured = bool(
            self.twilio_account_sid and
            self.twilio_auth_token and
            self.twilio_from_number
        )

        # Initialize Twilio client only if configured
        self.client = None
        if self.is_configured:
            try:
                from twilio.rest import Client
                self.client = Client(self.twilio_account_sid, self.twilio_auth_token)
            except Exception as e:
                print(f"[SMS] Failed to initialize Twilio client: {str(e)}")
                self.is_configured = False

    def send_otp_sms(self, to_phone: str, otp_code: str, purpose: str = "verification") -> bool:
        """Send OTP via SMS using Twilio"""
        if not self.is_configured or not self.client:
            print(f"[SMS] SMS not configured. OTP for {to_phone}: {otp_code}")
            return False

        try:
            # Format phone number (ensure it has country code)
            if not to_phone.startswith('+'):
                # Default to Ethiopia country code if not provided
                to_phone = f"+251{to_phone.lstrip('0')}"

            # Create SMS message
            message_body = f"Your Astegni OTP code is: {otp_code}\n\nValid for 5 minutes.\n\nPurpose: {purpose}"

            # Send SMS via Twilio
            message = self.client.messages.create(
                body=message_body,
                from_=self.twilio_from_number,
                to=to_phone
            )

            print(f"[SMS] OTP sent successfully to {to_phone}. SID: {message.sid}")
            return True

        except Exception as e:
            print(f"[SMS ERROR] Failed to send OTP to {to_phone}: {str(e)}")
            # Fallback to console logging
            print(f"[SMS FALLBACK] OTP for {to_phone}: {otp_code}")
            return False

    async def send_otp_sms_async(self, to_phone: str, otp_code: str, purpose: str = "verification") -> bool:
        """Send OTP via SMS asynchronously (Twilio supports async but we'll use thread executor)"""
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            result = await loop.run_in_executor(
                executor,
                self.send_otp_sms,
                to_phone,
                otp_code,
                purpose
            )
            return result

# Create singleton instance
sms_service = SMSService()
