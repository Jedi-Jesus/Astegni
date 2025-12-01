"""
Quiz Management Endpoints
Handles quiz creation, retrieval, updates, and submissions
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

class QuizQuestion(BaseModel):
    id: Optional[str] = None
    text: str  # HTML from Quill editor
    type: str  # 'multipleChoice', 'trueFalse', 'openEnded'
    choices: Optional[List[str]] = None
    correctAnswer: Optional[str] = None
    sampleAnswer: Optional[str] = None
    points: int = 1

class QuizCreate(BaseModel):
    student_id: int
    course_name: str
    quiz_type: str  # 'Class work', 'Home work', 'Practice test', 'Exam'
    time_limit: int  # minutes
    days_to_complete: int
    questions: List[QuizQuestion]
    status: str = 'draft'  # 'draft' or 'posted'

class QuizUpdate(BaseModel):
    course_name: Optional[str] = None
    quiz_type: Optional[str] = None
    time_limit: Optional[int] = None
    days_to_complete: Optional[int] = None
    questions: Optional[List[QuizQuestion]] = None
    status: Optional[str] = None

class QuizAnswer(BaseModel):
    question_id: str
    answer_text: str

class QuizSubmission(BaseModel):
    quiz_id: str
    answers: List[QuizAnswer]
    time_taken: int  # seconds

# ========== HELPER FUNCTIONS ==========

def get_db_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

# ========== QUIZ ENDPOINTS ==========

@router.post("/api/quiz/create")
async def create_quiz(quiz_data: QuizCreate, current_user: User = Depends(get_current_user)):
    """Create a new quiz"""
    try:
        tutor_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Calculate due date
        due_date = datetime.now() + timedelta(days=quiz_data.days_to_complete)

        # Insert quiz
        cursor.execute("""
            INSERT INTO quizzes (
                tutor_id, student_id, course_name, quiz_type,
                time_limit, days_to_complete, due_date, status,
                posted_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            tutor_id, quiz_data.student_id, quiz_data.course_name,
            quiz_data.quiz_type, quiz_data.time_limit, quiz_data.days_to_complete,
            due_date, quiz_data.status,
            datetime.now() if quiz_data.status == 'posted' else None
        ))

        quiz_id = cursor.fetchone()['id']

        # Insert questions
        for idx, question in enumerate(quiz_data.questions, 1):
            cursor.execute("""
                INSERT INTO quiz_questions (
                    quiz_id, question_number, question_text, question_type,
                    choices, correct_answer, sample_answer, points
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                quiz_id, idx, question.text, question.type,
                json.dumps(question.choices) if question.choices else None,
                question.correctAnswer, question.sampleAnswer, question.points
            ))

        # Create submission record
        cursor.execute("""
            INSERT INTO quiz_submissions (quiz_id, student_id, status)
            VALUES (%s, %s, 'not_started')
        """, (quiz_id, quiz_data.student_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": f"Quiz {'posted' if quiz_data.status == 'posted' else 'saved'} successfully",
            "quiz_id": str(quiz_id)
        }

    except Exception as e:
        print(f"Error creating quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/quiz/tutor/list")
async def get_tutor_quizzes(current_user: User = Depends(get_current_user)):
    """Get all quizzes created by the tutor"""
    try:
        tutor_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                q.id, q.student_id, q.course_name, q.quiz_type,
                q.time_limit, q.days_to_complete, q.due_date, q.status,
                q.created_at, q.posted_at,
                sp.username as student_name,
                COUNT(qq.id) as question_count,
                qs.status as submission_status
            FROM quizzes q
            JOIN users u ON q.student_id = u.id
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
            LEFT JOIN quiz_submissions qs ON q.id = qs.quiz_id
            WHERE q.tutor_id = %s
            GROUP BY q.id, sp.username, qs.status
            ORDER BY q.created_at DESC
        """, (tutor_id,))

        quizzes = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "quizzes": quizzes
        }

    except Exception as e:
        print(f"Error fetching tutor quizzes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/quiz/{quiz_id}")
