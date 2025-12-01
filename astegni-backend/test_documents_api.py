#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Test script for student documents API"""
import requests
import json
import sys

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8000"

# Login
print("[*] Logging in...")
login_response = requests.post(
    f"{BASE_URL}/api/login",
    data={
        "username": "jediael.s.abebe@gmail.com",
        "password": "@JesusJediael1234"
    }
)

if login_response.status_code != 200:
    print(f"[!] Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

token = login_response.json()["access_token"]
print(f"[+] Login successful! Token: {token[:30]}...")

# Test documents endpoint
print("\n[*] Testing GET /api/student/documents?document_type=achievement")
headers = {"Authorization": f"Bearer {token}"}

documents_response = requests.get(
    f"{BASE_URL}/api/student/documents",
    params={"document_type": "achievement"},
    headers=headers
)

print(f"Status Code: {documents_response.status_code}")
if documents_response.status_code == 200:
    docs = documents_response.json()
    print(f"[+] SUCCESS! Found {len(docs)} achievement documents")
    if docs:
        print(f"First document: {json.dumps(docs[0], indent=2, default=str)[:500]}...")
else:
    print(f"[!] FAILED!")
    print(f"Response: {documents_response.text}")

# Test stats endpoint
print("\n[*] Testing GET /api/student/documents/stats")
stats_response = requests.get(
    f"{BASE_URL}/api/student/documents/stats",
    headers=headers
)

print(f"Status Code: {stats_response.status_code}")
if stats_response.status_code == 200:
    stats = stats_response.json()
    print(f"[+] SUCCESS! Stats:")
    print(json.dumps(stats, indent=2))
else:
    print(f"[!] FAILED!")
    print(f"Response: {stats_response.text}")
