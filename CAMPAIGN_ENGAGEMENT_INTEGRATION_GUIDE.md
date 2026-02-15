# Campaign Engagement Integration Guide

## Quick Start

### 1. Backend Integration

The new campaign engagement system is ready to use. Just add the endpoints to your app:

```python
# app.py

from campaign_engagement_endpoints import router as engagement_router

# Add with other routers
app.include_router(engagement_router)
```

### 2. Test the System

```bash
cd astegni-backend
python test_campaign_engagement.py
```

### 3. API Documentation

Access the auto-generated API docs:
```
http://localhost:8000/docs
```

All new endpoints will be available under `/api/campaigns/{campaign_id}/...`

---

## API Endpoints Reference

### Engagement Actions

#### Like/Share/Save/Bookmark Campaign
```http
POST /api/campaigns/{campaign_id}/engage
Content-Type: application/json

{
    "engagement_type": "like",  // like, share, save, bookmark
    "impression_id": 123        // optional
}
```

#### Comment on Campaign
```http
POST /api/campaigns/{campaign_id}/engage
Content-Type: application/json

{
    "engagement_type": "comment",
    "comment_text": "Great campaign!",
    "impression_id": 123,           // optional
    "parent_comment_id": 456        // optional (for replies)
}
```

#### Remove Engagement (Unlike/Unshare/etc)
```http
DELETE /api/campaigns/{campaign_id}/engage/{engagement_type}
```

#### Delete Comment
```http
DELETE /api/campaigns/{campaign_id}/comments/{comment_id}
```

### Get Engagement Data

#### Get Campaign Comments
```http
GET /api/campaigns/{campaign_id}/comments?page=1&limit=20&parent_only=false
```

#### Get Comment Replies
```http
GET /api/campaigns/{campaign_id}/comments/{comment_id}/replies?page=1&limit=20
```

#### Get Engagement Counts
```http
GET /api/campaigns/{campaign_id}/engagements
```

Response:
```json
{
    "campaign_id": 3,
    "total_counts": {
        "likes": 45,
        "shares": 12,
        "comments": 23,
        "saves": 8,
        "bookmarks": 5,
        "total": 93
    },
    "breakdown": [
        {
            "type": "like",
            "count": 45,
            "unique_users": 45
        },
        // ...
    ]
}
```

#### Check if User Engaged
```http
GET /api/campaigns/{campaign_id}/engagements/check?engagement_type=like
```

Response:
```json
{
    "campaign_id": 3,
    "engagement_type": "like",
    "has_engaged": true
}
```

#### Get Full Campaign Metrics
```http
GET /api/campaigns/{campaign_id}/metrics
```

Response:
```json
{
    "id": 3,
    "name": "Campaign Name",
    "status": "active",
    "config": {
        "cost_per_impression": 0.05,
        "total_impressions_planned": 100000
    },
    "impressions": {
        "total": 45230,
        "delivered": 45230,
        "reach": 12450
    },
    "actions": {
        "clicks": 1234,
        "conversions": 234
    },
    "engagement": {
        "likes": 456,
        "shares": 123,
        "comments": 234,
        "saves": 89,
        "bookmarks": 45
    },
    "rates": {
        "viewability_rate": 92.5,
        "click_through_rate": 2.73,
        "conversion_rate": 0.52,
        "engagement_rate": 4.85
    }
}
```

---

## Frontend Integration Examples

### Like Button Component

