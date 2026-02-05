"""
Enhanced Tutor Scoring System
Calculates comprehensive ranking scores for tutors based on multiple factors

New Scoring Factors:
- Interest/Hobby Matching: 0-150 points
- Total Students: 0-100 points
- Completion Rate: 0-80 points
- Response Time: 0-60 points
- Experience: 0-50 points (restored)
"""

from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Dict, Optional


class TutorScoringCalculator:
    """Calculate comprehensive tutor ranking scores"""

    def __init__(self, db: Session):
        self.db = db

    def calculate_interest_hobby_score(
        self,
        tutor_id: int,
        student_interests: List[str] = None,
        student_hobbies: List[str] = None
    ) -> tuple[int, dict]:
        """
        Calculate interest/hobby matching score (0-150 points)

        Scoring:
        - Perfect interest match: +100 points
        - Partial interest match: +50 points
        - Hobby match: +50 points
        - Multiple matches: bonus up to +50 points

        Returns: (score, details_dict)
        """
        if not student_interests and not student_hobbies:
            return 0, {"reason": "No student interests/hobbies"}

        score = 0
        details = {
            "interest_matches": [],
            "hobby_matches": [],
            "match_count": 0
        }

        # Check interest matches (via courses)
        if student_interests:
            interest_query = text("""
                SELECT DISTINCT c.course_name, c.tags, c.course_category
                FROM tutor_packages tp
                JOIN courses c ON c.id = ANY(tp.course_ids)
                WHERE tp.tutor_id = :tutor_id AND c.status = 'verified'
            """)
            tutor_courses = self.db.execute(interest_query, {"tutor_id": tutor_id}).fetchall()

            perfect_matches = 0
            partial_matches = 0

            for interest in student_interests:
                interest_lower = interest.lower()
                for course in tutor_courses:
                    course_name = (course.course_name or "").lower()
                    course_category = (course.course_category or "").lower()
                    tags_str = str(course.tags or "").lower()

                    # Perfect match: interest in course name
                    if interest_lower in course_name:
                        perfect_matches += 1
                        details["interest_matches"].append(f"Perfect: {interest} → {course.course_name}")
                        break
                    # Partial match: interest in category or tags
                    elif interest_lower in course_category or interest_lower in tags_str:
                        partial_matches += 1
                        details["interest_matches"].append(f"Partial: {interest} → {course.course_name}")
                        break

            # Score perfect and partial matches
            if perfect_matches > 0:
                score += 100  # At least one perfect match
                details["match_count"] += perfect_matches
            elif partial_matches > 0:
                score += 50  # Only partial matches
                details["match_count"] += partial_matches

        # Check hobby matches
        if student_hobbies:
            hobby_query = text("""
                SELECT hobbies FROM users u
                JOIN tutor_profiles tp ON tp.user_id = u.id
                WHERE tp.id = :tutor_id
            """)
            result = self.db.execute(hobby_query, {"tutor_id": tutor_id}).fetchone()
            tutor_hobbies = result.hobbies if result and result.hobbies else []

            hobby_match_count = 0
            for student_hobby in student_hobbies:
                for tutor_hobby in tutor_hobbies:
                    if student_hobby.lower() == tutor_hobby.lower():
                        hobby_match_count += 1
                        details["hobby_matches"].append(f"{student_hobby}")
                        break

            if hobby_match_count > 0:
                score += 50  # Hobby match bonus
                details["match_count"] += hobby_match_count

        # Multiple matches bonus (up to +50 points)
        if details["match_count"] >= 3:
            score += 50  # 3+ matches
        elif details["match_count"] == 2:
            score += 25  # 2 matches

        # Cap at 150 points
        score = min(score, 150)

        return score, details

    def calculate_total_students_score(self, tutor_id: int) -> tuple[int, dict]:
        """
        Calculate score based on total students taught (0-100 points)

        Scoring:
        - 100+ students: 100 points
        - 50-99 students: 75 points
        - 20-49 students: 50 points
        - 10-19 students: 30 points
        - 5-9 students: 15 points
        - 1-4 students: 5 points

        Returns: (score, details_dict)
        """
        # Count unique students from enrolled_students table
        query = text("""
            SELECT COUNT(DISTINCT student_id) as total_students
            FROM enrolled_students
            WHERE tutor_id = :tutor_id
        """)
        result = self.db.execute(query, {"tutor_id": tutor_id}).fetchone()
        total_students = result.total_students if result else 0

        # Calculate score based on thresholds
        if total_students >= 100:
            score = 100
        elif total_students >= 50:
            score = 75
        elif total_students >= 20:
            score = 50
        elif total_students >= 10:
            score = 30
        elif total_students >= 5:
            score = 15
        elif total_students >= 1:
            score = 5
        else:
            score = 0

        return score, {
            "total_students": total_students,
            "score_tier": f"{total_students} students → {score} points"
        }

    def calculate_completion_rate_score(self, tutor_id: int) -> tuple[int, dict]:
        """
        Calculate score based on session completion rate (0-80 points)

        Completion rate = (completed sessions / total sessions) * 100

        Scoring:
        - 95%+ completion: 80 points
        - 90-94%: 70 points
        - 85-89%: 60 points
        - 80-84%: 50 points
        - 75-79%: 40 points
        - 70-74%: 30 points
        - <70%: 10 points
        - No data: 0 points

        Returns: (score, details_dict)
        """
        # Get session completion data from enrolled_students
        # Assuming enrolled_students tracks active/completed enrollments
        query = text("""
            SELECT
                COUNT(*) as total_enrollments,
                COUNT(*) FILTER (WHERE enrolled_at IS NOT NULL) as active_enrollments
            FROM enrolled_students
            WHERE tutor_id = :tutor_id
        """)
        result = self.db.execute(query, {"tutor_id": tutor_id}).fetchone()

        if not result or result.total_enrollments == 0:
            return 0, {"reason": "No enrollment data", "completion_rate": 0}

        # Calculate completion rate (assume active enrollments are completed)
        completion_rate = (result.active_enrollments / result.total_enrollments) * 100

        # Score based on completion rate
        if completion_rate >= 95:
            score = 80
        elif completion_rate >= 90:
            score = 70
        elif completion_rate >= 85:
            score = 60
        elif completion_rate >= 80:
            score = 50
        elif completion_rate >= 75:
            score = 40
        elif completion_rate >= 70:
            score = 30
        else:
            score = 10

        return score, {
            "total_enrollments": result.total_enrollments,
            "active_enrollments": result.active_enrollments,
            "completion_rate": round(completion_rate, 1),
            "score_tier": f"{completion_rate:.1f}% → {score} points"
        }

    def calculate_response_time_score(self, tutor_profile_id: int, tutor_user_id: int) -> tuple[int, dict]:
        """
        Calculate score based on average response time (0-60 points)

        Measures how quickly tutor responds to first message in conversations
        and to session requests.

        Scoring:
        - <5 min avg response: 60 points (instant responder)
        - 5-15 min: 50 points (very fast)
        - 15-30 min: 40 points (fast)
        - 30-60 min: 30 points (good)
        - 1-2 hours: 20 points (moderate)
        - 2-6 hours: 10 points (slow)
        - >6 hours: 5 points (very slow)
        - No data: 0 points

        Returns: (score, details_dict)
        """
        # Calculate average response time from chat messages
        chat_query = text("""
            WITH conversation_first_messages AS (
                SELECT
                    cm1.conversation_id,
                    cm1.created_at as student_message_time,
                    (
                        SELECT MIN(cm2.created_at)
                        FROM chat_messages cm2
                        WHERE cm2.conversation_id = cm1.conversation_id
                        AND cm2.sender_user_id = :tutor_user_id
                        AND cm2.created_at > cm1.created_at
                    ) as tutor_response_time
                FROM chat_messages cm1
                WHERE cm1.sender_user_id != :tutor_user_id
                AND cm1.conversation_id IN (
                    SELECT conversation_id
                    FROM conversation_participants
                    WHERE profile_id = :tutor_profile_id
                    AND profile_type = 'tutor'
                )
            )
            SELECT
                COUNT(*) FILTER (WHERE tutor_response_time IS NOT NULL) as response_count,
                AVG(EXTRACT(EPOCH FROM (tutor_response_time - student_message_time)) / 60) as avg_response_minutes
            FROM conversation_first_messages
            WHERE tutor_response_time IS NOT NULL
        """)

        chat_result = self.db.execute(chat_query, {
            "tutor_profile_id": tutor_profile_id,
            "tutor_user_id": tutor_user_id
        }).fetchone()

        # Calculate response time from connection requests (requested_at to connected_at)
        connection_query = text("""
            SELECT
                COUNT(*) as request_count,
                AVG(EXTRACT(EPOCH FROM (connected_at - requested_at)) / 60) as avg_response_minutes
            FROM connections
            WHERE recipient_id = :tutor_user_id
            AND recipient_type = 'tutor'
            AND status = 'accepted'
            AND connected_at IS NOT NULL
        """)

        connection_result = self.db.execute(connection_query, {
            "tutor_user_id": tutor_user_id
        }).fetchone()

        # Combine chat and connection response times
        total_responses = 0
        total_response_time = 0

        if chat_result and chat_result.response_count:
            total_responses += chat_result.response_count
            total_response_time += chat_result.avg_response_minutes * chat_result.response_count

        if connection_result and connection_result.request_count:
            total_responses += connection_result.request_count
            total_response_time += connection_result.avg_response_minutes * connection_result.request_count

        if total_responses == 0:
            return 0, {"reason": "No response data", "avg_response_time": None}

        avg_response_minutes = total_response_time / total_responses

        # Score based on response time
        if avg_response_minutes < 5:
            score = 60  # Instant responder
        elif avg_response_minutes < 15:
            score = 50  # Very fast
        elif avg_response_minutes < 30:
            score = 40  # Fast
        elif avg_response_minutes < 60:
            score = 30  # Good
        elif avg_response_minutes < 120:
            score = 20  # Moderate
        elif avg_response_minutes < 360:
            score = 10  # Slow
        else:
            score = 5  # Very slow

        return score, {
            "total_responses": total_responses,
            "avg_response_minutes": round(avg_response_minutes, 1),
            "avg_response_hours": round(avg_response_minutes / 60, 1),
            "score_tier": f"{avg_response_minutes:.1f} min → {score} points"
        }

    def calculate_experience_score(self, tutor_user_id: int, tutor_profile_created_at: datetime) -> tuple[int, dict]:
        """
        Calculate score based on experience (0-50 points)

        Experience measured by:
        1. Account age (user.created_at)
        2. Credentials/certificates count

        Scoring:
        - Account age: 0-30 points (1 point per month, max 30 points at 2.5 years)
        - Credentials: 0-20 points (5 points per credential, max 20 points at 4+ credentials)

        Returns: (score, details_dict)
        """
        score = 0

        # Calculate account age in months
        if tutor_profile_created_at:
            account_age_days = (datetime.utcnow() - tutor_profile_created_at).days
            account_age_months = account_age_days / 30.0

            # 1 point per month, max 30 points (2.5 years)
            age_score = min(int(account_age_months), 30)
            score += age_score
        else:
            account_age_months = 0
            age_score = 0

        # Count credentials/achievements
        # Note: credentials table uses uploader_id (user-based system)
        credentials_query = text("""
            SELECT COUNT(*) as credential_count
            FROM credentials
            WHERE uploader_id = :tutor_user_id
        """)

        cred_result = self.db.execute(credentials_query, {"tutor_user_id": tutor_user_id}).fetchone()
        credential_count = cred_result.credential_count if cred_result else 0

        # 5 points per credential, max 20 points (4+ credentials)
        credential_score = min(credential_count * 5, 20)
        score += credential_score

        return score, {
            "account_age_months": round(account_age_months, 1),
            "account_age_score": age_score,
            "credential_count": credential_count,
            "credential_score": credential_score,
            "total_experience_score": score
        }

    def calculate_payment_reliability_penalty(self, tutor_user_id: int) -> tuple[int, dict]:
        """
        Calculate payment reliability penalty (0 to -100 points)

        Penalties based on payment history from user_investments table:
        - On-time payments: 0 penalty
        - Late payments: -5 points per late payment
        - Missed payments: -15 points per missed payment
        - Accumulated debt: -1 point per 100 ETB owed
        - Complete non-payment: -100 points (score = 0)

        Scoring:
        - Perfect payment history (100%): 0 penalty
        - 1-2 late payments: -5 to -10 penalty
        - 3-5 late payments: -15 to -25 penalty
        - 6+ late payments: -30 to -50 penalty
        - 1+ missed payments: -15 to -50 penalty
        - Total debt > 5000 ETB: -50 to -100 penalty
        - Subscription expired + debt: -100 penalty (complete removal)

        Returns: (penalty_score, details_dict)
        """
        penalty = 0
        details = {
            "late_payments": 0,
            "missed_payments": 0,
            "total_debt": 0.0,
            "payment_history_count": 0,
            "on_time_percentage": 100.0
        }

        try:
            # Get payment history for BOTH subscription AND booking payments
            # For bookings, get amount from enrolled_students.agreed_price
            query = text("""
                SELECT
                    COUNT(*) as total_payments,
                    COUNT(*) FILTER (WHERE ui.payment_status = 'paid') as paid_count,
                    COUNT(*) FILTER (WHERE ui.payment_status = 'late') as late_count,
                    COUNT(*) FILTER (WHERE ui.payment_status = 'missed') as missed_count,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN ui.investment_type = 'booking' THEN es.agreed_price
                                ELSE ui.amount
                            END
                        ) FILTER (WHERE ui.payment_status IN ('pending', 'late', 'missed')),
                        0
                    ) as total_debt,
                    COALESCE(SUM(ui.late_fee), 0) as total_late_fees,
                    MAX(ui.days_overdue) as max_days_overdue
                FROM user_investments ui
                LEFT JOIN enrolled_students es ON es.id = ui.student_payment_id
                WHERE ui.user_id = :user_id
                AND ui.investment_type IN ('subscription', 'booking')
                AND ui.due_date IS NOT NULL
            """)

            result = self.db.execute(query, {"user_id": tutor_user_id}).fetchone()

            if not result or result.total_payments == 0:
                return 0, {"reason": "No payment history", "penalty": 0}

            late_count = result.late_count or 0
            missed_count = result.missed_count or 0
            total_debt = float(result.total_debt or 0)
            max_days_overdue = result.max_days_overdue or 0
            paid_count = result.paid_count or 0
            total_payments = result.total_payments

            # Calculate on-time percentage
            on_time_percentage = (paid_count / total_payments * 100) if total_payments > 0 else 100.0

            details.update({
                "late_payments": late_count,
                "missed_payments": missed_count,
                "total_debt": total_debt,
                "payment_history_count": total_payments,
                "on_time_percentage": round(on_time_percentage, 1),
                "max_days_overdue": max_days_overdue
            })

            # Calculate penalties

            # 1. Late payment penalty (-5 points each)
            if late_count > 0:
                late_penalty = min(late_count * -5, -50)  # Max -50 for late payments
                penalty += late_penalty
                details["late_payment_penalty"] = late_penalty

            # 2. Missed payment penalty (-15 points each)
            if missed_count > 0:
                missed_penalty = min(missed_count * -15, -50)  # Max -50 for missed payments
                penalty += missed_penalty
                details["missed_payment_penalty"] = missed_penalty

            # 3. Accumulated debt penalty (-1 point per 100 ETB)
            if total_debt > 0:
                debt_penalty = min(int(total_debt / 100) * -1, -50)  # Max -50 for debt
                penalty += debt_penalty
                details["debt_penalty"] = debt_penalty

            # 4. Severe overdue penalty (payment > 60 days overdue)
            if max_days_overdue > 60:
                severe_penalty = -30
                penalty += severe_penalty
                details["severe_overdue_penalty"] = severe_penalty

            # 5. Complete non-payment check (total debt > 5000 ETB and missed > 2)
            if total_debt > 5000 and missed_count >= 2:
                # Complete removal from visibility
                penalty = -100
                details["complete_non_payment"] = True
                details["reason"] = f"Total debt {total_debt} ETB with {missed_count} missed payments"

            # Cap penalty at -100 (complete score removal)
            penalty = max(penalty, -100)

            details["total_penalty"] = penalty

            return penalty, details

        except Exception as e:
            print(f"⚠️ Error calculating payment reliability for user {tutor_user_id}: {e}")
            return 0, {"error": str(e), "penalty": 0}

    def calculate_all_new_scores(
        self,
        tutor_id: int,
        tutor_user_id: int,
        tutor_profile_created_at: datetime,
        student_interests: List[str] = None,
        student_hobbies: List[str] = None
    ) -> tuple[int, dict]:
        """
        Calculate all new scoring factors and return total score + breakdown

        Returns: (total_new_score, detailed_breakdown_dict)
        """
        total_score = 0
        breakdown = {}

        # 1. Interest/Hobby Matching (0-150 points)
        interest_score, interest_details = self.calculate_interest_hobby_score(
            tutor_id, student_interests, student_hobbies
        )
        total_score += interest_score
        breakdown["interest_hobby_matching"] = {
            "score": interest_score,
            "details": interest_details
        }

        # 2. Total Students (0-100 points)
        students_score, students_details = self.calculate_total_students_score(tutor_id)
        total_score += students_score
        breakdown["total_students"] = {
            "score": students_score,
            "details": students_details
        }

        # 3. Completion Rate (0-80 points)
        completion_score, completion_details = self.calculate_completion_rate_score(tutor_id)
        total_score += completion_score
        breakdown["completion_rate"] = {
            "score": completion_score,
            "details": completion_details
        }

        # 4. Response Time (0-60 points)
        response_score, response_details = self.calculate_response_time_score(
            tutor_id, tutor_user_id
        )
        total_score += response_score
        breakdown["response_time"] = {
            "score": response_score,
            "details": response_details
        }

        # 5. Experience (0-50 points)
        experience_score, experience_details = self.calculate_experience_score(
            tutor_user_id, tutor_profile_created_at
        )
        total_score += experience_score
        breakdown["experience"] = {
            "score": experience_score,
            "details": experience_details
        }

        # 6. Payment Reliability (0 to -100 points) - PENALTY for late/missed payments
        payment_penalty, payment_details = self.calculate_payment_reliability_penalty(tutor_user_id)
        total_score += payment_penalty  # This will be negative or zero
        breakdown["payment_reliability"] = {
            "score": payment_penalty,
            "details": payment_details
        }

        breakdown["total_new_score"] = total_score
        breakdown["max_possible_new_score"] = 440  # 150+100+80+60+50
        breakdown["payment_penalty_applied"] = payment_penalty

        return total_score, breakdown
