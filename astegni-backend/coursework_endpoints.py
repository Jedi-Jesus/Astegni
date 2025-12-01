"""
Coursework Management Endpoints
Handles coursework creation, retrieval, updates, and submissions
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv
from utils import get_current_user, get_db
from sqlalchemy.orm import Session
import json

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

router = APIRouter()

# Import User model
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))
from models import User

# ========== PYDANTIC MODELS ==========

class CourseworkQuestion(BaseModel):
    id: Optional[str] = None
    text: str  # HTML from Quill editor
    type: str  # 'multipleChoice', 'trueFalse', 'openEnded'
    choices: Optional[List[str]] = None
    correctAnswer: Optional[str] = None
    sampleAnswer: Optional[str] = None
    points: int = 1

class CourseworkCreate(BaseModel):
    student_id: int
    course_name: str
    coursework_type: str  # 'Class work', 'Home work', 'Practice test', 'Exam', 'Assignment', 'Project', 'Lab'
    time_limit: int  # minutes
    days_to_complete: int
    questions: List[CourseworkQuestion]
    status: str = 'draft'  # 'draft' or 'posted'

class CourseworkUpdate(BaseModel):
    course_name: Optional[str] = None
    coursework_type: Optional[str] = None
    time_limit: Optional[int] = None
    days_to_complete: Optional[int] = None
    questions: Optional[List[CourseworkQuestion]] = None
    status: Optional[str] = None

class CourseworkAnswer(BaseModel):
    question_id: str
    answer_text: str

class CourseworkSubmission(BaseModel):
    coursework_id: str
    answers: List[CourseworkAnswer]
    time_taken: int  # seconds

# ========== HELPER FUNCTIONS ==========

def get_db_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

# ========== COURSEWORK ENDPOINTS ==========

@router.post("/api/coursework/create")
async def create_coursework(coursework_data: CourseworkCreate, current_user: User = Depends(get_current_user)):
    """Create a new coursework"""
    try:
        tutor_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Calculate due date
        due_date = datetime.now() + timedelta(days=coursework_data.days_to_complete)

        # Insert coursework
        cursor.execute("""
            INSERT INTO courseworks (
                tutor_id, student_id, course_name, coursework_type,
                time_limit, days_to_complete, due_date, status,
                posted_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            tutor_id, coursework_data.student_id, coursework_data.course_name,
            coursework_data.coursework_type, coursework_data.time_limit, coursework_data.days_to_complete,
            due_date, coursework_data.status,
            datetime.now() if coursework_data.status == 'posted' else None
        ))

        coursework_id = cursor.fetchone()['id']

        # Insert questions
        for idx, question in enumerate(coursework_data.questions, 1):
            cursor.execute("""
                INSERT INTO coursework_questions (
                    coursework_id, question_number, question_text, question_type,
                    choices, correct_answer, sample_answer, points
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                coursework_id, idx, question.text, question.type,
                json.dumps(question.choices) if question.choices else None,
                question.correctAnswer, question.sampleAnswer, question.points
            ))

        # Create submission record
        cursor.execute("""
            INSERT INTO coursework_submissions (coursework_id, student_id, status)
            VALUES (%s, %s, 'not_started')
        """, (coursework_id, coursework_data.student_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": f"Coursework {'posted' if coursework_data.status == 'posted' else 'saved'} successfully",
            "coursework_id": str(coursework_id)
        }

    except Exception as e:
        print(f"Error creating coursework: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/coursework/tutor/list")
async def get_tutor_courseworks(current_user: User = Depends(get_current_user)):
    """Get all courseworks created by the tutor"""
    try:
        tutor_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                c.id, c.student_id, c.course_name, c.coursework_type,
                c.time_limit, c.days_to_complete, c.due_date, c.status,
                c.created_at, c.posted_at,
                sp.username as student_name,
                COUNT(cq.id) as question_count,
                cs.status as submission_status
            FROM courseworks c
            JOIN users u ON c.student_id = u.id
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            LEFT JOIN coursework_questions cq ON c.id = cq.coursework_id
            LEFT JOIN coursework_submissions cs ON c.id = cs.coursework_id
            WHERE c.tutor_id = %s
            GROUP BY c.id, sp.username, cs.status
            ORDER BY c.created_at DESC
        """, (tutor_id,))

        courseworks = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "courseworks": courseworks
        }

    except Exception as e:
        print(f"Error fetching tutor courseworks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/coursework/{coursework_id}")
