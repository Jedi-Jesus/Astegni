# Campaign Media & Backblaze B2 Integration Guide

## Overview

Currently, the `seed_campaign_data.py` script creates campaigns with **mock media URLs** pointing to Backblaze B2 CDN. This guide explains how to integrate actual media file uploads to Backblaze B2.

## Current Implementation (Mock URLs)

The seed script currently generates URLs like:
```python
# For images
creative_urls = [
    "https://astegni-media.b2cdn.com/campaigns/campaign_1_main.jpg",
    "https://astegni-media.b2cdn.com/campaigns/campaign_1_secondary.jpg"
]

# For videos
creative_urls = [
    "https://astegni-media.b2cdn.com/campaigns/campaign_1_video.mp4"
]
```

These are **mock URLs** and don't point to actual files yet.

## Setting Up Backblaze B2 for Campaigns

### Step 1: Configure B2 Folder Structure

The campaign media should be organized in Backblaze B2 as follows:

```
astegni-media/
├── campaigns/
│   ├── images/
│   │   ├── user_1/
│   │   │   ├── campaign_123_main_20250115_143022.jpg
│   │   │   └── campaign_123_banner_20250115_143045.jpg
│   │   └── user_2/
│   │       └── campaign_456_hero_20250115_150122.jpg
│   └── videos/
│       ├── user_1/
│       │   └── campaign_123_promo_20250115_143022.mp4
│       └── user_2/
│           └── campaign_456_intro_20250115_150122.mp4
```

### Step 2: Update Seed Script for Real Media

To use actual B2 uploads, modify `seed_campaign_data.py`:

```python
from backblaze_service import get_backblaze_service

# Initialize B2 service
b2_service = get_backblaze_service()

# Upload campaign media
def upload_campaign_media(user_id, campaign_id, media_type='image'):
    """Upload sample media to Backblaze B2"""

    if media_type == 'image':
        # Upload sample image
        file_path = 'sample_images/campaign_sample.jpg'
        file_name = f'campaigns/images/user_{user_id}/campaign_{campaign_id}_main.jpg'
    else:
        # Upload sample video
        file_path = 'sample_videos/campaign_sample.mp4'
        file_name = f'campaigns/videos/user_{user_id}/campaign_{campaign_id}_promo.mp4'

    # Upload to B2
    with open(file_path, 'rb') as file:
        url = b2_service.upload_file(file, file_name)

    return url
```

### Step 3: Create Sample Media Files

Create a directory for sample media:

```bash
cd astegni-backend
mkdir -p sample_media/images
mkdir -p sample_media/videos
```

Add sample files:
- `sample_media/images/sample_campaign.jpg` (1200x628px recommended)
- `sample_media/videos/sample_campaign.mp4` (720p recommended)

### Step 4: Update API Endpoints

Add media upload endpoint in `manage_campaigns_endpoints.py`:

```python
@router.post("/campaigns/{campaign_id}/upload-media")
async def upload_campaign_media(
    campaign_id: int,
    file: UploadFile = File(...),
    admin_id: Optional[int] = None
):
    """
    Upload media file for a campaign

    Supports: JPG, PNG, MP4
    Max size: 10MB for images, 100MB for videos
    """
    # Verify access
    if admin_id:
        verify_department_access(admin_id)

    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.mp4', '.mov'}
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    # Get campaign
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT advertiser_id FROM ad_campaigns WHERE id = %s",
        (campaign_id,)
    )
    row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Campaign not found")

    advertiser_id = row[0]

    # Upload to B2
    file_type = 'images' if file_ext in {'.jpg', '.jpeg', '.png'} else 'videos'
    file_name = f'campaigns/{file_type}/user_{advertiser_id}/campaign_{campaign_id}_{int(time.time())}{file_ext}'

    b2_service = get_backblaze_service()
    file_url = b2_service.upload_file(file.file, file_name)

    # Update campaign creative_urls
    cursor.execute("""
        UPDATE ad_campaigns
        SET creative_urls =
            CASE
                WHEN creative_urls IS NULL THEN ARRAY[%s]::TEXT[]
                ELSE creative_urls || %s
            END
        WHERE id = %s
    """, (file_url, file_url, campaign_id))

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "message": "Media uploaded successfully",
        "url": file_url,
        "campaign_id": campaign_id
    }
```

## Frontend Media Upload Integration

### Step 1: Add Upload Button to Campaign Cards

Update `manage-campaigns-table-loader.js`:

```javascript
// Add upload button to campaign actions
const uploadBtn = document.createElement('button');
uploadBtn.className = 'px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm';
uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Media';
uploadBtn.onclick = () => openMediaUploadModal(campaign.id);
```

### Step 2: Create Media Upload Modal

Add to `manage-campaigns.html`:

