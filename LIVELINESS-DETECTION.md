# KYC Liveliness Detection - Implementation Summary

Date: 2026-01-15
Status: Production Ready
File: astegni-backend/kyc_endpoints.py

## Overview
Implemented OpenCV-based facial liveliness detection for KYC verification.

## Three Detection Methods

### 1. Blink Detection (EAR - Eye Aspect Ratio)
- Detects eyes using Haar Cascade
- Calculates EAR = eye_height / eye_width
- Monitors EAR variation across frames
- Threshold: EAR variation > 0.15

### 2. Smile Detection (MAR - Mouth Aspect Ratio)  
- Analyzes mouth region variance
- Tracks pixel intensity changes
- Detects mouth movement (smiling)
- Threshold: MAR variation > 0.3

### 3. Head Turn Detection (Position Tracking)
- Tracks face center position
- Measures horizontal/vertical movement
- Detects 3D head rotation
- Threshold: X-movement > 30px OR total > 50px

## Pass Criteria
- Requires 2 out of 3 checks to pass
- Liveliness score = checks_passed / 3.0
- Passes if score >= 0.67 (2/3)

## Features
- Graceful degradation (fallback if OpenCV unavailable)
- Detailed logging for debugging
- Error tolerance (fails open on errors)
- Frame-by-frame analysis

## Anti-Spoofing
Protects against:
- Static photos
- Screen displays
- Pre-recorded videos
- Printed photos

## Usage
Called automatically during KYC selfie upload with liveliness frames.

See kyc_endpoints.py lines 328-513 for full implementation.
