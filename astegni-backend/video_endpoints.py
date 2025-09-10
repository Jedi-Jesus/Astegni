# video_endpoints.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app import get_db, get_current_user, User
from video_models import VideoReel, VideoEngagement, VideoComment, Playlist, PlaylistItem, TutorFollow
from cache import cache_key_wrapper
import json

router = APIRouter(prefix="/api/videos", tags=["videos"])

# Pydantic models
class VideoReelResponse(BaseModel):
    id: int
    tutor_id: int
    tutor_name: str
    tutor_profile_picture: Optional[str]
    tutor_subject: Optional[str]
    title: str
    video_number: Optional[str]
    description: Optional[str]
    video_url: str
    thumbnail_url: Optional[str]
    duration: Optional[str]
    category: Optional[str]
    subject: Optional[str]
    grade_level: Optional[str]
    views: int
    upload_date: str
    engagement_stats: dict
    is_following: bool = False

class VideoEngagementRequest(BaseModel):
    engagement_type: str  # 'like', 'dislike', 'favorite', 'save'

class CommentRequest(BaseModel):
    text: str
    parent_comment_id: Optional[int] = None

class CommentResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_picture: Optional[str]
    text: str
    created_at: str
    replies: List[dict] = []

class PlaylistRequest(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True

class PlaylistItemRequest(BaseModel):
    video_id: int

# Get all video reels with filters
@router.get("/reels", response_model=List[VideoReelResponse])
@cache_key_wrapper(prefix="video_reels", ttl=60)
def get_video_reels(
    filter: Optional[str] = Query("all", description="Filter type: all, favorites, saved, liked, history"),
    search: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = None,
    subject: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),  # CHANGED: Now requires authentication
    db: Session = Depends(get_db)
):
    """Get video reels with optional filters and search - requires authentication"""
    
    query = db.query(VideoReel).filter(VideoReel.is_active == True)
    
    # Get user ID (always available since authentication is required)
    user_id = current_user.id  # CHANGED: No longer conditional
    
    # Apply filters based on engagement type
    if filter != "all":  # CHANGED: Removed user_id check since it's always available
        engagement_query = db.query(VideoEngagement).filter(VideoEngagement.user_id == user_id)
        
        if filter == "favorites":
            engagement_query = engagement_query.filter(VideoEngagement.engagement_type == "favorite")
        elif filter == "saved":
            engagement_query = engagement_query.filter(VideoEngagement.engagement_type == "save")
        elif filter == "liked":
            engagement_query = engagement_query.filter(VideoEngagement.engagement_type == "like")
        elif filter == "history":
            engagement_query = engagement_query.filter(VideoEngagement.engagement_type == "view")
        
        video_ids = [e.video_id for e in engagement_query.all()]
        if video_ids:
            query = query.filter(VideoReel.id.in_(video_ids))
        else:
            return []  # No videos match the filter
    
    # Apply search
    if search:
        search_term = f"%{search}%"
        query = query.join(User, User.id == VideoReel.tutor_id).filter(
            or_(
                VideoReel.title.ilike(search_term),
                VideoReel.description.ilike(search_term),
                VideoReel.subject.ilike(search_term),
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term)
            )
        )
    
    # Apply category and subject filters
    if category:
        query = query.filter(VideoReel.category == category)
    if subject:
        query = query.filter(VideoReel.subject == subject)
    
    # Get videos
    videos = query.order_by(desc(VideoReel.upload_date)).offset(offset).limit(limit).all()
    
    # Build response with engagement stats
    response = []
    for video in videos:
        # Get tutor info
        tutor = db.query(User).filter(User.id == video.tutor_id).first()
        
        # Get engagement stats
        engagement_stats = get_video_engagement_stats(db, video.id, user_id)
        
        # Check if following tutor
        is_following = db.query(TutorFollow).filter(  # CHANGED: No longer conditional
            TutorFollow.follower_id == user_id,
            TutorFollow.tutor_id == video.tutor_id
        ).first() is not None
        
        response.append(VideoReelResponse(
            id=video.id,
            tutor_id=video.tutor_id,
            tutor_name=f"{tutor.first_name} {tutor.last_name}" if tutor else "Unknown",
            tutor_profile_picture=tutor.profile_picture if tutor else None,
            tutor_subject=video.subject,
            title=video.title,
            video_number=video.video_number,
            description=video.description,
            video_url=video.video_url,
            thumbnail_url=video.thumbnail_url,
            duration=video.duration,
            category=video.category,
            subject=video.subject,
            grade_level=video.grade_level,
            views=video.views,
            upload_date=video.upload_date.isoformat(),
            engagement_stats=engagement_stats,
            is_following=is_following
        ))
    
    return response

