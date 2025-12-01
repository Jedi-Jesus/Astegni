"""
Multi-provider SMS service supporting Twilio, Africa's Talking, Vonage, and AWS SNS
Configure provider in .env with SMS_PROVIDER variable
"""
import os
from typing import Optional
from enum import Enum

class SMSProvider(str, Enum):
    TWILIO = "twilio"
    AFRICAS_TALKING = "africas_talking"
    VONAGE = "vonage"
    AWS_SNS = "aws_sns"

class MultiProviderSMSService:
    def __init__(self):
        # Get configured provider from environment
        self.provider = os.getenv("SMS_PROVIDER", "twilio").lower()
        self.is_configured = False
        self.client = None

        # Initialize the appropriate provider
        if self.provider == SMSProvider.TWILIO:
            self._init_twilio()
        elif self.provider == SMSProvider.AFRICAS_TALKING:
            self._init_africas_talking()
        elif self.provider == SMSProvider.VONAGE:
            self._init_vonage()
        elif self.provider == SMSProvider.AWS_SNS:
            self._init_aws_sns()
        else:
            print(f"[SMS] Unknown provider: {self.provider}. Defaulting to console logging.")

    def _init_twilio(self):
        """Initialize Twilio SMS provider"""
        account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        from_number = os.getenv("TWILIO_FROM_NUMBER", "")

        if account_sid and auth_token and from_number:
            try:
                from twilio.rest import Client
                self.client = Client(account_sid, auth_token)
                self.from_number = from_number
                self.is_configured = True
                print("[SMS] Twilio SMS provider initialized")
            except Exception as e:
                print(f"[SMS] Failed to initialize Twilio: {str(e)}")
        else:
            print("[SMS] Twilio credentials not configured")

    def _init_africas_talking(self):
        """Initialize Africa's Talking SMS provider"""
        username = os.getenv("AT_USERNAME", "")  # Usually 'sandbox' for testing
        api_key = os.getenv("AT_API_KEY", "")
        from_number = os.getenv("AT_FROM_NUMBER", "")  # Short code or sender ID

        if username and api_key:
            try:
                import africastalking
                africastalking.initialize(username, api_key)
                self.client = africastalking.SMS
                self.from_number = from_number or None  # Optional for Africa's Talking
                self.is_configured = True
                print("[SMS] Africa's Talking SMS provider initialized")
            except Exception as e:
                print(f"[SMS] Failed to initialize Africa's Talking: {str(e)}")
        else:
            print("[SMS] Africa's Talking credentials not configured")

    def _init_vonage(self):
        """Initialize Vonage (Nexmo) SMS provider"""
        api_key = os.getenv("VONAGE_API_KEY", "")
        api_secret = os.getenv("VONAGE_API_SECRET", "")
        from_number = os.getenv("VONAGE_FROM_NUMBER", "Astegni")  # Can be brand name

        if api_key and api_secret:
            try:
                import vonage
                self.client = vonage.Client(key=api_key, secret=api_secret)
                self.sms_client = vonage.Sms(self.client)
                self.from_number = from_number
                self.is_configured = True
                print("[SMS] Vonage SMS provider initialized")
            except Exception as e:
                print(f"[SMS] Failed to initialize Vonage: {str(e)}")
        else:
            print("[SMS] Vonage credentials not configured")

    def _init_aws_sns(self):
        """Initialize AWS SNS SMS provider"""
        region = os.getenv("AWS_REGION", "us-east-1")

        try:
            import boto3
            self.client = boto3.client('sns', region_name=region)
            self.from_number = os.getenv("AWS_SNS_SENDER_ID", "Astegni")
            self.is_configured = True
            print("[SMS] AWS SNS provider initialized")
        except Exception as e:
            print(f"[SMS] Failed to initialize AWS SNS: {str(e)}")

    def _format_phone_number(self, phone: str) -> str:
        """Format phone number with Ethiopian country code if needed"""
        if not phone.startswith('+'):
            # Default to Ethiopia country code if not provided
            phone = f"+251{phone.lstrip('0')}"
        return phone

    def send_otp_sms(self, to_phone: str, otp_code: str, purpose: str = "verification") -> bool:
        """Send OTP via configured SMS provider"""
        if not self.is_configured:
            print(f"[SMS] SMS not configured. OTP for {to_phone}: {otp_code}")
            return False

        try:
            to_phone = self._format_phone_number(to_phone)
            message_body = f"Your Astegni OTP code is: {otp_code}\n\nValid for 5 minutes.\n\nPurpose: {purpose}"

            # Send via appropriate provider
            if self.provider == SMSProvider.TWILIO:
                return self._send_twilio(to_phone, message_body)
            elif self.provider == SMSProvider.AFRICAS_TALKING:
                return self._send_africas_talking(to_phone, message_body)
            elif self.provider == SMSProvider.VONAGE:
                return self._send_vonage(to_phone, message_body)
            elif self.provider == SMSProvider.AWS_SNS:
                return self._send_aws_sns(to_phone, message_body)

        except Exception as e:
            print(f"[SMS ERROR] Failed to send OTP: {str(e)}")
            print(f"[SMS FALLBACK] OTP for {to_phone}: {otp_code}")
            return False

    def _send_twilio(self, to_phone: str, message: str) -> bool:
        """Send SMS via Twilio"""
        msg = self.client.messages.create(
            body=message,
            from_=self.from_number,
            to=to_phone
        )
        print(f"[SMS] Twilio - OTP sent. SID: {msg.sid}")
        return True

    def _send_africas_talking(self, to_phone: str, message: str) -> bool:
        """Send SMS via Africa's Talking"""
        # Africa's Talking expects phone numbers in array
        recipients = [to_phone]

        # Send SMS
        response = self.client.send(message, recipients, sender=self.from_number)

        print(f"[SMS] Africa's Talking - Response: {response}")
        return True

    def _send_vonage(self, to_phone: str, message: str) -> bool:
        """Send SMS via Vonage"""
        response = self.sms_client.send_message({
            "from": self.from_number,
            "to": to_phone,
            "text": message
        })

        if response["messages"][0]["status"] == "0":
            print(f"[SMS] Vonage - OTP sent successfully")
            return True
        else:
            print(f"[SMS] Vonage - Error: {response['messages'][0]['error-text']}")
            return False

    def _send_aws_sns(self, to_phone: str, message: str) -> bool:
        """Send SMS via AWS SNS"""
        response = self.client.publish(
            PhoneNumber=to_phone,
            Message=message,
            MessageAttributes={
                'AWS.SNS.SMS.SenderID': {
                    'DataType': 'String',
                    'StringValue': self.from_number
                },
                'AWS.SNS.SMS.SMSType': {
                    'DataType': 'String',
                    'StringValue': 'Transactional'  # Higher priority delivery
                }
            }
        )

        print(f"[SMS] AWS SNS - Message ID: {response['MessageId']}")
        return True

    async def send_otp_sms_async(self, to_phone: str, otp_code: str, purpose: str = "verification") -> bool:
        """Send OTP via SMS asynchronously"""
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
sms_service = MultiProviderSMSService()
