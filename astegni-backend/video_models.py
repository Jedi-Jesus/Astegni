"""
Video/Reels Models and Endpoints for Astegni Platform
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, JSON, ForeignKey, DateTime, desc, func
from sqlalchemy.orm import relationship, Session, joinedload
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form
from app import Base, get_db, get_current_user, User

# ============================================
# VIDEO-RELATED MODELS (if not in main app.py)
# ============================================

class Playlist(Base):
    __tablename__ = "playlists"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String, nullable=False)
    description = Column(Text)
    thumbnail_url = Column(String)
    is_public = Column(Boolean, default=True)
    
    video_count = Column(Integer, default=0)
    total_duration = Column(Integer, default=0)  # in seconds
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", backref="playlists")
    items = relationship("PlaylistItem", back_populates="playlist", cascade="all, delete-orphan")

class PlaylistItem(Base):
    __tablename__ = "playlist_items"
    
    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("video_reels.id"), nullable=False)
    
    position = Column(Integer, nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    playlist = relationship("Playlist", back_populates="items")
    video = relationship("VideoReel")

class VideoView(Base):
    __tablename__ = "video_views"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("video_reels.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    view_duration = Column(Integer)  # seconds watched
    view_percentage = Column(Float)  # percentage of video watched
    ip_address = Column(String)
    user_agent = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    video = relationship("VideoReel")
    user = relationship("User")

class VideoReport(Base):
    __tablename__ = "video_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("video_reels.id"), nullable=False)
    reported_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    reason = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="pending")  # pending, reviewed, resolved, dismissed
    
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime)
    
    video = relationship("VideoReel")
    reporter = relationship("User")

# ============================================
# PYDANTIC MODELS
# ============================================

class VideoUploadRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    tags: Optional[List[str]] = []

class VideoUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    tags: Optional[List[str]] = None

class PlaylistCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True

class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class VideoReportRequest(BaseModel):
    reason: str = Field(..., regex="^(inappropriate|copyright|spam|misleading|other)$")
    description: Optional[str] = None

class VideoAnalytics(BaseModel):
    video_id: int
    total_views: int
    unique_viewers: int
    average_watch_time: float
    completion_rate: float
    engagement_rate: float
    likes: int
    dislikes: int
    comments: int
    shares: int
    saves: int

# ============================================
# VIDEO ROUTER
# ============================================

video_router = APIRouter(prefix="/api/videos", tags=["videos"])

@video_router.get("/trending")
def get_trending_videos(
    period: str = Query("week", regex="^(day|week|month|all)$"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get trending videos based on engagement"""
    from app import VideoReel
    
    # Calculate date threshold
    if period == "day":
        date_threshold = datetime.utcnow() - timedelta(days=1)
    elif period == "week":
        date_threshold = datetime.utcnow() - timedelta(weeks=1)
    elif period == "month":
        date_threshold = datetime.utcnow() - timedelta(days=30)
    else:
        date_threshold = None
    
    query = db.query(VideoReel).filter(VideoReel.is_active == True)
    
    if date_threshold:
        query = query.filter(VideoReel.created_at >= date_threshold)
    
    # Sort by engagement score (views + likes*2 + shares*3 + saves*4)
    videos = query.order_by(
        desc(VideoReel.views + VideoReel.likes*2 + VideoReel.shares*3 + VideoReel.saves*4)
    ).limit(limit).all()
    
    return {
        "videos": [
            {
                "id": video.id,
                "title": video.title,
                "thumbnail_url": video.thumbnail_url,
                "views": video.views,
                "likes": video.likes,
                "tutor_name": f"{video.tutor.user.first_name} {video.tutor.user.last_name}",
                "duration": video.duration,
                "created_at": video.created_at.isoformat()
            }
            for video in videos
        ]
    }