```javascript
// js/advertiser-profile/campaign-engagement.js

class CampaignEngagementManager {
    constructor() {
        this.API_BASE = 'http://localhost:8000';
    }

    async toggleLike(campaignId) {
        try {
            // Check if already liked
            const checkResponse = await fetch(
                `${this.API_BASE}/api/campaigns/${campaignId}/engagements/check?engagement_type=like`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );

            const checkData = await checkResponse.json();

            if (checkData.has_engaged) {
                // Unlike
                const response = await fetch(
                    `${this.API_BASE}/api/campaigns/${campaignId}/engage/like`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                        }
                    }
                );

                if (response.ok) {
                    this.updateLikeButton(campaignId, false);
                    this.updateLikeCount(campaignId, -1);
                }
            } else {
                // Like
                const response = await fetch(
                    `${this.API_BASE}/api/campaigns/${campaignId}/engage`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                        },
                        body: JSON.stringify({
                            engagement_type: 'like'
                        })
                    }
                );

                if (response.ok) {
                    this.updateLikeButton(campaignId, true);
                    this.updateLikeCount(campaignId, 1);
                }
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }

    updateLikeButton(campaignId, isLiked) {
        const button = document.querySelector(`[data-campaign-id="${campaignId}"] .like-button`);
        if (button) {
            if (isLiked) {
                button.classList.add('liked');
                button.innerHTML = '❤️ Liked';
            } else {
                button.classList.remove('liked');
                button.innerHTML = '🤍 Like';
            }
        }
    }

    updateLikeCount(campaignId, delta) {
        const countElement = document.querySelector(`[data-campaign-id="${campaignId}"] .like-count`);
        if (countElement) {
            const current = parseInt(countElement.textContent) || 0;
            countElement.textContent = current + delta;
        }
    }

    async loadEngagementCounts(campaignId) {
        try {
            const response = await fetch(
                `${this.API_BASE}/api/campaigns/${campaignId}/engagements`
            );

            const data = await response.json();

            // Update UI with counts
            document.querySelector(`[data-campaign-id="${campaignId}"] .like-count`)
                .textContent = data.total_counts.likes;
            document.querySelector(`[data-campaign-id="${campaignId}"] .share-count`)
                .textContent = data.total_counts.shares;
            document.querySelector(`[data-campaign-id="${campaignId}"] .comment-count`)
                .textContent = data.total_counts.comments;

        } catch (error) {
            console.error('Error loading engagement counts:', error);
        }
    }
}

// Global instance
const campaignEngagement = new CampaignEngagementManager();
```

### Comment Section Component

```javascript
// js/advertiser-profile/campaign-comments.js

class CampaignCommentsManager {
    constructor() {
        this.API_BASE = 'http://localhost:8000';
        this.currentPage = 1;
        this.limit = 20;
    }

    async loadComments(campaignId) {
        try {
            const response = await fetch(
                `${this.API_BASE}/api/campaigns/${campaignId}/comments?page=${this.currentPage}&limit=${this.limit}`
            );

            const data = await response.json();

            this.renderComments(data.comments, campaignId);
            this.renderPagination(data.pagination);

        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    async postComment(campaignId, commentText, parentCommentId = null) {
        try {
            const response = await fetch(
                `${this.API_BASE}/api/campaigns/${campaignId}/engage`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    },
                    body: JSON.stringify({
                        engagement_type: 'comment',
                        comment_text: commentText,
                        parent_comment_id: parentCommentId
                    })
                }
            );

            if (response.ok) {
                // Reload comments
                this.loadComments(campaignId);
            }

        } catch (error) {
            console.error('Error posting comment:', error);
        }
    }

    async deleteComment(campaignId, commentId) {
        if (!confirm('Delete this comment?')) return;

        try {
            const response = await fetch(
                `${this.API_BASE}/api/campaigns/${campaignId}/comments/${commentId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );

            if (response.ok) {
                // Reload comments
                this.loadComments(campaignId);
            }

        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    }

    renderComments(comments, campaignId) {
        const container = document.getElementById('comments-container');
        if (!container) return;

        container.innerHTML = comments.map(comment => `
            <div class="comment" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <span class="user-email">${comment.user_email}</span>
                    <span class="comment-time">${new Date(comment.created_at).toLocaleString()}</span>
                </div>
                <div class="comment-text">${comment.comment_text}</div>
                <div class="comment-actions">
                    <button onclick="campaignComments.showReplyForm(${comment.id})">
                        Reply (${comment.reply_count})
                    </button>
                    <button onclick="campaignComments.deleteComment(${campaignId}, ${comment.id})">
                        Delete
                    </button>
                </div>
                <div id="replies-${comment.id}" class="replies"></div>
            </div>
        `).join('');
    }

    async loadReplies(campaignId, commentId) {
        try {
            const response = await fetch(
                `${this.API_BASE}/api/campaigns/${campaignId}/comments/${commentId}/replies`
            );

            const data = await response.json();

            const repliesContainer = document.getElementById(`replies-${commentId}`);
            if (repliesContainer) {
                repliesContainer.innerHTML = data.replies.map(reply => `
                    <div class="reply" data-comment-id="${reply.id}">
                        <div class="reply-header">
                            <span class="user-email">${reply.user_email}</span>
                            <span class="reply-time">${new Date(reply.created_at).toLocaleString()}</span>
                        </div>
                        <div class="reply-text">${reply.comment_text}</div>
                    </div>
                `).join('');
            }

        } catch (error) {
            console.error('Error loading replies:', error);
        }
    }
}