# Get single video details
@router.get("/reels/{video_id}", response_model=VideoReelResponse)
def get_video_reel(
    video_id: int,
    current_user: User = Depends(get_current_user),  # CHANGED: Now requires authentication
    db: Session = Depends(get_db)
):
    """Get a single video reel by ID - requires authentication"""
    video = db.query(VideoReel).filter(
        VideoReel.id == video_id,
        VideoReel.is_active == True
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Increment view count
    video.views += 1
    
    # Add view engagement (always add since user is authenticated)
    view_engagement = db.query(VideoEngagement).filter(  # CHANGED: Removed if condition
        VideoEngagement.video_id == video_id,
        VideoEngagement.user_id == current_user.id,
        VideoEngagement.engagement_type == "view"
    ).first()
    
    if not view_engagement:
        view_engagement = VideoEngagement(
            video_id=video_id,
            user_id=current_user.id,
            engagement_type="view"
        )
        db.add(view_engagement)
    
    db.commit()
    
    # Get tutor info
    tutor = db.query(User).filter(User.id == video.tutor_id).first()
    
    # Get engagement stats
    user_id = current_user.id  # CHANGED: No longer conditional
    engagement_stats = get_video_engagement_stats(db, video.id, user_id)
    
    # Check if following
    is_following = db.query(TutorFollow).filter(  # CHANGED: No longer conditional
        TutorFollow.follower_id == user_id,
        TutorFollow.tutor_id == video.tutor_id
    ).first() is not None
    
    return VideoReelResponse(
        id=video.id,
        tutor_id=video.tutor_id,
        tutor_name=f"{tutor.first_name} {tutor.last_name}" if tutor else "Unknown",
        tutor_profile_picture=tutor.profile_picture if tutor else None,
        tutor_subject=video.subject,
        title=video.title,
        video_number=video.video_number,
        description=video.description,
        video_url=video.video_url,
        thumbnail_url=video.thumbnail_url,
        duration=video.duration,
        category=video.category,
        subject=video.subject,
        grade_level=video.grade_level,
        views=video.views,
        upload_date=video.upload_date.isoformat(),
        engagement_stats=engagement_stats,
        is_following=is_following
    )

# Toggle engagement (like, dislike, favorite, save)
@router.post("/reels/{video_id}/engage")
def toggle_engagement(
    video_id: int,
    request: VideoEngagementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle engagement on a video"""
    
    # Check if video exists
    video = db.query(VideoReel).filter(VideoReel.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Check existing engagement
    existing = db.query(VideoEngagement).filter(
        VideoEngagement.video_id == video_id,
        VideoEngagement.user_id == current_user.id,
        VideoEngagement.engagement_type == request.engagement_type
    ).first()
    
    if existing:
        # Remove engagement
        db.delete(existing)
        db.commit()
        return {"engaged": False, "message": f"Removed {request.engagement_type}"}
    else:
        # Handle mutual exclusivity for like/dislike
        if request.engagement_type in ["like", "dislike"]:
            opposite = "dislike" if request.engagement_type == "like" else "like"
            opposite_engagement = db.query(VideoEngagement).filter(
                VideoEngagement.video_id == video_id,
                VideoEngagement.user_id == current_user.id,
                VideoEngagement.engagement_type == opposite
            ).first()
            if opposite_engagement:
                db.delete(opposite_engagement)
        
        # Add new engagement
        new_engagement = VideoEngagement(
            video_id=video_id,
            user_id=current_user.id,
            engagement_type=request.engagement_type
        )
        db.add(new_engagement)
        db.commit()
        return {"engaged": True, "message": f"Added {request.engagement_type}"}

# Get comments for a video
@router.get("/reels/{video_id}/comments", response_model=List[CommentResponse])
def get_video_comments(
    video_id: int,
    db: Session = Depends(get_db)
):
    """Get comments for a video"""
    comments = db.query(VideoComment).filter(
        VideoComment.video_id == video_id,
        VideoComment.parent_comment_id == None,
        VideoComment.is_deleted == False
    ).order_by(desc(VideoComment.created_at)).all()
    
    response = []
    for comment in comments:
        user = db.query(User).filter(User.id == comment.user_id).first()
        
        # Get replies
        replies = []
        for reply in comment.replies:
            if not reply.is_deleted:
                reply_user = db.query(User).filter(User.id == reply.user_id).first()
                replies.append({
                    "id": reply.id,
                    "user_id": reply.user_id,
                    "user_name": f"{reply_user.first_name} {reply_user.last_name}" if reply_user else "Unknown",
                    "user_picture": reply_user.profile_picture if reply_user else None,
                    "text": reply.text,
                    "created_at": reply.created_at.isoformat()
                })
        
        response.append(CommentResponse(
            id=comment.id,
            user_id=comment.user_id,
            user_name=f"{user.first_name} {user.last_name}" if user else "Unknown",
            user_picture=user.profile_picture if user else None,
            text=comment.text,
            created_at=comment.created_at.isoformat(),
            replies=replies
        ))
    
    return response

# Add comment to video
@router.post("/reels/{video_id}/comments")
def add_video_comment(
    video_id: int,
    request: CommentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a video"""
    
    # Check if video exists
    video = db.query(VideoReel).filter(VideoReel.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Create comment
    comment = VideoComment(
        video_id=video_id,
        user_id=current_user.id,
        parent_comment_id=request.parent_comment_id,
        text=request.text
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return {
        "id": comment.id,
        "text": comment.text,
        "created_at": comment.created_at.isoformat(),
        "message": "Comment added successfully"
    }

# Follow/unfollow tutor
@router.post("/tutors/{tutor_id}/follow")
def toggle_follow(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Follow or unfollow a tutor"""
    
    # Check if tutor exists and is actually a tutor
    tutor = db.query(User).filter(User.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    if "tutor" not in tutor.roles:
        raise HTTPException(status_code=400, detail="User is not a tutor")
    
    # Check existing follow
    existing = db.query(TutorFollow).filter(
        TutorFollow.follower_id == current_user.id,
        TutorFollow.tutor_id == tutor_id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        return {"following": False, "message": "Unfollowed tutor"}
    else:
        new_follow = TutorFollow(
            follower_id=current_user.id,
            tutor_id=tutor_id
        )
        db.add(new_follow)
        db.commit()
        return {"following": True, "message": "Following tutor"}

# Get user's playlists
@router.get("/playlists")
def get_user_playlists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's playlists"""
    playlists = db.query(Playlist).filter(
        Playlist.user_id == current_user.id
    ).order_by(desc(Playlist.updated_at)).all()
    
    response = []
    for playlist in playlists:
        video_count = db.query(PlaylistItem).filter(
            PlaylistItem.playlist_id == playlist.id
        ).count()
        
        response.append({
            "id": playlist.id,
            "name": playlist.name,
            "description": playlist.description,
            "is_public": playlist.is_public,
            "video_count": video_count,
            "created_at": playlist.created_at.isoformat(),
            "updated_at": playlist.updated_at.isoformat()
        })
    
    return response

# Create playlist
@router.post("/playlists")
def create_playlist(
    request: PlaylistRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new playlist"""
    playlist = Playlist(
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        is_public=request.is_public
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    
    return {
        "id": playlist.id,
        "name": playlist.name,
        "message": "Playlist created successfully"
    }

# Add video to playlist
@router.post("/playlists/{playlist_id}/videos")
def add_to_playlist(
    playlist_id: int,
    request: PlaylistItemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a video to a playlist"""
    
    # Check playlist ownership
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == current_user.id
    ).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or not authorized")
    
    # Check if video exists
    video = db.query(VideoReel).filter(VideoReel.id == request.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Check if already in playlist
    existing = db.query(PlaylistItem).filter(
        PlaylistItem.playlist_id == playlist_id,
        PlaylistItem.video_id == request.video_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Video already in playlist")
    
    # Get position
    max_position = db.query(func.max(PlaylistItem.position)).filter(
        PlaylistItem.playlist_id == playlist_id
    ).scalar() or 0
    
    # Add to playlist
    playlist_item = PlaylistItem(
        playlist_id=playlist_id,
        video_id=request.video_id,
        position=max_position + 1
    )
    db.add(playlist_item)
    
    # Also add save engagement
    save_engagement = db.query(VideoEngagement).filter(
        VideoEngagement.video_id == request.video_id,
        VideoEngagement.user_id == current_user.id,
        VideoEngagement.engagement_type == "save"
    ).first()
    
    if not save_engagement:
        save_engagement = VideoEngagement(
            video_id=request.video_id,
            user_id=current_user.id,
            engagement_type="save"
        )
        db.add(save_engagement)
    
    db.commit()
    
    return {"message": "Video added to playlist"}

# Helper function to get engagement stats
def get_video_engagement_stats(db: Session, video_id: int, user_id: Optional[int] = None):
    """Get engagement statistics for a video"""
    
    engagements = db.query(
        VideoEngagement.engagement_type,
        func.count(VideoEngagement.id).label('count')
    ).filter(
        VideoEngagement.video_id == video_id
    ).group_by(VideoEngagement.engagement_type).all()
    
    stats = {
        "likes": 0,
        "dislikes": 0,
        "favorites": 0,
        "saves": 0,
        "comments": 0,
        "user_liked": False,
        "user_disliked": False,
        "user_favorited": False,
        "user_saved": False
    }
    
    for engagement in engagements:
        if engagement.engagement_type == "like":
            stats["likes"] = engagement.count
        elif engagement.engagement_type == "dislike":
            stats["dislikes"] = engagement.count
        elif engagement.engagement_type == "favorite":
            stats["favorites"] = engagement.count
        elif engagement.engagement_type == "save":
            stats["saves"] = engagement.count
    
    # Get comment count
    comment_count = db.query(VideoComment).filter(
        VideoComment.video_id == video_id,
        VideoComment.is_deleted == False
    ).count()
    stats["comments"] = comment_count
    
    # Get user-specific engagement status
    if user_id:
        user_engagements = db.query(VideoEngagement).filter(
            VideoEngagement.video_id == video_id,
            VideoEngagement.user_id == user_id
        ).all()
        
        for engagement in user_engagements:
            if engagement.engagement_type == "like":
                stats["user_liked"] = True
            elif engagement.engagement_type == "dislike":
                stats["user_disliked"] = True
            elif engagement.engagement_type == "favorite":
                stats["user_favorited"] = True
            elif engagement.engagement_type == "save":
                stats["user_saved"] = True
    
    return stats