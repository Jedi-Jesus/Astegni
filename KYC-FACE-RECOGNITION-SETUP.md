# KYC Face Recognition Setup

**Date:** 2026-01-15
**Status:** IN PROGRESS - Installing on Production Server

## Overview

The Astegni KYC verification system uses two components:

1. **Liveliness Detection** (OpenCV) - ✅ Fully Implemented
   - Blink detection (Eye Aspect Ratio)
   - Smile detection (Mouth Aspect Ratio)
   - Head turn detection (Position tracking)
   - Status: **WORKING** on both local and production

2. **Face Matching** (face_recognition library) - ⚠️ In Progress
   - Compares selfie with ID document photo
   - Requires: dlib + face_recognition
   - Status: **INSTALLING** on production server

## Current Status

### Local Development (Windows)
- **OpenCV**: ✅ Installed
- **dlib**: ❌ Not installed (requires Visual Studio Build Tools + CMake)
- **face_recognition**: ❌ Not installed
- **Mode**: Placeholder face matching (82-98% random scores for testing)

### Production Server (Hetzner - Linux)
- **OpenCV**: ✅ Installed
- **cmake**: ✅ Installed
- **build-essential**: ✅ Installed
- **dlib**: 🔄 Installing now (takes 5-10 minutes to compile)
- **face_recognition**: 🔄 Pending (installs after dlib)
- **Installation Log**: `/tmp/face_recognition_install.log` on server

## How It Works

### Without face_recognition (Current Local Setup)
```python
# In kyc_endpoints.py line 239-249
if not FACE_RECOGNITION_AVAILABLE:
    # Placeholder - return simulated match with higher scores for testing
    import random
    score = random.uniform(0.82, 0.98)
    return {
        "match": score >= 0.80,
        "score": score,
        "method": "placeholder"
    }
```

### With face_recognition (Production After Installation)
```python
# In kyc_endpoints.py line 251-279
try:
    # Load images
    img1_rgb = cv2.cvtColor(img1, cv2.COLOR_BGR2RGB)
    img2_rgb = cv2.cvtColor(img2, cv2.COLOR_BGR2RGB)

    # Get face encodings
    encodings1 = face_recognition.face_encodings(img1_rgb)
    encodings2 = face_recognition.face_encodings(img2_rgb)

    # Compare faces
    distance = face_recognition.face_distance([encodings1[0]], encodings2[0])[0]
    similarity = 1 - distance  # Convert distance to similarity (0-1)

    return {
        "match": similarity >= 0.85,  # 85% threshold
        "score": float(similarity),
        "method": "face_recognition"
    }
except Exception as e:
    return {"match": False, "score": 0, "error": str(e)}
```

## Verification Flow

1. **User uploads ID document** → Face detected
2. **User takes selfie video** → Multiple frames captured
3. **Face Matching** → Selfie vs ID document (85% threshold)
4. **Liveliness Detection** → Blink + Smile + Head Turn (2/3 must pass)
5. **Both pass** → User verified (`users.is_verified = True`)

## Installation Instructions

### Linux (Ubuntu/Debian) - Production
```bash
# Install build tools
apt update
apt install -y cmake build-essential

# Install face_recognition
cd /var/www/astegni/astegni-backend
source venv/bin/activate
pip install dlib face-recognition

# Restart backend
systemctl restart astegni-backend
```

### Windows - Local Development
```bash
# Option 1: Use placeholder mode (current setup)
# No installation needed - works for testing

# Option 2: Install for real face matching
# 1. Install Visual Studio Build Tools 2022
#    https://visualstudio.microsoft.com/downloads/
#    Select: "Desktop development with C++"

# 2. Install CMake
#    https://cmake.org/download/
#    Add to PATH during installation

# 3. Restart terminal and run:
cd astegni-backend
pip install dlib
pip install face-recognition
```

## Testing After Installation

### Check if installed:
```python
python -c "import face_recognition; print('Installed:', face_recognition.__version__)"
```

### Check backend logs:
```bash
# Should NOT see this warning if installed:
[WARN] face_recognition not available - face matching will use placeholder logic

# Should see this when kyc_endpoints.py loads:
# (no warning = successfully imported)
```

### Test KYC flow:
1. Navigate to tutor profile → Settings → Verify Personal Info
2. Upload ID document
3. Take selfie video (blink, smile, turn head)
4. Check backend logs for face matching method:
   - Placeholder: `"method": "placeholder"`
   - Real: `"method": "face_recognition"`

## Files Modified

- `astegni-backend/requirements.txt` - Added dlib and face-recognition
- `astegni-backend/kyc_endpoints.py` - Already implements both modes (lines 113-118, 239-275)

## Next Steps

1. ⏳ Wait for dlib compilation to complete on production (~5-10 min)
2. ✅ Verify installation: `python -c "import face_recognition; print('OK')"`
3. 🔄 Restart backend: `systemctl restart astegni-backend`
4. 🧪 Test KYC verification on production
5. 📊 Monitor logs for real face matching instead of placeholder

## Troubleshooting

### Installation fails on Windows
- **Issue**: dlib requires Visual Studio Build Tools
- **Solution**: Use placeholder mode for local dev, install on Linux for production

### Out of memory during compilation
- **Issue**: dlib compilation uses lots of RAM
- **Solution**: Add swap space or use smaller server instance temporarily

### Face matching always fails
- **Issue**: Threshold too high (85%)
- **Solution**: Check logs for actual scores, adjust threshold in kyc_endpoints.py:270

### Liveliness detection fails
- **Issue**: User not moving enough
- **Solution**: Thresholds are calibrated, but can adjust in kyc_endpoints.py:442-468

## References

- OpenCV Documentation: https://docs.opencv.org/
- face_recognition: https://github.com/ageitgey/face_recognition
- dlib: http://dlib.net/
- Liveliness Detection Implementation: `astegni-backend/kyc_endpoints.py` lines 321-506
- Face Matching Implementation: `astegni-backend/kyc_endpoints.py` lines 239-275
