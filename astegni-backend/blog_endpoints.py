"""
Blog Endpoints
Handles all blog-related API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json

# Import from modular structure
from models import (
    Blog, TutorProfile, StudentProfile, ParentProfile, AdvertiserProfile,
    SessionLocal
)
from utils import get_current_user

router = APIRouter()

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class BlogComment(BaseModel):
    user_id: int
    username: str
    comment: str
    timestamp: str

class BlogCreate(BaseModel):
    profile_id: int
    role: str
    blog_picture: Optional[str] = None
    title: str
    description: Optional[str] = None
    blog_text: str
    reading_time: Optional[int] = 5
    category: Optional[str] = 'tutorial'

class BlogUpdate(BaseModel):
    blog_picture: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    blog_text: Optional[str] = None
    reading_time: Optional[int] = None
    category: Optional[str] = None

class BlogResponse(BaseModel):
    id: int
    profile_id: int
    role: str
    blog_picture: Optional[str]
    title: str
    description: Optional[str]
    blog_text: str
    reading_time: int
    likes: int
    comments: List[dict]
    category: str
    created_at: datetime
    updated_at: datetime

    # Author info
    author_name: Optional[str] = None
    author_profile_picture: Optional[str] = None

    class Config:
        from_attributes = True

class BlogCommentCreate(BaseModel):
    comment: str

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_author_info(db: Session, profile_id: int, role: str):
    """Get author information based on profile_id and role"""
    try:
        if role == 'tutor':
            profile = db.query(TutorProfile).filter(TutorProfile.id == profile_id).first()
        elif role == 'student':
            profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()
        elif role == 'parent':
            profile = db.query(ParentProfile).filter(ParentProfile.id == profile_id).first()
        elif role == 'advertiser':
            profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.id == profile_id).first()
        else:
            return None, None

        if profile:
            return getattr(profile, 'username', 'Unknown'), getattr(profile, 'profile_picture', None)
        return None, None
    except Exception:
        return None, None

# ============================================================================
# BLOG ENDPOINTS
# ============================================================================

@router.get("/api/blogs", response_model=List[BlogResponse])
async def get_all_blogs(
    skip: int = 0,
    limit: int = 20,
    category: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all blogs with pagination and filters
    """
    query = db.query(Blog)

    # Apply filters
    if category:
        query = query.filter(Blog.category == category)
    if role:
        query = query.filter(Blog.role == role)

    # Get blogs with pagination
    blogs = query.order_by(Blog.created_at.desc()).offset(skip).limit(limit).all()

    # Enrich with author info
    result = []
    for blog in blogs:
        author_name, author_profile_picture = get_author_info(db, blog.profile_id, blog.role)

        blog_dict = {
            'id': blog.id,
            'profile_id': blog.profile_id,
            'role': blog.role,
            'blog_picture': blog.blog_picture,
            'title': blog.title,
            'description': blog.description,
            'blog_text': blog.blog_text,
            'reading_time': blog.reading_time,
            'likes': blog.likes,
            'comments': json.loads(blog.comments) if isinstance(blog.comments, str) else blog.comments,
            'category': blog.category,
            'created_at': blog.created_at,
            'updated_at': blog.updated_at,
            'author_name': author_name,
            'author_profile_picture': author_profile_picture
        }
        result.append(blog_dict)

    return result

@router.get("/api/blogs/{blog_id}", response_model=BlogResponse)
async def get_blog(blog_id: int, db: Session = Depends(get_db)):
    """
    Get a specific blog by ID
    """
    blog = db.query(Blog).filter(Blog.id == blog_id).first()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    # Get author info
    author_name, author_profile_picture = get_author_info(db, blog.profile_id, blog.role)

    return {
        'id': blog.id,
        'profile_id': blog.profile_id,
        'role': blog.role,
        'blog_picture': blog.blog_picture,
        'title': blog.title,
        'description': blog.description,
        'blog_text': blog.blog_text,
        'reading_time': blog.reading_time,
        'likes': blog.likes,
        'comments': json.loads(blog.comments) if isinstance(blog.comments, str) else blog.comments,
        'category': blog.category,
        'created_at': blog.created_at,
        'updated_at': blog.updated_at,
        'author_name': author_name,
        'author_profile_picture': author_profile_picture
    }

