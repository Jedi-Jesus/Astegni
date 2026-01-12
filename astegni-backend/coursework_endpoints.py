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
    student_id: Optional[int] = None  # Optional for drafts
    title: str  # Required - coursework title
    course_name: Optional[str] = None  # Optional for drafts
    coursework_type: str  # 'Classwork', 'Homework', 'Assignment', 'Project', 'Quiz', 'Exam', 'Self-work'
    time_limit: int  # minutes
    days_to_complete: int
    questions: List[CourseworkQuestion]
    status: str = 'draft'  # 'draft' or 'posted'

class CourseworkUpdate(BaseModel):
    student_id: Optional[int] = None
    title: Optional[str] = None
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

class QuestionGrade(BaseModel):
    question_id: str
    points_awarded: float
    feedback: Optional[str] = None

class CourseworkGrade(BaseModel):
    coursework_id: str
    question_grades: List[QuestionGrade]
    overall_feedback: Optional[str] = None

# ========== HELPER FUNCTIONS ==========

def get_db_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

# ========== COURSEWORK ENDPOINTS ==========

@router.post("/api/coursework/create")
async def create_coursework(coursework_data: CourseworkCreate, current_user: User = Depends(get_current_user)):
    """
    Create a new coursework.

    Note: student_id from frontend is student_profiles.id - we store it directly.
    Links to enrolled_courses for proper session/enrollment tracking.
    """
    try:
        tutor_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Use student_profiles.id directly (not user_id)
        student_profile_id = coursework_data.student_id

        # Get tutor_profile_id from users.id
        cursor.execute("""
            SELECT id FROM tutor_profiles WHERE user_id = %s
        """, (tutor_id,))
        tutor_profile_row = cursor.fetchone()
        tutor_profile_id = tutor_profile_row['id'] if tutor_profile_row else None

        # Find enrolled_courses_id for this tutor-student pair
        enrolled_courses_id = None
        if tutor_profile_id and student_profile_id:
            cursor.execute("""
                SELECT id FROM enrolled_courses
                WHERE tutor_id = %s AND %s = ANY(students_id)
                LIMIT 1
            """, (tutor_profile_id, student_profile_id))
            enrolled_row = cursor.fetchone()
            enrolled_courses_id = enrolled_row['id'] if enrolled_row else None

        # Calculate due date
        # If days_to_complete is 0 or not set, student only has the time_limit (in minutes) to complete
        if coursework_data.days_to_complete and coursework_data.days_to_complete > 0:
            due_date = datetime.now() + timedelta(days=coursework_data.days_to_complete)
        else:
            # 0 days means immediate deadline - only the time_limit minutes are available
            due_date = datetime.now() + timedelta(minutes=coursework_data.time_limit)

        # Insert coursework with enrolled_courses_id link
        cursor.execute("""
            INSERT INTO courseworks (
                tutor_id, student_id, title, course_name, coursework_type,
                time_limit, days_to_complete, due_date, status,
                posted_at, enrolled_courses_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            tutor_id, student_profile_id, coursework_data.title, coursework_data.course_name,
            coursework_data.coursework_type, coursework_data.time_limit, coursework_data.days_to_complete,
            due_date, coursework_data.status,
            datetime.now() if coursework_data.status == 'posted' else None,
            enrolled_courses_id
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

        # Create submission record only if student_id is provided
        if student_profile_id:
            cursor.execute("""
                INSERT INTO coursework_submissions (coursework_id, student_id, status)
                VALUES (%s, %s, 'not_started')
            """, (coursework_id, student_profile_id))

        # Auto-create session when coursework is posted and has enrolled_courses_id
        session_id = None
        if coursework_data.status == 'posted' and enrolled_courses_id:
            # Create a session for this coursework
            # Session date is due_date, duration based on time_limit
            session_date = due_date.date()
            start_time = datetime.strptime('09:00', '%H:%M').time()  # Default start time
            end_time = (datetime.combine(session_date, start_time) + timedelta(minutes=coursework_data.time_limit)).time()

            cursor.execute("""
                INSERT INTO sessions (
                    enrolled_courses_id, session_date, start_time, end_time, duration,
                    topics, session_mode, priority_level,
                    status, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, 'online', 'medium', 'scheduled', NOW(), NOW())
                RETURNING id
            """, (
                enrolled_courses_id,
                session_date,
                start_time,
                end_time,
                coursework_data.time_limit,
                json.dumps([f"Coursework: {coursework_data.title}"])
            ))
            session_id = cursor.fetchone()['id']

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": f"Coursework {'posted' if coursework_data.status == 'posted' else 'saved'} successfully",
            "coursework_id": str(coursework_id),
            "session_id": session_id,
            "enrolled_courses_id": enrolled_courses_id
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
                c.id, c.student_id, c.title, c.course_name, c.coursework_type,
                c.time_limit, c.days_to_complete, c.due_date, c.status,
                c.created_at, c.posted_at, c.last_reminded_at,
                sp.username as student_name,
                COUNT(cq.id) as question_count,
                cs.status as submission_status,
                cs.scored_points, cs.total_points, cs.grade_percentage
            FROM courseworks c
            LEFT JOIN student_profiles sp ON c.student_id = sp.id
            LEFT JOIN coursework_questions cq ON c.id = cq.coursework_id
            LEFT JOIN coursework_submissions cs ON c.id = cs.coursework_id AND cs.student_id = c.student_id
            WHERE c.tutor_id = %s
            GROUP BY c.id, sp.username, cs.status, cs.scored_points, cs.total_points, cs.grade_percentage, c.last_reminded_at
            ORDER BY c.last_reminded_at DESC NULLS LAST, c.created_at DESC
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

@router.get("/api/coursework/student/{student_profile_id}/list")
async def get_student_courseworks_by_tutor(student_profile_id: int, current_user: User = Depends(get_current_user)):
    """
    Get all courseworks assigned to a specific student by the current tutor.

    Note: courseworks.student_id now references student_profiles.id directly,
    so we can query directly with student_profile_id.
    """
    try:
        tutor_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Query directly using student_profile_id (courseworks.student_id = student_profiles.id)
        cursor.execute("""
            SELECT
                c.id, c.student_id, c.title, c.course_name, c.coursework_type,
                c.time_limit, c.days_to_complete, c.due_date, c.status,
                c.created_at, c.posted_at,
                sp.username as student_name,
                COUNT(cq.id) as question_count,
                cs.status as submission_status,
                cs.scored_points, cs.total_points, cs.grade_percentage
            FROM courseworks c
            LEFT JOIN student_profiles sp ON c.student_id = sp.id
            LEFT JOIN coursework_questions cq ON c.id = cq.coursework_id
            LEFT JOIN coursework_submissions cs ON c.id = cs.coursework_id AND cs.student_id = c.student_id
            WHERE c.tutor_id = %s AND c.student_id = %s
            GROUP BY c.id, sp.username, cs.status, cs.scored_points, cs.total_points, cs.grade_percentage
            ORDER BY c.created_at DESC
        """, (tutor_id, student_profile_id))

        courseworks = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "courseworks": courseworks
        }

    except Exception as e:
        print(f"Error fetching student courseworks for tutor: {e}")
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
            LEFT JOIN users u ON c.student_id = u.id
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
    """
    Update an existing coursework.

    Note: student_id from frontend is student_profiles.id - we store it directly.
    """
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

        if coursework_data.student_id is not None:
            # Use student_profiles.id directly (not user_id)
            update_fields.append("student_id = %s")
            update_values.append(coursework_data.student_id)

        if coursework_data.title is not None:
            update_fields.append("title = %s")
            update_values.append(coursework_data.title)

        if coursework_data.course_name is not None:
            update_fields.append("course_name = %s")
            update_values.append(coursework_data.course_name)

        if coursework_data.coursework_type:
            update_fields.append("coursework_type = %s")
            update_values.append(coursework_data.coursework_type)

        if coursework_data.time_limit:
            update_fields.append("time_limit = %s")
            update_values.append(coursework_data.time_limit)

        if coursework_data.days_to_complete is not None:
            update_fields.append("days_to_complete = %s")
            update_values.append(coursework_data.days_to_complete)
            # Recalculate due date
            update_fields.append("due_date = %s")
            if coursework_data.days_to_complete > 0:
                update_values.append(datetime.now() + timedelta(days=coursework_data.days_to_complete))
            else:
                # 0 days means immediate deadline - only the time_limit minutes are available
                time_limit = coursework_data.time_limit or 20  # Default to 20 minutes if not provided
                update_values.append(datetime.now() + timedelta(minutes=time_limit))

        # Track if we're posting for the first time
        posting_now = False
        if coursework_data.status:
            update_fields.append("status = %s")
            update_values.append(coursework_data.status)
            if coursework_data.status == 'posted':
                update_fields.append("posted_at = %s")
                update_values.append(datetime.now())
                posting_now = True

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

        # Auto-create session when coursework is posted
        session_id = None
        if posting_now:
            # Get coursework details for session creation
            cursor.execute("""
                SELECT enrolled_courses_id, title, time_limit, due_date
                FROM courseworks WHERE id = %s
            """, (coursework_id,))
            cw = cursor.fetchone()

            if cw and cw['enrolled_courses_id']:
                session_date = cw['due_date'].date() if cw['due_date'] else datetime.now().date()
                start_time = datetime.strptime('09:00', '%H:%M').time()
                time_limit = cw['time_limit'] or 60
                end_time = (datetime.combine(session_date, start_time) + timedelta(minutes=time_limit)).time()

                cursor.execute("""
                    INSERT INTO sessions (
                        enrolled_courses_id, session_date, start_time, end_time, duration,
                        topics, session_mode, priority_level,
                        status, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, 'online', 'medium', 'scheduled', NOW(), NOW())
                    RETURNING id
                """, (
                    cw['enrolled_courses_id'],
                    session_date,
                    start_time,
                    end_time,
                    time_limit,
                    json.dumps([f"Coursework: {cw['title']}"])
                ))
                session_id = cursor.fetchone()['id']

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Coursework updated successfully",
            "session_id": session_id
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
    """
    Get all courseworks assigned to the current student.

    Note: courseworks.student_id references student_profiles.id,
    so we first get the student_profile_id from the user_id.
    """
    try:
        user_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Get student_profile_id from user_id
        cursor.execute("""
            SELECT id FROM student_profiles WHERE user_id = %s
        """, (user_id,))
        student_row = cursor.fetchone()

        if not student_row:
            cursor.close()
            conn.close()
            return {
                "success": True,
                "courseworks": [],
                "message": "No student profile found"
            }

        student_profile_id = student_row['id']

        # All coursework tables use student_profiles.id for student_id
        cursor.execute("""
            SELECT
                c.id, c.title, c.course_name, c.coursework_type, c.time_limit,
                c.due_date, c.status as coursework_status, c.enrolled_courses_id,
                COALESCE(u.first_name || ' ' || u.father_name, tp.username, 'Unknown Tutor') as tutor_name,
                COALESCE(tp.profile_picture, u.profile_picture) as tutor_picture,
                COUNT(cq.id) as question_count,
                cs.status as submission_status,
                cs.scored_points, cs.total_points, cs.grade_percentage
            FROM courseworks c
            JOIN users u ON c.tutor_id = u.id
            LEFT JOIN tutor_profiles tp ON u.id = tp.user_id
            LEFT JOIN coursework_questions cq ON c.id = cq.coursework_id
            LEFT JOIN coursework_submissions cs ON c.id = cs.coursework_id AND cs.student_id = %s
            WHERE c.student_id = %s AND c.status = 'posted'
            GROUP BY c.id, u.first_name, u.father_name, tp.username, tp.profile_picture, u.profile_picture, cs.status, cs.scored_points, cs.total_points, cs.grade_percentage
            ORDER BY c.due_date ASC
        """, (student_profile_id, student_profile_id))

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
    """Submit coursework answers

    Note: All coursework tables use student_profiles.id for student_id (profile-based, not user-based).
    This ensures coursework is role-specific since a user can have multiple roles.
    """
    try:
        user_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Get student_profile_id from user_id
        cursor.execute("""
            SELECT id FROM student_profiles WHERE user_id = %s
        """, (user_id,))
        student_row = cursor.fetchone()

        if not student_row:
            raise HTTPException(status_code=404, detail="Student profile not found")

        # Use student_profiles.id for all coursework tables
        student_id = student_row['id']

        # Create or update submission status
        cursor.execute("""
            INSERT INTO coursework_submissions (coursework_id, student_id, submitted_at, time_taken, status)
            VALUES (%s, %s, %s, %s, 'submitted')
            ON CONFLICT (coursework_id, student_id)
            DO UPDATE SET
                submitted_at = EXCLUDED.submitted_at,
                time_taken = EXCLUDED.time_taken,
                status = 'submitted'
        """, (submission.coursework_id, student_id, datetime.now(), submission.time_taken))

        # Save answers and auto-grade where possible
        total_points = 0
        scored_points = 0
        has_open_ended = False  # Track if any questions need manual grading

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
                q_type = question['question_type'] or ''
                q_points = question['points'] or 1  # Default to 1 point if not specified
                correct_answer = question['correct_answer'] or ''
                student_answer = answer.answer_text or ''

                # Auto-grade multiple choice and true/false (handle various naming conventions)
                # Multiple choice types
                mc_types = ['multipleChoice', 'multiple_choice', 'multiple-choice']
                # True/False types
                tf_types = ['trueFalse', 'true_false', 'true-false']
                # Open-ended types (require manual grading)
                open_types = ['openEnded', 'open_ended', 'open-ended', 'essay', 'short_answer']

                if q_type in mc_types:
                    # For multiple choice: compare letter answers (case-insensitive)
                    # Answers are typically 'A', 'B', 'C', 'D' or the full text
                    is_correct = student_answer.strip().upper() == correct_answer.strip().upper()
                    points_awarded = q_points if is_correct else 0
                elif q_type in tf_types:
                    # For true/false: normalize to lowercase 'true' or 'false'
                    normalized_student = student_answer.strip().lower()
                    normalized_correct = correct_answer.strip().lower()
                    # Handle various formats: 'true', 'True', 'TRUE', 't', 'T', '1', 'yes'
                    student_bool = normalized_student in ['true', 't', '1', 'yes']
                    correct_bool = normalized_correct in ['true', 't', '1', 'yes']
                    is_correct = student_bool == correct_bool
                    points_awarded = q_points if is_correct else 0
                elif q_type in open_types:
                    # Open-ended questions need manual grading
                    has_open_ended = True
                    is_correct = None
                    points_awarded = 0
                else:
                    # Unknown type - try exact match as fallback
                    is_correct = student_answer.strip().lower() == correct_answer.strip().lower()
                    points_awarded = q_points if is_correct else 0

                total_points += q_points
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

        # If all questions were auto-gradable (no open-ended), mark as 'graded'
        # Otherwise keep as 'submitted' for tutor to grade open-ended questions
        submission_status = 'submitted' if has_open_ended else 'graded'

        cursor.execute("""
            UPDATE coursework_submissions
            SET total_points = %s, scored_points = %s, grade_percentage = %s, status = %s
            WHERE coursework_id = %s AND student_id = %s
        """, (total_points, scored_points, grade_percentage, submission_status, submission.coursework_id, student_id))

        # Check if any rows were actually affected (this will work since we inserted above)
        if cursor.rowcount == 0:
            print(f"Warning: No submission found to update scores for coursework_id={submission.coursework_id}, student_id={student_id}")

        conn.commit()
        cursor.close()
        conn.close()

        # Determine appropriate message based on grading status
        if has_open_ended:
            message = "Coursework submitted successfully. Some questions require manual grading by your tutor."
        else:
            message = "Coursework submitted and auto-graded successfully!"

        return {
            "success": True,
            "message": message,
            "total_points": total_points,
            "scored_points": scored_points,
            "grade_percentage": round(grade_percentage, 2),
            "auto_graded": not has_open_ended,
            "status": submission_status
        }

    except Exception as e:
        print(f"Error submitting coursework: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/coursework/{coursework_id}/results")
async def get_coursework_results(coursework_id: str, current_user: User = Depends(get_current_user)):
    """
    Get coursework results for a student - includes questions, answers, and score.

    Returns:
    - coursework: Coursework details with tutor name
    - submission: Submission info (status, score, time taken)
    - questions: All questions in the coursework
    - answers: Student's answers with correctness info
    """
    try:
        user_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Get student_profile_id from user_id
        cursor.execute("""
            SELECT id FROM student_profiles WHERE user_id = %s
        """, (user_id,))
        student_row = cursor.fetchone()

        if not student_row:
            raise HTTPException(status_code=404, detail="Student profile not found")

        student_profile_id = student_row['id']

        # Get coursework with tutor info
        cursor.execute("""
            SELECT
                c.*,
                COALESCE(u.first_name || ' ' || u.father_name, tp.username, 'Unknown Tutor') as tutor_name,
                COALESCE(tp.profile_picture, u.profile_picture) as tutor_picture
            FROM courseworks c
            JOIN users u ON c.tutor_id = u.id
            LEFT JOIN tutor_profiles tp ON u.id = tp.user_id
            WHERE c.id = %s
        """, (coursework_id,))

        coursework = cursor.fetchone()

        if not coursework:
            raise HTTPException(status_code=404, detail="Coursework not found")

        # Verify this coursework is assigned to this student
        if coursework['student_id'] != student_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this coursework")

        # Get submission info
        cursor.execute("""
            SELECT * FROM coursework_submissions
            WHERE coursework_id = %s AND student_id = %s
        """, (coursework_id, student_profile_id))

        submission = cursor.fetchone()

        if not submission or submission['status'] not in ['submitted', 'graded', 'completed']:
            raise HTTPException(status_code=400, detail="Coursework has not been submitted yet")

        # Get questions
        cursor.execute("""
            SELECT * FROM coursework_questions
            WHERE coursework_id = %s
            ORDER BY question_number
        """, (coursework_id,))

        questions = cursor.fetchall()

        # Parse JSON fields in questions
        for question in questions:
            if question['choices']:
                question['choices'] = json.loads(question['choices']) if isinstance(question['choices'], str) else question['choices']

        # Get student's answers
        cursor.execute("""
            SELECT * FROM coursework_answers
            WHERE coursework_id = %s AND student_id = %s
        """, (coursework_id, student_profile_id))

        answers = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "coursework": coursework,
            "submission": submission,
            "questions": questions,
            "answers": answers
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching coursework results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/coursework/{coursework_id}/remind")
async def remind_tutor_to_grade(coursework_id: str, current_user: User = Depends(get_current_user)):
    """
    Student reminds tutor to grade their coursework.
    Updates last_reminded_at timestamp to bump it to the top of tutor's grading queue.
    """
    try:
        user_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Get student_profile_id from user_id
        cursor.execute("""
            SELECT id FROM student_profiles WHERE user_id = %s
        """, (user_id,))
        student_row = cursor.fetchone()

        if not student_row:
            raise HTTPException(status_code=404, detail="Student profile not found")

        student_profile_id = student_row['id']

        # Verify this coursework belongs to this student and is submitted (awaiting grade)
        cursor.execute("""
            SELECT c.id, c.tutor_id, cs.status
            FROM courseworks c
            JOIN coursework_submissions cs ON c.id = cs.coursework_id
            WHERE c.id = %s AND c.student_id = %s AND cs.student_id = %s
        """, (coursework_id, student_profile_id, student_profile_id))

        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Coursework not found")

        if result['status'] not in ['submitted']:
            raise HTTPException(status_code=400, detail="Coursework is not awaiting grade")

        # Update last_reminded_at timestamp
        cursor.execute("""
            UPDATE courseworks
            SET last_reminded_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING last_reminded_at
        """, (coursework_id,))

        updated = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Reminder sent! Your coursework has been bumped to the top.",
            "reminded_at": updated['last_reminded_at'].isoformat() if updated else None
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending reminder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/coursework/{coursework_id}/submission")
async def get_coursework_submission_for_grading(coursework_id: str, current_user: User = Depends(get_current_user)):
    """
    Get coursework submission details for tutor to grade.
    Returns the student's answers along with question details.
    """
    try:
        tutor_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify this coursework belongs to this tutor
        cursor.execute("""
            SELECT c.*, sp.username as student_name,
                   COALESCE(u.first_name || ' ' || u.father_name, sp.username, 'Unknown Student') as student_full_name
            FROM courseworks c
            LEFT JOIN student_profiles sp ON c.student_id = sp.id
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE c.id = %s AND c.tutor_id = %s
        """, (coursework_id, tutor_id))

        coursework = cursor.fetchone()

        if not coursework:
            raise HTTPException(status_code=404, detail="Coursework not found or not authorized")

        student_id = coursework['student_id']

        # Get submission info
        cursor.execute("""
            SELECT * FROM coursework_submissions
            WHERE coursework_id = %s AND student_id = %s
        """, (coursework_id, student_id))

        submission = cursor.fetchone()

        if not submission:
            raise HTTPException(status_code=400, detail="No submission found for this coursework")

        # Get questions
        cursor.execute("""
            SELECT * FROM coursework_questions
            WHERE coursework_id = %s
            ORDER BY question_number
        """, (coursework_id,))

        questions = cursor.fetchall()

        # Parse JSON fields in questions
        for question in questions:
            if question['choices']:
                question['choices'] = json.loads(question['choices']) if isinstance(question['choices'], str) else question['choices']

        # Get student's answers
        cursor.execute("""
            SELECT * FROM coursework_answers
            WHERE coursework_id = %s AND student_id = %s
        """, (coursework_id, student_id))

        answers = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "coursework": coursework,
            "submission": submission,
            "questions": questions,
            "answers": answers
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching coursework submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/coursework/{coursework_id}/student-results")
async def get_coursework_student_results(coursework_id: str, current_user: User = Depends(get_current_user)):
    """
    Get coursework results for a student to view their graded submission.
    Students can view their own answers and tutor feedback.
    """
    try:
        user_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Get the student profile for this user
        cursor.execute("""
            SELECT id FROM student_profiles WHERE user_id = %s
        """, (user_id,))

        student_profile = cursor.fetchone()
        if not student_profile:
            raise HTTPException(status_code=404, detail="Student profile not found")

        student_id = student_profile['id']

        # Verify this coursework was assigned to this student
        cursor.execute("""
            SELECT c.*, tp.username as tutor_username,
                   COALESCE(u.first_name || ' ' || u.father_name, tp.username, 'Unknown Tutor') as tutor_full_name
            FROM courseworks c
            LEFT JOIN tutor_profiles tp ON c.tutor_id = tp.id
            LEFT JOIN users u ON tp.user_id = u.id
            WHERE c.id = %s AND c.student_id = %s
        """, (coursework_id, student_id))

        coursework = cursor.fetchone()

        if not coursework:
            raise HTTPException(status_code=404, detail="Coursework not found or not assigned to you")

        # Get submission info
        cursor.execute("""
            SELECT * FROM coursework_submissions
            WHERE coursework_id = %s AND student_id = %s
        """, (coursework_id, student_id))

        submission = cursor.fetchone()

        if not submission:
            raise HTTPException(status_code=400, detail="No submission found for this coursework")

        # Get questions
        cursor.execute("""
            SELECT * FROM coursework_questions
            WHERE coursework_id = %s
            ORDER BY question_number
        """, (coursework_id,))

        questions = cursor.fetchall()

        # Parse JSON fields in questions
        for question in questions:
            if question['choices']:
                question['choices'] = json.loads(question['choices']) if isinstance(question['choices'], str) else question['choices']

        # Get student's answers with tutor feedback
        cursor.execute("""
            SELECT * FROM coursework_answers
            WHERE coursework_id = %s AND student_id = %s
        """, (coursework_id, student_id))

        answers = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "coursework": coursework,
            "submission": submission,
            "questions": questions,
            "answers": answers
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching student coursework results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/coursework/grade")
async def grade_coursework(grade_data: CourseworkGrade, current_user: User = Depends(get_current_user)):
    """
    Tutor grades a coursework submission.
    Updates individual question scores and overall submission status.
    """
    try:
        tutor_id = current_user.id

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify this coursework belongs to this tutor
        cursor.execute("""
            SELECT c.*, sp.user_id as student_user_id
            FROM courseworks c
            LEFT JOIN student_profiles sp ON c.student_id = sp.id
            WHERE c.id = %s AND c.tutor_id = %s
        """, (grade_data.coursework_id, tutor_id))

        coursework = cursor.fetchone()

        if not coursework:
            raise HTTPException(status_code=404, detail="Coursework not found or not authorized")

        student_id = coursework['student_id']

        # Verify submission exists and is in a gradable state
        cursor.execute("""
            SELECT * FROM coursework_submissions
            WHERE coursework_id = %s AND student_id = %s
        """, (grade_data.coursework_id, student_id))

        submission = cursor.fetchone()

        if not submission:
            raise HTTPException(status_code=400, detail="No submission found")

        if submission['status'] not in ['submitted', 'awaiting_grade', 'graded', 'completed']:
            raise HTTPException(status_code=400, detail="Submission is not in a gradable state")

        # Get total possible points from questions
        cursor.execute("""
            SELECT id, points FROM coursework_questions WHERE coursework_id = %s
        """, (grade_data.coursework_id,))

        questions = cursor.fetchall()
        question_points = {str(q['id']): q['points'] or 1 for q in questions}
        total_possible_points = sum(q['points'] or 1 for q in questions)

        # Update answer scores and feedback
        total_scored_points = 0

        for qg in grade_data.question_grades:
            question_id = qg.question_id
            points_awarded = min(qg.points_awarded, question_points.get(question_id, 1))  # Cap at max points
            total_scored_points += points_awarded

            cursor.execute("""
                UPDATE coursework_answers
                SET points_awarded = %s, tutor_feedback = %s
                WHERE coursework_id = %s AND question_id = %s AND student_id = %s
            """, (points_awarded, qg.feedback, grade_data.coursework_id, question_id, student_id))

        # Calculate grade percentage
        grade_percentage = (total_scored_points / total_possible_points * 100) if total_possible_points > 0 else 0

        # Update submission with final grade
        cursor.execute("""
            UPDATE coursework_submissions
            SET status = 'graded',
                scored_points = %s,
                total_points = %s,
                grade_percentage = %s,
                tutor_feedback = %s,
                graded_at = CURRENT_TIMESTAMP
            WHERE coursework_id = %s AND student_id = %s
        """, (total_scored_points, total_possible_points, grade_percentage,
              grade_data.overall_feedback, grade_data.coursework_id, student_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Coursework graded successfully",
            "scored_points": total_scored_points,
            "total_points": total_possible_points,
            "grade_percentage": round(grade_percentage, 2)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error grading coursework: {e}")
        raise HTTPException(status_code=500, detail=str(e))