async def get_coursework_details(coursework_id: str, current_user: User = Depends(get_current_user)):
    """Get coursework details with questions"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get coursework metadata
        cursor.execute("""
            SELECT
                c.*,
                sp.username as student_name,
                tp.username as tutor_name
            FROM courseworks c
            JOIN users u ON c.student_id = u.id
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            JOIN users tu ON c.tutor_id = tu.id
            LEFT JOIN tutor_profiles tp ON tu.id = tp.user_id
            WHERE c.id = %s
        """, (coursework_id,))

        coursework = cursor.fetchone()

        if not coursework:
            raise HTTPException(status_code=404, detail="Coursework not found")

        # Get questions
        cursor.execute("""
            SELECT * FROM coursework_questions
            WHERE coursework_id = %s
            ORDER BY question_number
        """, (coursework_id,))

        questions = cursor.fetchall()

        # Parse JSON fields
        for question in questions:
            if question['choices']:
                question['choices'] = json.loads(question['choices']) if isinstance(question['choices'], str) else question['choices']

        cursor.close()
        conn.close()

        return {
            "success": True,
            "coursework": coursework,
            "questions": questions
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching coursework details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/coursework/{coursework_id}")
async def update_coursework(coursework_id: str, coursework_data: CourseworkUpdate, current_user: User = Depends(get_current_user)):
    """Update an existing coursework"""
    try:
        tutor_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute("SELECT tutor_id FROM courseworks WHERE id = %s", (coursework_id,))
        coursework = cursor.fetchone()

        if not coursework:
            raise HTTPException(status_code=404, detail="Coursework not found")

        if coursework['tutor_id'] != tutor_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this coursework")

        # Build update query dynamically
        update_fields = []
        update_values = []

        if coursework_data.course_name:
            update_fields.append("course_name = %s")
            update_values.append(coursework_data.course_name)

        if coursework_data.coursework_type:
            update_fields.append("coursework_type = %s")
            update_values.append(coursework_data.coursework_type)

        if coursework_data.time_limit:
            update_fields.append("time_limit = %s")
            update_values.append(coursework_data.time_limit)

        if coursework_data.days_to_complete:
            update_fields.append("days_to_complete = %s")
            update_values.append(coursework_data.days_to_complete)
            # Recalculate due date
            update_fields.append("due_date = %s")
            update_values.append(datetime.now() + timedelta(days=coursework_data.days_to_complete))

        if coursework_data.status:
            update_fields.append("status = %s")
            update_values.append(coursework_data.status)
            if coursework_data.status == 'posted':
                update_fields.append("posted_at = %s")
                update_values.append(datetime.now())

        update_fields.append("updated_at = %s")
        update_values.append(datetime.now())

        if update_fields:
            update_values.append(coursework_id)
            query = f"UPDATE courseworks SET {', '.join(update_fields)} WHERE id = %s"
            cursor.execute(query, update_values)

        # Update questions if provided
        if coursework_data.questions:
            # Delete existing questions
            cursor.execute("DELETE FROM coursework_questions WHERE coursework_id = %s", (coursework_id,))

            # Insert new questions
            for idx, question in enumerate(coursework_data.questions, 1):
                cursor.execute("""
                    INSERT INTO coursework_questions (
                        coursework_id, question_number, question_text, question_type,
                        choices, correct_answer, sample_answer, points
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    coursework_id, idx, question.text, question.type,
                    json.dumps(question.choices) if question.choices else None,
                    question.correctAnswer, question.sampleAnswer, question.points
                ))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Coursework updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating coursework: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/coursework/{coursework_id}")
