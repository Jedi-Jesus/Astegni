from pydantic import BaseModel

class TFAInAppSetupRequest(BaseModel):
    use_login_password: bool
    password: str
    current_password: str | None = None

# Test what the backend receives
test_data = {
    'use_login_password': False,
    'current_password': 'myLoginPassword123',  # This is login password
    'password': 'myNew2FAPassword456'  # This is new 2FA password
}

request = TFAInAppSetupRequest(**test_data)
print(f"current_password: '{request.current_password}'")
print(f"password (2FA):   '{request.password}'")
print(f"Are they different? {request.current_password != request.password}")
print()
print("What gets saved as 2FA password:")
print(f"  user.two_factor_inapp_password = hash_password(request.password)")
print(f"  = hash_password('{request.password}')")
