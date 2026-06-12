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
        Calculate interest/hobby matching score (0-120 points)

        Scoring:
        - Perfect interest match: +100 points
        - Partial interest match: +50 points
        - Hobby match: +50 points
        - Multiple matches: bonus up to +50 points
        (raw total capped at 120)

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
                WHERE tp.tutor_id = :tutor_id AND c.status = 'verified' AND tp.visibility = 'public'
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

        # Cap at 120 points
        score = min(score, 120)

        return score, details

    def calculate_total_students_score(self, tutor_id: int) -> tuple[int, dict]:
        """
        Calculate score based on total students taught (0-200 points)

        Tiers are set so having more students always wins within reason: even a
        5-student tutor outranks a 1-student tutor, regardless of completion
        rate, because real teaching volume is a stronger signal than one
        "perfect" session.

        Scoring:
        - 100+ students: 200 points
        - 50-99 students: 150 points
        - 20-49 students: 100 points
        - 10-19 students: 60 points
        - 5-9 students: 45 points
        - 1-4 students: 8 points

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
            score = 200
        elif total_students >= 50:
            score = 150
        elif total_students >= 20:
            score = 100
        elif total_students >= 10:
            score = 60
        elif total_students >= 5:
            score = 45
        elif total_students >= 1:
            score = 8
        else:
            score = 0

        return score, {
            "total_students": total_students,
            "score_tier": f"{total_students} students → {score} points"
        }

    def calculate_completion_rate_score(self, tutor_id: int) -> tuple[int, dict]:
        """
        Calculate score based on session completion rate (0-150 points)

        Completion rate = (completed sessions / total sessions) * 100

        Two guards so a tiny, "perfect" sample can't out-rank a proven tutor:
        - Completion only counts from 70% up; below 70% earns 0.
        - The tier score is confidence-weighted by sample size
          (factor = n / (n + 4)), so 100% from 1 enrollment is heavily
          discounted vs 100% from 20. A lone perfect session is worth little.

        Tier scoring (before the confidence weight):
        - 95%+ completion: 150 points
        - 90-94%: 131 points
        - 85-89%: 113 points
        - 80-84%: 94 points
        - 75-79%: 75 points
        - 70-74%: 56 points
        - <70%: 0 points
        - No data: 0 points

        Returns: (score, details_dict)
        """
        CONFIDENCE_K = 4  # enrollments needed before completion is ~half-trusted
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

        # Score based on completion rate (only counts from 70% up)
        if completion_rate >= 95:
            tier_score = 150
        elif completion_rate >= 90:
            tier_score = 131
        elif completion_rate >= 85:
            tier_score = 113
        elif completion_rate >= 80:
            tier_score = 94
        elif completion_rate >= 75:
            tier_score = 75
        elif completion_rate >= 70:
            tier_score = 56
        else:
            tier_score = 0  # below 70% earns nothing

        # Confidence weight by sample size: a perfect rate from 1 enrollment is
        # untrustworthy, so scale toward 0 for small samples.
        confidence = result.total_enrollments / (result.total_enrollments + CONFIDENCE_K)
        score = int(round(tier_score * confidence))

        return score, {
            "total_enrollments": result.total_enrollments,
            "active_enrollments": result.active_enrollments,
            "completion_rate": round(completion_rate, 1),
            "tier_score": tier_score,
            "confidence": round(confidence, 2),
            "score_tier": f"{completion_rate:.1f}% × conf {confidence:.2f} → {score} points"
        }

    # A pending session request older than this (hours) with no response counts
    # as "ignored" and drives the response score negative.
    IGNORE_AFTER_HOURS = 48

    def calculate_response_time_score(self, tutor_profile_id: int, tutor_user_id: int) -> tuple[int, dict]:
        """
        Calculate score based on how the tutor handles PACKAGE/SESSION REQUESTS
        (requested_sessions), NOT chat messages (-60 to +60 points).

        For answered requests, speed of the response (responded_at - created_at)
        earns a positive tier. For requests the tutor never answered (still
        'pending', no responded_at, older than IGNORE_AFTER_HOURS), an ignore
        penalty is applied. A tutor who ignores students is pushed below zero.

        Speed tier (answered requests):
        - <5 min: 60   - 5-15 min: 50   - 15-30 min: 40   - 30-60 min: 30
        - 1-2 h: 20    - 2-6 h: 10      - >6 h: 5

        Final score = tier * (1 - ignore_rate) - 60 * ignore_rate
          where ignore_rate = ignored / (answered + ignored)
        - 0% ignored  -> the speed tier (up to +60)
        - 100% ignored -> -60
        - No requests at all -> 0 (new tutors are not penalized)

        Returns: (score, details_dict)
        """
        query = text("""
            SELECT
                COUNT(*) FILTER (
                    WHERE responded_at IS NOT NULL
                ) AS answered,
                COUNT(*) FILTER (
                    WHERE responded_at IS NULL
                    AND status = 'pending'
                    AND created_at < (NOW() - (:ignore_hours || ' hours')::interval)
                ) AS ignored,
                AVG(
                    EXTRACT(EPOCH FROM (responded_at - created_at)) / 60
                ) FILTER (WHERE responded_at IS NOT NULL) AS avg_response_minutes
            FROM requested_sessions
            WHERE tutor_id = :tutor_id
        """)
        result = self.db.execute(query, {
            "tutor_id": tutor_profile_id,
            "ignore_hours": self.IGNORE_AFTER_HOURS
        }).fetchone()

        answered = (result.answered if result else 0) or 0
        ignored = (result.ignored if result else 0) or 0
        total = answered + ignored

        if total == 0:
            return 0, {"reason": "No session requests", "avg_response_time": None}

        # Speed tier from answered requests
        avg_response_minutes = result.avg_response_minutes
        if answered > 0 and avg_response_minutes is not None:
            m = avg_response_minutes
            if m < 5:
                tier = 60
            elif m < 15:
                tier = 50
            elif m < 30:
                tier = 40
            elif m < 60:
                tier = 30
            elif m < 120:
                tier = 20
            elif m < 360:
                tier = 10
            else:
                tier = 5
        else:
            tier = 0

        # Blend speed with ignore penalty (-60 floor when everything is ignored)
        ignore_rate = ignored / total
        score = int(round(tier * (1 - ignore_rate) - 60 * ignore_rate))

        return score, {
            "answered_requests": answered,
            "ignored_requests": ignored,
            "ignore_rate": round(ignore_rate, 2),
            "avg_response_minutes": round(avg_response_minutes, 1) if avg_response_minutes is not None else None,
            "speed_tier": tier,
            "score_tier": f"tier {tier} × resp {1-ignore_rate:.2f} − ignore → {score} points"
        }

    def calculate_experience_score(self, tutor_user_id: int, tutor_profile_created_at: datetime) -> tuple[int, dict]:
        """
        Calculate score based on experience (0-300 points)

        Experience is the second-heaviest smart-ranking factor (after rating),
        ahead of completion rate.

        Experience measured by:
        1. Account age (user.created_at)
        2. Credentials/certificates count

        Scoring:
        - Account age: 0-180 points (6 points per month, max 180 points at 2.5 years)
        - Credentials: 0-120 points (30 points per credential, max 120 points at 4+ credentials)

        Returns: (score, details_dict)
        """
        score = 0

        # Calculate account age in months
        if tutor_profile_created_at:
            account_age_days = (datetime.utcnow() - tutor_profile_created_at).days
            account_age_months = account_age_days / 30.0

            # 6 points per month, max 180 points (2.5 years)
            age_score = min(int(account_age_months) * 6, 180)
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

        # 30 points per credential, max 120 points (4+ credentials)
        credential_score = min(credential_count * 30, 120)
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
        Calculate payment reliability penalty (0 to -300 points)

        This is the heaviest negative factor: a chronically non-paying tutor can
        lose more than the entire rating ceiling (500), forcing them down the list.

        Penalties based on payment history from user_investments table:
        - On-time payments: 0 penalty
        - Late payments: -15 points per late payment (cap -150)
        - Missed payments: -45 points per missed payment (cap -150)
        - Accumulated debt: -3 points per 100 ETB owed (cap -150)
        - Severe overdue (>60 days): -90 points
        - Complete non-payment: -300 points

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

            # 1. Late payment penalty (-15 points each)
            if late_count > 0:
                late_penalty = max(late_count * -15, -150)  # Max -150 for late payments
                penalty += late_penalty
                details["late_payment_penalty"] = late_penalty

            # 2. Missed payment penalty (-45 points each)
            if missed_count > 0:
                missed_penalty = max(missed_count * -45, -150)  # Max -150 for missed payments
                penalty += missed_penalty
                details["missed_payment_penalty"] = missed_penalty

            # 3. Accumulated debt penalty (-3 points per 100 ETB)
            if total_debt > 0:
                debt_penalty = max(int(total_debt / 100) * -3, -150)  # Max -150 for debt
                penalty += debt_penalty
                details["debt_penalty"] = debt_penalty

            # 4. Severe overdue penalty (payment > 60 days overdue)
            if max_days_overdue > 60:
                severe_penalty = -90
                penalty += severe_penalty
                details["severe_overdue_penalty"] = severe_penalty

            # 5. Complete non-payment check (total debt > 5000 ETB and missed > 2)
            if total_debt > 5000 and missed_count >= 2:
                # Complete removal from visibility
                penalty = -300
                details["complete_non_payment"] = True
                details["reason"] = f"Total debt {total_debt} ETB with {missed_count} missed payments"

            # Cap penalty at -300 (complete score removal)
            penalty = max(penalty, -300)

            details["total_penalty"] = penalty

            return penalty, details

        except Exception as e:
            print(f"⚠️ Error calculating payment reliability for user {tutor_user_id}: {e}")
            return 0, {"error": str(e), "penalty": 0}

    # New tutors (no reviews) are treated as this rating, and few-review tutors
    # are pulled toward it (Bayesian prior), so a single 5★ review can't top the list.
    RATING_PRIOR_VALUE = 2.0   # default ("2 stars") for tutors with no/few reviews
    RATING_PRIOR_WEIGHT = 10   # number of "virtual" prior reviews (confidence weight)
    RATING_MAX_POINTS = 500    # rating is the PRIMARY ranking factor (replaces subscription)

    def calculate_rating_score(self, tutor_id: int) -> tuple[int, dict]:
        """
        Calculate score based on tutor rating (0-500 points) - PRIMARY FACTOR.

        Uses a confidence-weighted (Bayesian) average so tutors with few reviews
        are pulled toward a 2-star baseline and only tutors with many genuinely
        high reviews approach the 500-point ceiling:

            effective = (avg * count + PRIOR_VALUE * PRIOR_WEIGHT) / (count + PRIOR_WEIGHT)
            score     = effective / 5 * 500

        New tutors (0 reviews) -> effective = 2.0 -> 200 points.

        Returns: (score, details_dict)
        """
        query = text("""
            SELECT
                COUNT(*) AS review_count,
                COALESCE(AVG(rating), 0) AS avg_rating
            FROM tutor_reviews
            WHERE tutor_id = :tutor_id
        """)
        result = self.db.execute(query, {"tutor_id": tutor_id}).fetchone()

        review_count = int(result.review_count) if result else 0
        avg_rating = float(result.avg_rating) if result and result.avg_rating else 0.0

        prior_v = self.RATING_PRIOR_VALUE
        prior_w = self.RATING_PRIOR_WEIGHT

        # Confidence-weighted rating on the 0-5 scale
        effective_rating = (
            (avg_rating * review_count + prior_v * prior_w)
            / (review_count + prior_w)
        )

        score = round(effective_rating / 5.0 * self.RATING_MAX_POINTS)

        return score, {
            "review_count": review_count,
            "avg_rating": round(avg_rating, 2),
            "effective_rating": round(effective_rating, 2),
            "score": score,
            "note": "no reviews → 2★ baseline" if review_count == 0 else None
        }

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

        # 0. Rating (0-500 points) - PRIMARY FACTOR (replaces subscription plan)
        rating_score, rating_details = self.calculate_rating_score(tutor_id)
        total_score += rating_score
        breakdown["rating"] = {
            "score": rating_score,
            "details": rating_details
        }

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
        breakdown["max_possible_new_score"] = 1330  # 500(rating)+120(interest)+200(students)+150(completion)+60(response)+300(experience)
        breakdown["payment_penalty_applied"] = payment_penalty

        return total_score, breakdown