async def delete_coursework(coursework_id: str, current_user: User = Depends(get_current_user)):
    """Delete a coursework"""
    try:
        tutor_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute("SELECT tutor_id FROM courseworks WHERE id = %s", (coursework_id,))
        coursework = cursor.fetchone()

        if not coursework:
            raise HTTPException(status_code=404, detail="Coursework not found")

        if coursework['tutor_id'] != tutor_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this coursework")

        # Delete coursework (cascade will handle questions, answers, submissions)
        cursor.execute("DELETE FROM courseworks WHERE id = %s", (coursework_id,))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Coursework deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting coursework: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/coursework/student/list")
async def get_student_courseworks(current_user: User = Depends(get_current_user)):
    """Get all courseworks assigned to the student"""
    try:
        student_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                c.id, c.course_name, c.coursework_type, c.time_limit,
                c.due_date, c.status as coursework_status,
                tp.username as tutor_name,
                COUNT(cq.id) as question_count,
                cs.status as submission_status,
                cs.scored_points, cs.total_points, cs.grade_percentage
            FROM courseworks c
            JOIN users u ON c.tutor_id = u.id
            LEFT JOIN tutor_profiles tp ON u.id = tp.user_id
            LEFT JOIN coursework_questions cq ON c.id = cq.coursework_id
            LEFT JOIN coursework_submissions cs ON c.id = cs.coursework_id AND cs.student_id = %s
            WHERE c.student_id = %s AND c.status = 'posted'
            GROUP BY c.id, tp.username, cs.status, cs.scored_points, cs.total_points, cs.grade_percentage
            ORDER BY c.due_date ASC
        """, (student_id, student_id))

        courseworks = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "courseworks": courseworks
        }

    except Exception as e:
        print(f"Error fetching student courseworks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/coursework/submit")
async def submit_coursework(submission: CourseworkSubmission, current_user: User = Depends(get_current_user)):
    """Submit coursework answers"""
    try:
        student_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Update submission status
        cursor.execute("""
            UPDATE coursework_submissions
            SET submitted_at = %s, time_taken = %s, status = 'submitted'
            WHERE coursework_id = %s AND student_id = %s
        """, (datetime.now(), submission.time_taken, submission.coursework_id, student_id))

        # Save answers and auto-grade where possible
        total_points = 0
        scored_points = 0

        for answer in submission.answers:
            # Get question details
            cursor.execute("""
                SELECT question_type, correct_answer, points
                FROM coursework_questions
                WHERE id = %s
            """, (answer.question_id,))

            question = cursor.fetchone()

            if question:
                is_correct = None
                points_awarded = 0

                # Auto-grade multiple choice and true/false
                if question['question_type'] in ['multipleChoice', 'trueFalse']:
                    is_correct = answer.answer_text == question['correct_answer']
                    points_awarded = question['points'] if is_correct else 0

                total_points += question['points']
                scored_points += points_awarded

                # Save answer
                cursor.execute("""
                    INSERT INTO coursework_answers (
                        coursework_id, question_id, student_id, answer_text,
                        is_correct, points_awarded
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (coursework_id, question_id, student_id)
                    DO UPDATE SET
                        answer_text = EXCLUDED.answer_text,
                        is_correct = EXCLUDED.is_correct,
                        points_awarded = EXCLUDED.points_awarded,
                        answered_at = CURRENT_TIMESTAMP
                """, (
                    submission.coursework_id, answer.question_id, student_id,
                    answer.answer_text, is_correct, points_awarded
                ))

        # Update submission with scores
        grade_percentage = (scored_points / total_points * 100) if total_points > 0 else 0

        cursor.execute("""
            UPDATE coursework_submissions
            SET total_points = %s, scored_points = %s, grade_percentage = %s
            WHERE coursework_id = %s AND student_id = %s
        """, (total_points, scored_points, grade_percentage, submission.coursework_id, student_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Coursework submitted successfully",
            "total_points": total_points,
            "scored_points": scored_points,
            "grade_percentage": round(grade_percentage, 2)
        }

    except Exception as e:
        print(f"Error submitting coursework: {e}")
        raise HTTPException(status_code=500, detail=str(e))