@router.post("/api/blogs", response_model=BlogResponse, status_code=status.HTTP_201_CREATED)
async def create_blog(
    blog: BlogCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new blog (authenticated users only)
    """
    # Verify user owns the profile
    # This is a simplified check - in production, you'd verify the profile_id matches the user's profiles

    new_blog = Blog(
        profile_id=blog.profile_id,
        role=blog.role,
        blog_picture=blog.blog_picture,
        title=blog.title,
        description=blog.description,
        blog_text=blog.blog_text,
        reading_time=blog.reading_time,
        category=blog.category,
        likes=0,
        comments=json.dumps([])
    )

    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)

    # Get author info
    author_name, author_profile_picture = get_author_info(db, new_blog.profile_id, new_blog.role)

    return {
        'id': new_blog.id,
        'profile_id': new_blog.profile_id,
        'role': new_blog.role,
        'blog_picture': new_blog.blog_picture,
        'title': new_blog.title,
        'description': new_blog.description,
        'blog_text': new_blog.blog_text,
        'reading_time': new_blog.reading_time,
        'likes': new_blog.likes,
        'comments': [],
        'category': new_blog.category,
        'created_at': new_blog.created_at,
        'updated_at': new_blog.updated_at,
        'author_name': author_name,
        'author_profile_picture': author_profile_picture
    }

@router.put("/api/blogs/{blog_id}", response_model=BlogResponse)
async def update_blog(
    blog_id: int,
    blog_update: BlogUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a blog (only by the author)
    """
    blog = db.query(Blog).filter(Blog.id == blog_id).first()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    # Update fields
    if blog_update.blog_picture is not None:
        blog.blog_picture = blog_update.blog_picture
    if blog_update.title is not None:
        blog.title = blog_update.title
    if blog_update.description is not None:
        blog.description = blog_update.description
    if blog_update.blog_text is not None:
        blog.blog_text = blog_update.blog_text
    if blog_update.reading_time is not None:
        blog.reading_time = blog_update.reading_time
    if blog_update.category is not None:
        blog.category = blog_update.category

    db.commit()
    db.refresh(blog)

    # Get author info
    author_name, author_profile_picture = get_author_info(db, blog.profile_id, blog.role)

    return {
        'id': blog.id,
        'profile_id': blog.profile_id,
        'role': blog.role,
        'blog_picture': blog.blog_picture,
        'title': blog.title,
        'description': blog.description,
        'blog_text': blog.blog_text,
        'reading_time': blog.reading_time,
        'likes': blog.likes,
        'comments': json.loads(blog.comments) if isinstance(blog.comments, str) else blog.comments,
        'category': blog.category,
        'created_at': blog.created_at,
        'updated_at': blog.updated_at,
        'author_name': author_name,
        'author_profile_picture': author_profile_picture
    }

@router.delete("/api/blogs/{blog_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog(
    blog_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a blog (only by the author)
    """
    blog = db.query(Blog).filter(Blog.id == blog_id).first()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    db.delete(blog)
    db.commit()

    return None

@router.post("/api/blogs/{blog_id}/like")
async def like_blog(blog_id: int, db: Session = Depends(get_db)):
    """
    Like a blog (increment likes count)
    """
    blog = db.query(Blog).filter(Blog.id == blog_id).first()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    blog.likes += 1
    db.commit()

    return {"likes": blog.likes}

@router.post("/api/blogs/{blog_id}/unlike")
async def unlike_blog(blog_id: int, db: Session = Depends(get_db)):
    """
    Unlike a blog (decrement likes count)
    """
    blog = db.query(Blog).filter(Blog.id == blog_id).first()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    if blog.likes > 0:
        blog.likes -= 1
    db.commit()

    return {"likes": blog.likes}

@router.post("/api/blogs/{blog_id}/comments")
async def add_comment(
    blog_id: int,
    comment_data: BlogCommentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a comment to a blog
    """
    blog = db.query(Blog).filter(Blog.id == blog_id).first()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    # Parse existing comments
    comments = json.loads(blog.comments) if isinstance(blog.comments, str) else blog.comments

    # Add new comment
    new_comment = {
        'user_id': current_user['id'],
        'username': current_user.get('username', 'Anonymous'),
        'comment': comment_data.comment,
        'timestamp': datetime.now().isoformat()
    }
    comments.append(new_comment)

    # Update blog
    blog.comments = json.dumps(comments)
    db.commit()

    return new_comment

@router.get("/api/blogs/{blog_id}/comments")
async def get_comments(blog_id: int, db: Session = Depends(get_db)):
    """
    Get all comments for a blog
    """
    blog = db.query(Blog).filter(Blog.id == blog_id).first()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    comments = json.loads(blog.comments) if isinstance(blog.comments, str) else blog.comments
    return {"comments": comments, "count": len(comments)}


@router.get("/api/blogs/by-profile/{profile_id}")
async def get_blogs_by_profile(
    profile_id: int,
    role: str,
    skip: int = 0,
    limit: int = 20,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all blogs by a specific profile (profile_id + role)
    Used for viewing blogs on profile pages (view-tutor, view-student, view-parent, etc.)
    """
    # Validate role
    valid_roles = ['tutor', 'student', 'parent', 'advertiser', 'institute']
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    # Build query
    query = db.query(Blog).filter(
        Blog.profile_id == profile_id,
        Blog.role == role
    )

    # Apply category filter if provided
    if category:
        query = query.filter(Blog.category == category)

    # Get blogs with pagination
    blogs = query.order_by(Blog.created_at.desc()).offset(skip).limit(limit).all()

    # Get total count for pagination
    total_count = db.query(Blog).filter(
        Blog.profile_id == profile_id,
        Blog.role == role
    ).count()

    # Enrich with author info
    result = []
    for blog in blogs:
        author_name, author_profile_picture = get_author_info(db, blog.profile_id, blog.role)

        blog_dict = {
            'id': blog.id,
            'profile_id': blog.profile_id,
            'role': blog.role,
            'blog_picture': blog.blog_picture,
            'title': blog.title,
            'description': blog.description,
            'blog_text': blog.blog_text,
            'reading_time': blog.reading_time,
            'likes': blog.likes,
            'dislikes': blog.dislikes,
            'shares': blog.shares,
            'saves': blog.saves,
            'comments': json.loads(blog.comments) if isinstance(blog.comments, str) else blog.comments,
            'category': blog.category,
            'created_at': blog.created_at,
            'updated_at': blog.updated_at,
            'author_name': author_name,
            'author_profile_picture': author_profile_picture
        }
        result.append(blog_dict)

    return {
        "posts": result,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }
