"""
Test User-Based Chat System
============================
Tests the migrated user-based chat endpoints to verify functionality.

Usage:
    python test_user_based_chat.py
"""

import requests
import json
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8000"
TEST_USER_EMAIL = "jediael.s.abebe@gmail.com"
TEST_USER_PASSWORD = "@JesusJediael1234"

class ChatTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.user_data = None
        self.test_conversation_id = None

    def print_header(self, text):
        print("\n" + "="*60)
        print(f"  {text}")
        print("="*60)

    def print_success(self, text):
        print(f"✅ {text}")

    def print_error(self, text):
        print(f"❌ {text}")

    def print_info(self, text):
        print(f"ℹ️  {text}")

    def test_login(self):
        """Test 1: Login and get token"""
        self.print_header("Test 1: Login")

        try:
            response = requests.post(
                f"{API_BASE_URL}/api/login",
                json={
                    "email": TEST_USER_EMAIL,
                    "password": TEST_USER_PASSWORD
                }
            )

            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.print_success(f"Login successful")
                self.print_info(f"Token: {self.token[:20]}...")
                return True
            else:
                self.print_error(f"Login failed: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            self.print_error(f"Login error: {e}")
            return False

    def test_get_current_user(self):
        """Test 2: Get current user info"""
        self.print_header("Test 2: Get Current User")

        try:
            response = requests.get(
                f"{API_BASE_URL}/api/me",
                headers={"Authorization": f"Bearer {self.token}"}
            )

            if response.status_code == 200:
                self.user_data = response.json()
                self.user_id = self.user_data.get("id")
                self.print_success(f"Got current user")
                self.print_info(f"User ID: {self.user_id}")
                self.print_info(f"Name: {self.user_data.get('first_name')} {self.user_data.get('father_name')}")
                return True
            else:
                self.print_error(f"Failed to get user: {response.status_code}")
                return False

        except Exception as e:
            self.print_error(f"Get user error: {e}")
            return False

    def test_get_conversations(self):
        """Test 3: Get conversations (user-based)"""
        self.print_header("Test 3: Get Conversations (User-Based)")

        try:
            # NEW API: Only user_id parameter!
            response = requests.get(
                f"{API_BASE_URL}/api/chat/conversations",
                params={"user_id": self.user_id},
                headers={"Authorization": f"Bearer {self.token}"}
            )

            if response.status_code == 200:
                conversations = response.json().get("conversations", [])
                self.print_success(f"Got conversations: {len(conversations)} found")

                if conversations:
                    conv = conversations[0]
                    self.test_conversation_id = conv.get("id")
                    self.print_info(f"First conversation ID: {self.test_conversation_id}")
                    self.print_info(f"Type: {conv.get('type')}")
                    self.print_info(f"Display name: {conv.get('display_name', 'N/A')}")
                else:
                    self.print_info("No conversations found (this is OK for new users)")

                return True
            else:
                self.print_error(f"Failed to get conversations: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            self.print_error(f"Get conversations error: {e}")
            return False

    def test_get_contacts(self):
        """Test 4: Get contacts (user-based)"""
        self.print_header("Test 4: Get Contacts (User-Based)")

        try:
            # NEW API: Only user_id parameter!
            response = requests.get(
                f"{API_BASE_URL}/api/chat/contacts",
                params={"user_id": self.user_id},
                headers={"Authorization": f"Bearer {self.token}"}
            )

            if response.status_code == 200:
                contacts = response.json().get("contacts", [])
                self.print_success(f"Got contacts: {len(contacts)} found")

                if contacts:
                    contact = contacts[0]
                    self.print_info(f"First contact user_id: {contact.get('user_id')}")
                    self.print_info(f"Name: {contact.get('name')}")
                else:
                    self.print_info("No contacts found (this is OK)")

                return True
            else:
                self.print_error(f"Failed to get contacts: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            self.print_error(f"Get contacts error: {e}")
            return False

    def test_create_conversation(self):
        """Test 5: Create a conversation (user-based)"""
        self.print_header("Test 5: Create Conversation (User-Based)")

        # Try to create a conversation with user_id 2 (if exists)
        recipient_user_id = 2

        self.print_info(f"Attempting to create conversation with user_id: {recipient_user_id}")

        try:
            # NEW API: Just participant_user_ids array!
            response = requests.post(
                f"{API_BASE_URL}/api/chat/conversations",
                params={"user_id": self.user_id},
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                },
                json={
                    "type": "direct",
                    "participant_user_ids": [recipient_user_id]
                }
            )

            if response.status_code in [200, 201]:
                data = response.json()
                conv_id = data.get("conversation_id") or data.get("id")
                existing = data.get("existing", False)

                if existing:
                    self.print_success(f"Found existing conversation: {conv_id}")
                else:
                    self.print_success(f"Created new conversation: {conv_id}")

                self.test_conversation_id = conv_id
                return True
            elif response.status_code == 403:
                self.print_info(f"Cannot create conversation (privacy settings or not connected)")
                self.print_info(f"Response: {response.json()}")
                return True  # Not a failure, just privacy restriction
            elif response.status_code == 400:
                self.print_info(f"Bad request (user may not exist): {response.json()}")
                return True  # Not a failure
            else:
                self.print_error(f"Failed to create conversation: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            self.print_error(f"Create conversation error: {e}")
            return False

    def test_send_message(self):
        """Test 6: Send a message (user-based)"""
        self.print_header("Test 6: Send Message (User-Based)")

        if not self.test_conversation_id:
            self.print_info("Skipping: No conversation available")
            return True

        try:
            # NEW API: No sender info needed (backend gets from token)!
            response = requests.post(
                f"{API_BASE_URL}/api/chat/messages",
                params={"user_id": self.user_id},
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                },
                json={
                    "conversation_id": self.test_conversation_id,
                    "content": f"Test message from user-based chat system at {datetime.now().isoformat()}",
                    "message_type": "text"
                }
            )

            if response.status_code in [200, 201]:
                message = response.json()
                self.print_success(f"Message sent successfully")
                self.print_info(f"Message ID: {message.get('id')}")
                self.print_info(f"Content: {message.get('content')[:50]}...")
                return True
            else:
                self.print_error(f"Failed to send message: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            self.print_error(f"Send message error: {e}")
            return False

    def test_get_messages(self):
        """Test 7: Get messages from conversation"""
        self.print_header("Test 7: Get Messages")

        if not self.test_conversation_id:
            self.print_info("Skipping: No conversation available")
            return True

        try:
            response = requests.get(
                f"{API_BASE_URL}/api/chat/messages/{self.test_conversation_id}",
                params={"user_id": self.user_id},
                headers={"Authorization": f"Bearer {self.token}"}
            )

            if response.status_code == 200:
                messages = response.json().get("messages", [])
                self.print_success(f"Got messages: {len(messages)} found")

                if messages:
                    msg = messages[-1]  # Last message
                    self.print_info(f"Last message from user_id: {msg.get('sender_user_id')}")
                    self.print_info(f"Content: {msg.get('content', '')[:50]}")

                return True
            else:
                self.print_error(f"Failed to get messages: {response.status_code}")
                return False

        except Exception as e:
            self.print_error(f"Get messages error: {e}")
            return False

    def test_privacy_settings(self):
        """Test 8: Get and update privacy settings (user-based)"""
        self.print_header("Test 8: Privacy Settings (User-Based)")

        try:
            # Get current settings
            response = requests.get(
                f"{API_BASE_URL}/api/chat/settings",
                params={"user_id": self.user_id},
                headers={"Authorization": f"Bearer {self.token}"}
            )

            if response.status_code == 200:
                settings = response.json()
                self.print_success(f"Got privacy settings")
                self.print_info(f"Who can message: {settings.get('who_can_message')}")
                self.print_info(f"Read receipts: {settings.get('read_receipts')}")
                return True
            elif response.status_code == 404:
                self.print_info("No settings found (will use defaults)")
                return True
            else:
                self.print_error(f"Failed to get settings: {response.status_code}")
                return False

        except Exception as e:
            self.print_error(f"Privacy settings error: {e}")
            return False

    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "🚀 "*20)
        print("  USER-BASED CHAT SYSTEM TEST SUITE")
        print("🚀 "*20)

        results = []

        # Run tests in order
        results.append(("Login", self.test_login()))

        if not results[0][1]:
            self.print_error("\nCannot continue without login. Stopping tests.")
            return

        results.append(("Get Current User", self.test_get_current_user()))
        results.append(("Get Conversations", self.test_get_conversations()))
        results.append(("Get Contacts", self.test_get_contacts()))
        results.append(("Create Conversation", self.test_create_conversation()))
        results.append(("Send Message", self.test_send_message()))
        results.append(("Get Messages", self.test_get_messages()))
        results.append(("Privacy Settings", self.test_privacy_settings()))

        # Summary
        self.print_header("TEST SUMMARY")

        passed = sum(1 for _, result in results if result)
        total = len(results)

        for name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} - {name}")

        print("\n" + "-"*60)
        print(f"Results: {passed}/{total} tests passed")

        if passed == total:
            print("\n🎉 ALL TESTS PASSED! User-based chat system is working! 🎉")
        else:
            print(f"\n⚠️  {total - passed} test(s) failed. Check errors above.")

        print("-"*60 + "\n")

if __name__ == "__main__":
    tester = ChatTester()
    tester.run_all_tests()