@video_router.get("/recommended")
def get_recommended_videos(
    current_user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get personalized video recommendations"""
    from app import VideoReel, VideoEngagement, StudentProfile
    
    # Get user's interests from their profile
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    if student and student.subjects:
        # Get videos matching user's subjects
        query = db.query(VideoReel).filter(
            VideoReel.is_active == True,
            VideoReel.subject.in_(student.subjects)
        )
        
        # Exclude already watched videos
        watched_videos = db.query(VideoView.video_id).filter(
            VideoView.user_id == current_user.id
        ).subquery()
        
        query = query.filter(~VideoReel.id.in_(watched_videos))
        
        videos = query.order_by(desc(VideoReel.rating)).limit(limit).all()
    else:
        # Fallback to popular videos
        videos = db.query(VideoReel).filter(
            VideoReel.is_active == True
        ).order_by(desc(VideoReel.views)).limit(limit).all()
    
    return {
        "videos": [
            {
                "id": video.id,
                "title": video.title,
                "description": video.description,
                "thumbnail_url": video.thumbnail_url,
                "video_url": video.video_url,
                "subject": video.subject,
                "grade_level": video.grade_level,
                "views": video.views,
                "likes": video.likes,
                "tutor_name": f"{video.tutor.user.first_name} {video.tutor.user.last_name}",
                "tutor_picture": video.tutor.user.profile_picture
            }
            for video in videos
        ]
    }

@video_router.get("/by-subject/{subject}")
def get_videos_by_subject(
    subject: str,
    grade_level: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get videos by subject and optionally grade level"""
    from app import VideoReel
    
    query = db.query(VideoReel).filter(
        VideoReel.is_active == True,
        VideoReel.subject == subject
    )
    
    if grade_level:
        query = query.filter(VideoReel.grade_level == grade_level)
    
    total = query.count()
    videos = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "videos": [
            {
                "id": video.id,
                "title": video.title,
                "thumbnail_url": video.thumbnail_url,
                "duration": video.duration,
                "views": video.views,
                "likes": video.likes,
                "tutor_name": f"{video.tutor.user.first_name} {video.tutor.user.last_name}",
                "created_at": video.created_at.isoformat()
            }
            for video in videos
        ],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@video_router.get("/{video_id}")
def get_video_details(
    video_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a video"""
    from app import VideoReel, VideoEngagement, VideoComment
    
    video = db.query(VideoReel).filter(
        VideoReel.id == video_id,
        VideoReel.is_active == True
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Get comments count
    comments_count = db.query(VideoComment).filter(
        VideoComment.video_id == video_id,
        VideoComment.is_deleted == False
    ).count()
    
    # Get related videos
    related_videos = db.query(VideoReel).filter(
        VideoReel.id != video_id,
        VideoReel.subject == video.subject,
        VideoReel.is_active == True
    ).limit(5).all()
    
    return {
        "id": video.id,
        "title": video.title,
        "description": video.description,
        "video_url": video.video_url,
        "thumbnail_url": video.thumbnail_url,
        "duration": video.duration,
        "category": video.category,
        "subject": video.subject,
        "grade_level": video.grade_level,
        "tags": video.tags or [],
        "views": video.views,
        "likes": video.likes,
        "dislikes": video.dislikes,
        "shares": video.shares,
        "saves": video.saves,
        "comments_count": comments_count,
        "tutor": {
            "id": video.tutor.id,
            "name": f"{video.tutor.user.first_name} {video.tutor.user.last_name}",
            "profile_picture": video.tutor.user.profile_picture,
            "rating": video.tutor.rating,
            "is_verified": video.tutor.is_verified
        },
        "related_videos": [
            {
                "id": rv.id,
                "title": rv.title,
                "thumbnail_url": rv.thumbnail_url,
                "views": rv.views,
                "duration": rv.duration
            }
            for rv in related_videos
        ],
        "created_at": video.created_at.isoformat()
    }

@video_router.post("/{video_id}/report")
def report_video(
    video_id: int,
    report: VideoReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Report a video for inappropriate content"""
    from app import VideoReel
    
    video = db.query(VideoReel).filter(VideoReel.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Check if already reported by this user
    existing = db.query(VideoReport).filter(
        VideoReport.video_id == video_id,
        VideoReport.reported_by == current_user.id,
        VideoReport.status == "pending"
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already reported this video")
    
    video_report = VideoReport(
        video_id=video_id,
        reported_by=current_user.id,
        reason=report.reason,
        description=report.description
    )
    
    db.add(video_report)
    db.commit()
    
    return {"message": "Video reported successfully"}

@video_router.get("/{video_id}/comments")
def get_video_comments(
    video_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get comments for a video"""
    from app import VideoComment
    
    # Get top-level comments
    query = db.query(VideoComment).filter(
        VideoComment.video_id == video_id,
        VideoComment.parent_comment_id == None,
        VideoComment.is_deleted == False
    ).order_by(desc(VideoComment.created_at))
    
    total = query.count()
    comments = query.offset((page - 1) * limit).limit(limit).all()
    
    results = []
    for comment in comments:
        # Get replies
        replies = db.query(VideoComment).filter(
            VideoComment.parent_comment_id == comment.id,
            VideoComment.is_deleted == False
        ).order_by(VideoComment.created_at).all()
        
        results.append({
            "id": comment.id,
            "user_name": f"{comment.user.first_name} {comment.user.last_name}",
            "user_picture": comment.user.profile_picture,
            "text": comment.text,
            "created_at": comment.created_at.isoformat(),
            "is_edited": comment.is_edited,
            "replies": [
                {
                    "id": reply.id,
                    "user_name": f"{reply.user.first_name} {reply.user.last_name}",
                    "user_picture": reply.user.profile_picture,
                    "text": reply.text,
                    "created_at": reply.created_at.isoformat(),
                    "is_edited": reply.is_edited
                }
                for reply in replies
            ]
        })
    
    return {
        "comments": results,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@video_router.post("/{video_id}/comments")
def add_comment(
    video_id: int,
    text: str = Form(...),
    parent_comment_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a video"""
    from app import VideoReel, VideoComment
    
    video = db.query(VideoReel).filter(VideoReel.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    comment = VideoComment(
        video_id=video_id,
        user_id=current_user.id,
        parent_comment_id=parent_comment_id,
        text=text
    )
    
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return {
        "id": comment.id,
        "text": comment.text,
        "user_name": f"{current_user.first_name} {current_user.last_name}",
        "created_at": comment.created_at.isoformat()
    }

# Playlist Management

@video_router.post("/playlists")
def create_playlist(
    playlist: PlaylistCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new playlist"""
    new_playlist = Playlist(
        user_id=current_user.id,
        **playlist.dict()
    )
    
    db.add(new_playlist)
    db.commit()
    db.refresh(new_playlist)
    
    return {
        "id": new_playlist.id,
        "name": new_playlist.name,
        "description": new_playlist.description,
        "is_public": new_playlist.is_public
    }

@video_router.get("/playlists")
def get_my_playlists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's playlists"""
    playlists = db.query(Playlist).filter(
        Playlist.user_id == current_user.id
    ).order_by(desc(Playlist.updated_at)).all()
    
    return {
        "playlists": [
            {
                "id": pl.id,
                "name": pl.name,
                "description": pl.description,
                "video_count": pl.video_count,
                "total_duration": pl.total_duration,
                "thumbnail_url": pl.thumbnail_url,
                "is_public": pl.is_public,
                "created_at": pl.created_at.isoformat()
            }
            for pl in playlists
        ]
    }

@video_router.post("/playlists/{playlist_id}/add")
def add_to_playlist(
    playlist_id: int,
    video_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a video to playlist"""
    from app import VideoReel
    
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == current_user.id
    ).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    video = db.query(VideoReel).filter(VideoReel.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Check if already in playlist
    existing = db.query(PlaylistItem).filter(
        PlaylistItem.playlist_id == playlist_id,
        PlaylistItem.video_id == video_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Video already in playlist")
    
    # Get next position
    max_position = db.query(func.max(PlaylistItem.position)).filter(
        PlaylistItem.playlist_id == playlist_id
    ).scalar() or 0
    
    playlist_item = PlaylistItem(
        playlist_id=playlist_id,
        video_id=video_id,
        position=max_position + 1
    )
    
    db.add(playlist_item)
    
    # Update playlist stats
    playlist.video_count += 1
    if video.duration:
        # Parse duration if it's a string like "5:30"
        if isinstance(video.duration, str) and ":" in video.duration:
            parts = video.duration.split(":")
            duration_seconds = int(parts[0]) * 60 + int(parts[1])
            playlist.total_duration += duration_seconds
    
    db.commit()
    
    return {"message": "Video added to playlist"}

@video_router.get("/playlists/{playlist_id}/videos")
def get_playlist_videos(
    playlist_id: int,
    db: Session = Depends(get_db)
):
    """Get videos in a playlist"""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    items = db.query(PlaylistItem).filter(
        PlaylistItem.playlist_id == playlist_id
    ).order_by(PlaylistItem.position).all()
    
    return {
        "playlist": {
            "id": playlist.id,
            "name": playlist.name,
            "description": playlist.description,
            "video_count": playlist.video_count
        },
        "videos": [
            {
                "id": item.video.id,
                "title": item.video.title,
                "thumbnail_url": item.video.thumbnail_url,
                "duration": item.video.duration,
                "views": item.video.views,
                "position": item.position,
                "added_at": item.added_at.isoformat()
            }
            for item in items
        ]
    }

# Analytics for tutors

@video_router.get("/my-videos/analytics")
def get_my_video_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get analytics for tutor's videos"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    from app import TutorProfile, VideoReel
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    videos = db.query(VideoReel).filter(VideoReel.tutor_id == tutor.id).all()
    
    analytics = []
    for video in videos:
        # Get unique viewers
        unique_viewers = db.query(VideoView.user_id).filter(
            VideoView.video_id == video.id,
            VideoView.user_id != None
        ).distinct().count()
        
        # Get average watch time
        avg_watch_time = db.query(func.avg(VideoView.view_duration)).filter(
            VideoView.video_id == video.id
        ).scalar() or 0
        
        # Get completion rate
        completion_rate = db.query(func.avg(VideoView.view_percentage)).filter(
            VideoView.video_id == video.id
        ).scalar() or 0
        
        # Calculate engagement rate
        total_engagements = video.likes + video.dislikes + video.shares + video.saves
        engagement_rate = (total_engagements / video.views * 100) if video.views > 0 else 0
        
        analytics.append(VideoAnalytics(
            video_id=video.id,
            total_views=video.views,
            unique_viewers=unique_viewers,
            average_watch_time=avg_watch_time,
            completion_rate=completion_rate,
            engagement_rate=engagement_rate,
            likes=video.likes,
            dislikes=video.dislikes,
            comments=db.query(VideoComment).filter(VideoComment.video_id == video.id).count(),
            shares=video.shares,
            saves=video.saves
        ))
    
    return {"analytics": analytics}