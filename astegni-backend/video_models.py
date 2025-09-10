# video_models.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app import Base



class VideoReel(Base):
    __tablename__ = "video_reels"
    
    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    video_number = Column(String)  # e.g., "#001"
    description = Column(Text)
    video_url = Column(String, nullable=False)
    thumbnail_url = Column(String)
    duration = Column(String)
    category = Column(String)
    subject = Column(String)
    grade_level = Column(String)
    views = Column(Integer, default=0)
    upload_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    meta_info = Column(JSON, default={})  # CHANGED FROM metadata TO meta_info
    

    
    # Relationships
    engagements = relationship("VideoEngagement", back_populates="video", cascade="all, delete-orphan")
    comments = relationship("VideoComment", back_populates="video", cascade="all, delete-orphan")
    playlist_items = relationship("PlaylistItem", back_populates="video", cascade="all, delete-orphan")

class VideoEngagement(Base):
    __tablename__ = "video_engagements"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("video_reels.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    engagement_type = Column(String, nullable=False)  # 'like', 'dislike', 'favorite', 'save', 'view'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate engagements
    __table_args__ = (
        UniqueConstraint('video_id', 'user_id', 'engagement_type', name='unique_user_video_engagement'),
    )
    
    # Relationships
    video = relationship("VideoReel", back_populates="engagements")

class VideoComment(Base):
    __tablename__ = "video_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("video_reels.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_comment_id = Column(Integer, ForeignKey("video_comments.id"), nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    video = relationship("VideoReel", back_populates="comments")
    replies = relationship("VideoComment", backref="parent", remote_side=[id])

class Playlist(Base):
    __tablename__ = "playlists"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    items = relationship("PlaylistItem", back_populates="playlist", cascade="all, delete-orphan")

class PlaylistItem(Base):
    __tablename__ = "playlist_items"
    
    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("video_reels.id"), nullable=False)
    position = Column(Integer, default=0)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('playlist_id', 'video_id', name='unique_playlist_video'),
    )
    
    # Relationships
    playlist = relationship("Playlist", back_populates="items")
    video = relationship("VideoReel", back_populates="playlist_items")

class TutorFollow(Base):
    __tablename__ = "tutor_follows"
    
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tutor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('follower_id', 'tutor_id', name='unique_follow'),
    )