// Global instance
const campaignComments = new CampaignCommentsManager();
```

### HTML Example

```html
<!-- Campaign Card with Engagement -->
<div class="campaign-card" data-campaign-id="3">
    <h3>Campaign Name</h3>
    <img src="campaign-image.jpg" alt="Campaign">

    <!-- Engagement Buttons -->
    <div class="engagement-actions">
        <button class="like-button" onclick="campaignEngagement.toggleLike(3)">
            🤍 Like
        </button>
        <span class="like-count">0</span>

        <button class="share-button" onclick="campaignEngagement.shareCampaign(3)">
            🔗 Share
        </button>
        <span class="share-count">0</span>

        <button class="comment-button" onclick="toggleComments(3)">
            💬 Comments
        </button>
        <span class="comment-count">0</span>
    </div>

    <!-- Comments Section (toggleable) -->
    <div id="comments-section-3" class="comments-section" style="display:none;">
        <!-- Comment Form -->
        <div class="comment-form">
            <textarea id="comment-text-3" placeholder="Write a comment..."></textarea>
            <button onclick="postComment(3)">Post Comment</button>
        </div>

        <!-- Comments List -->
        <div id="comments-container"></div>
    </div>
</div>

<script>
function toggleComments(campaignId) {
    const section = document.getElementById(`comments-section-${campaignId}`);
    if (section.style.display === 'none') {
        section.style.display = 'block';
        campaignComments.loadComments(campaignId);
    } else {
        section.style.display = 'none';
    }
}

function postComment(campaignId) {
    const textarea = document.getElementById(`comment-text-${campaignId}`);
    const text = textarea.value.trim();
    if (text) {
        campaignComments.postComment(campaignId, text);
        textarea.value = '';
    }
}

// Load engagement counts on page load
document.addEventListener('DOMContentLoaded', () => {
    campaignEngagement.loadEngagementCounts(3);
});
</script>
```

---

## Database Query Examples

### Get Top Engaged Users
```sql
SELECT
    user_id,
    COUNT(*) as total_engagements,
    COUNT(CASE WHEN engagement_type = 'like' THEN 1 END) as likes,
    COUNT(CASE WHEN engagement_type = 'comment' THEN 1 END) as comments,
    COUNT(CASE WHEN engagement_type = 'share' THEN 1 END) as shares
FROM campaign_engagement
WHERE campaign_id = 3
GROUP BY user_id
ORDER BY total_engagements DESC
LIMIT 10;
```

### Get Engagement Timeline
```sql
SELECT
    DATE(created_at) as date,
    engagement_type,
    COUNT(*) as count
FROM campaign_engagement
WHERE campaign_id = 3
AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), engagement_type
ORDER BY date DESC, engagement_type;
```

### Get Most Commented Campaigns
```sql
SELECT
    c.id,
    c.name,
    COUNT(ce.id) as comment_count
FROM campaign_profile c
JOIN campaign_engagement ce ON ce.campaign_id = c.id
WHERE ce.engagement_type = 'comment'
GROUP BY c.id, c.name
ORDER BY comment_count DESC
LIMIT 10;
```

---

## Testing Checklist

- [ ] Create engagement (like, share, comment, save, bookmark)
- [ ] Remove engagement (unlike, unshare, etc.)
- [ ] Post comment
- [ ] Reply to comment
- [ ] Delete comment
- [ ] Check if user engaged
- [ ] Load engagement counts
- [ ] Load campaign metrics
- [ ] Pagination for comments
- [ ] Comment threading display
- [ ] Engagement timeline/analytics

---

## Next Steps

1. **Backend**: Add `campaign_engagement_endpoints.py` to `app.py`
2. **Frontend**: Create engagement UI components
3. **Testing**: Run `test_campaign_engagement.py`
4. **Documentation**: Update API docs
5. **Analytics**: Build engagement dashboards for advertisers
6. **Notifications**: Notify advertisers of new engagements
7. **Moderation**: Add content moderation for comments

---

## Files Created

### Migration Scripts
- `migrate_create_campaign_engagement_table.py`
- `migrate_remove_campaign_aggregate_metrics.py`

### Backend
- `campaign_engagement_endpoints.py` (ready to import)

### Testing
- `test_campaign_engagement.py`

### Documentation
- `CAMPAIGN_ENGAGEMENT_ARCHITECTURE_OPTIONS.md`
- `CAMPAIGN_CLEANUP_COMPLETE_SUMMARY.md`
- `CAMPAIGN_ENGAGEMENT_INTEGRATION_GUIDE.md` (this file)

---

## Support

For questions or issues:
1. Check database views: `campaign_with_full_metrics`
2. Use helper functions: `has_user_engaged()`, `get_campaign_engagement_counts()`
3. Test with: `python test_campaign_engagement.py`
4. Review API docs: `http://localhost:8000/docs`