```html
<!-- Media Upload Modal -->
<div id="media-upload-modal" class="modal hidden">
    <div class="modal-overlay" onclick="closeMediaUploadModal()"></div>
    <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
            <h2 class="text-xl font-bold">Upload Campaign Media</h2>
            <button class="modal-close" onclick="closeMediaUploadModal()">×</button>
        </div>
        <div class="modal-body">
            <form id="mediaUploadForm" onsubmit="handleMediaUpload(event)">
                <input type="hidden" id="uploadCampaignId">

                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Media Type</label>
                    <select id="mediaType" class="w-full p-2 border rounded-lg">
                        <option value="image">Image (JPG, PNG)</option>
                        <option value="video">Video (MP4, MOV)</option>
                    </select>
                </div>

                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Select File</label>
                    <input type="file" id="mediaFile" accept="image/*,video/*"
                           class="w-full p-2 border rounded-lg" required>
                    <p class="text-xs text-gray-500 mt-1">
                        Max size: 10MB for images, 100MB for videos
                    </p>
                </div>

                <div id="mediaPreview" class="hidden mb-4">
                    <img id="imagePreview" class="w-full h-48 object-cover rounded-lg" style="display:none;">
                    <video id="videoPreview" class="w-full h-48 rounded-lg" controls style="display:none;"></video>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn-secondary px-4 py-2 border rounded-lg"
                            onclick="closeMediaUploadModal()">Cancel</button>
                    <button type="submit" class="btn-primary px-4 py-2 bg-blue-500 text-white rounded-lg">
                        Upload
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
```

### Step 3: Implement Upload Handler

```javascript
async function handleMediaUpload(event) {
    event.preventDefault();

    const campaignId = document.getElementById('uploadCampaignId').value;
    const fileInput = document.getElementById('mediaFile');
    const file = fileInput.files[0];

    if (!file) {
        showNotification('Please select a file', 'error');
        return;
    }

    // Show uploading state
    showNotification('Uploading media...', 'info');

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(
            `${API_BASE_URL}/api/manage-campaigns/campaigns/${campaignId}/upload-media?admin_id=${currentAdminId}`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }

        const result = await response.json();

        showNotification('Media uploaded successfully!', 'success');
        closeMediaUploadModal();

        // Reload campaign data
        reloadCampaignPanel(getCurrentPanel());

    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Failed to upload media', 'error');
    }
}
```

## Testing Media Integration

### Test with Sample Files

1. **Prepare sample files**:
   ```bash
   cd astegni-backend/sample_media
   # Add: sample_campaign.jpg (1200x628px)
   # Add: sample_campaign.mp4 (720p, 30s)
   ```

2. **Run seed with actual uploads**:
   ```bash
   python seed_campaign_data.py --use-real-media
   ```

3. **Test upload via UI**:
   - Open manage-campaigns.html
   - Click "Upload Media" on any campaign
   - Select an image or video
   - Upload should complete and show in campaign

### Verify B2 Storage

```bash
cd astegni-backend
python list_b2_files.py
```

Should show:
```
campaigns/images/user_1/campaign_123_main.jpg
campaigns/videos/user_1/campaign_123_promo.mp4
```

## CDN Configuration

### Option 1: B2 Native CDN
Use B2's built-in CDN:
```
https://f<bucket-id>.backblazeb2.com/file/<bucket-name>/campaigns/images/...
```

### Option 2: Cloudflare CDN (Recommended)
Set up Cloudflare in front of B2:
1. Configure B2 bucket as public
2. Add Cloudflare Worker to cache files
3. Use custom domain: `https://media.astegni.et/campaigns/...`

## Cost Estimation

### Backblaze B2 Pricing (as of 2025)
- Storage: $0.006/GB/month
- Download: $0.01/GB
- Upload: **FREE**

### Example Costs for 1000 Campaigns
- Storage: 10GB images + 50GB videos = 60GB × $0.006 = **$0.36/month**
- Downloads: 100GB/month × $0.01 = **$1.00/month**
- **Total: ~$1.50/month for 1000 campaigns**

## Migration Path

### Phase 1: Mock URLs (Current)
- Campaigns have placeholder B2 URLs
- No actual files stored
- Fast testing and development

### Phase 2: Sample Media
- Use 10 sample images/videos
- Rotate among campaigns
- Test upload/retrieval flow

### Phase 3: Full Integration
- Advertisers upload their own media
- Automatic B2 storage
- CDN-optimized delivery

### Phase 4: Advanced Features
- Image resizing/optimization
- Video transcoding
- Multiple formats (webp, h264, h265)
- Thumbnail generation

## Security Considerations

1. **File Validation**:
   - Check file extension
   - Verify MIME type
   - Scan for malicious content

2. **Size Limits**:
   - Images: 10MB max
   - Videos: 100MB max
   - Enforce in backend

3. **Access Control**:
   - Only verified advertisers can upload
   - Admins can review before approval
   - Automatic content moderation

4. **Storage Quota**:
   - Set per-advertiser limits
   - Track usage in database
   - Alert when approaching limits

## Monitoring & Analytics

Track media performance:
- View counts per media
- Download bandwidth usage
- Popular campaigns by views
- Storage usage per advertiser
- CDN cache hit rates

---

## Quick Reference

**Current Status**: Mock URLs in database
**Next Step**: Add real sample media files
**Full Integration**: Implement upload endpoints
**Production Ready**: Add CDN and optimization

**Note**: The current implementation uses **mock URLs** that point to Backblaze B2 paths but don't have actual files yet. This allows you to test the entire campaign management system without setting up B2 storage first. When ready to add actual media, follow this guide to integrate Backblaze B2 uploads.