async def get_quiz_details(quiz_id: str, current_user: User = Depends(get_current_user)):
    """Get quiz details with questions"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get quiz metadata
        cursor.execute("""
            SELECT
                q.*,
                sp.username as student_name,
                tp.username as tutor_name
            FROM quizzes q
            JOIN users u ON q.student_id = u.id
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            JOIN users tu ON q.tutor_id = tu.id
            LEFT JOIN tutor_profiles tp ON tu.id = tp.user_id
            WHERE q.id = %s
        """, (quiz_id,))

        quiz = cursor.fetchone()

        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        # Get questions
        cursor.execute("""
            SELECT * FROM quiz_questions
            WHERE quiz_id = %s
            ORDER BY question_number
        """, (quiz_id,))

        questions = cursor.fetchall()

        # Parse JSON fields
        for question in questions:
            if question['choices']:
                question['choices'] = json.loads(question['choices']) if isinstance(question['choices'], str) else question['choices']

        cursor.close()
        conn.close()

        return {
            "success": True,
            "quiz": quiz,
            "questions": questions
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching quiz details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/quiz/{quiz_id}")
async def update_quiz(quiz_id: str, quiz_data: QuizUpdate, current_user: User = Depends(get_current_user)):
    """Update an existing quiz"""
    try:
        tutor_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute("SELECT tutor_id FROM quizzes WHERE id = %s", (quiz_id,))
        quiz = cursor.fetchone()

        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        if quiz['tutor_id'] != tutor_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this quiz")

        # Build update query dynamically
        update_fields = []
        update_values = []

        if quiz_data.course_name:
            update_fields.append("course_name = %s")
            update_values.append(quiz_data.course_name)

        if quiz_data.quiz_type:
            update_fields.append("quiz_type = %s")
            update_values.append(quiz_data.quiz_type)

        if quiz_data.time_limit:
            update_fields.append("time_limit = %s")
            update_values.append(quiz_data.time_limit)

        if quiz_data.days_to_complete:
            update_fields.append("days_to_complete = %s")
            update_values.append(quiz_data.days_to_complete)
            # Recalculate due date
            update_fields.append("due_date = %s")
            update_values.append(datetime.now() + timedelta(days=quiz_data.days_to_complete))

        if quiz_data.status:
            update_fields.append("status = %s")
            update_values.append(quiz_data.status)
            if quiz_data.status == 'posted':
                update_fields.append("posted_at = %s")
                update_values.append(datetime.now())

        update_fields.append("updated_at = %s")
        update_values.append(datetime.now())

        if update_fields:
            update_values.append(quiz_id)
            query = f"UPDATE quizzes SET {', '.join(update_fields)} WHERE id = %s"
            cursor.execute(query, update_values)

        # Update questions if provided
        if quiz_data.questions:
            # Delete existing questions
            cursor.execute("DELETE FROM quiz_questions WHERE quiz_id = %s", (quiz_id,))

            # Insert new questions
            for idx, question in enumerate(quiz_data.questions, 1):
                cursor.execute("""
                    INSERT INTO quiz_questions (
                        quiz_id, question_number, question_text, question_type,
                        choices, correct_answer, sample_answer, points
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    quiz_id, idx, question.text, question.type,
                    json.dumps(question.choices) if question.choices else None,
                    question.correctAnswer, question.sampleAnswer, question.points
                ))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Quiz updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/quiz/{quiz_id}")
async def delete_quiz(quiz_id: str, current_user: User = Depends(get_current_user)):
    """Delete a quiz"""
    try:
        tutor_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute("SELECT tutor_id FROM quizzes WHERE id = %s", (quiz_id,))
        quiz = cursor.fetchone()

        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        if quiz['tutor_id'] != tutor_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this quiz")

        # Delete quiz (cascade will handle questions, answers, submissions)
        cursor.execute("DELETE FROM quizzes WHERE id = %s", (quiz_id,))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Quiz deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/quiz/student/list")
async def get_student_quizzes(current_user: User = Depends(get_current_user)):
    """Get all quizzes assigned to the student"""
    try:
        student_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                q.id, q.course_name, q.quiz_type, q.time_limit,
                q.due_date, q.status as quiz_status,
                tp.username as tutor_name,
                COUNT(qq.id) as question_count,
                qs.status as submission_status,
                qs.scored_points, qs.total_points, qs.grade_percentage
            FROM quizzes q
            JOIN users u ON q.tutor_id = u.id
            LEFT JOIN tutor_profiles tp ON u.id = tp.user_id
            LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
            LEFT JOIN quiz_submissions qs ON q.id = qs.quiz_id AND qs.student_id = %s
            WHERE q.student_id = %s AND q.status = 'posted'
            GROUP BY q.id, tp.username, qs.status, qs.scored_points, qs.total_points, qs.grade_percentage
            ORDER BY q.due_date ASC
        """, (student_id, student_id))

        quizzes = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "quizzes": quizzes
        }

    except Exception as e:
        print(f"Error fetching student quizzes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/quiz/submit")
async def submit_quiz(submission: QuizSubmission, current_user: User = Depends(get_current_user)):
    """Submit quiz answers"""
    try:
        student_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Update submission status
        cursor.execute("""
            UPDATE quiz_submissions
            SET submitted_at = %s, time_taken = %s, status = 'submitted'
            WHERE quiz_id = %s AND student_id = %s
        """, (datetime.now(), submission.time_taken, submission.quiz_id, student_id))

        # Save answers and auto-grade where possible
        total_points = 0
        scored_points = 0

        for answer in submission.answers:
            # Get question details
            cursor.execute("""
                SELECT question_type, correct_answer, points
                FROM quiz_questions
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
                    INSERT INTO quiz_answers (
                        quiz_id, question_id, student_id, answer_text,
                        is_correct, points_awarded
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (quiz_id, question_id, student_id)
                    DO UPDATE SET
                        answer_text = EXCLUDED.answer_text,
                        is_correct = EXCLUDED.is_correct,
                        points_awarded = EXCLUDED.points_awarded,
                        answered_at = CURRENT_TIMESTAMP
                """, (
                    submission.quiz_id, answer.question_id, student_id,
                    answer.answer_text, is_correct, points_awarded
                ))

        # Update submission with scores
        grade_percentage = (scored_points / total_points * 100) if total_points > 0 else 0

        cursor.execute("""
            UPDATE quiz_submissions
            SET total_points = %s, scored_points = %s, grade_percentage = %s
            WHERE quiz_id = %s AND student_id = %s
        """, (total_points, scored_points, grade_percentage, submission.quiz_id, student_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Quiz submitted successfully",
            "total_points": total_points,
            "scored_points": scored_points,
            "grade_percentage": round(grade_percentage, 2)
        }

    except Exception as e:
        print(f"Error submitting quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))
