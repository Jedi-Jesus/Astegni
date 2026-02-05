"""
Market Pricing API Endpoints
Real-time market analysis for tutor pricing suggestions based on actual database data
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from decimal import Decimal
from datetime import datetime, timedelta
import psycopg
import os
import jwt
from jwt import PyJWTError
from dotenv import load_dotenv

load_dotenv()

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Get config from environment
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = "HS256"

def get_db_connection():
    """Get database connection (user database)"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")
    return psycopg.connect(database_url)

def get_admin_db_connection():
    """Get admin database connection"""
    admin_database_url = os.getenv("ADMIN_DATABASE_URL")
    if not admin_database_url:
        raise Exception("ADMIN_DATABASE_URL not found in environment variables")
    return psycopg.connect(admin_database_url)

def get_base_price_for_tutor(subject_category: str, session_format: str, credentials_count: int = 0, experience_years: float = 0):
    """
    Get base price from admin database rules
    Returns: (base_price, source) or (None, None) if no rule found
    """
    try:
        admin_conn = get_admin_db_connection()
        with admin_conn.cursor() as cur:
            # Try exact match first (subject + format)
            cur.execute("""
                SELECT base_price_per_hour, credential_bonus, experience_bonus_per_year, rule_name
                FROM base_price_rules
                WHERE subject_category = %s
                  AND session_format = %s
                  AND is_active = TRUE
                ORDER BY priority ASC
                LIMIT 1
            """, (subject_category, session_format))

            result = cur.fetchone()
            if result:
                base_price, cred_bonus, exp_bonus, rule_name = result
                total_price = float(base_price) + (float(cred_bonus) * credentials_count) + (float(exp_bonus) * experience_years)
                admin_conn.close()
                return (total_price, f"Base price rule: {rule_name}")

            # Try subject match + all formats
            cur.execute("""
                SELECT base_price_per_hour, credential_bonus, experience_bonus_per_year, rule_name
                FROM base_price_rules
                WHERE subject_category = %s
                  AND session_format = 'all'
                  AND is_active = TRUE
                ORDER BY priority ASC
                LIMIT 1
            """, (subject_category,))

            result = cur.fetchone()
            if result:
                base_price, cred_bonus, exp_bonus, rule_name = result
                total_price = float(base_price) + (float(cred_bonus) * credentials_count) + (float(exp_bonus) * experience_years)
                admin_conn.close()
                return (total_price, f"Base price rule: {rule_name}")

            # Try format match + all subjects
            cur.execute("""
                SELECT base_price_per_hour, credential_bonus, experience_bonus_per_year, rule_name
                FROM base_price_rules
                WHERE subject_category = 'all'
                  AND session_format = %s
                  AND is_active = TRUE
                ORDER BY priority ASC
                LIMIT 1
            """, (session_format,))

            result = cur.fetchone()
            if result:
                base_price, cred_bonus, exp_bonus, rule_name = result
                total_price = float(base_price) + (float(cred_bonus) * credentials_count) + (float(exp_bonus) * experience_years)
                admin_conn.close()
                return (total_price, f"Base price rule: {rule_name}")

            # Default fallback (all + all)
            cur.execute("""
                SELECT base_price_per_hour, credential_bonus, experience_bonus_per_year, rule_name
                FROM base_price_rules
                WHERE subject_category = 'all'
                  AND session_format = 'all'
                  AND is_active = TRUE
                ORDER BY priority ASC
                LIMIT 1
            """)

            result = cur.fetchone()
            if result:
                base_price, cred_bonus, exp_bonus, rule_name = result
                total_price = float(base_price) + (float(cred_bonus) * credentials_count) + (float(exp_bonus) * experience_years)
                admin_conn.close()
                return (total_price, f"Base price rule: {rule_name}")

            admin_conn.close()
            return (None, None)
    except Exception as e:
        print(f"Error fetching base price rules: {e}")
        return (None, None)

def is_new_tutor(tutor_id: int, conn) -> bool:
    """
    Check if tutor is considered 'new' (first 1000 tutors OR no enrollment history)
    Returns True if new, False otherwise
    """
    try:
        with conn.cursor() as cur:
            # Check if tutor has any enrollments
            cur.execute("""
                SELECT COUNT(*)
                FROM enrolled_students es
                INNER JOIN tutor_packages pkg ON es.package_id = pkg.id
                WHERE pkg.tutor_id = %s
            """, (tutor_id,))

            enrollment_count = cur.fetchone()[0]

            # If no enrollments, definitely a new tutor
            if enrollment_count == 0:
                return True

            # Check if tutor is in first 1000 tutors (by creation date)
            cur.execute("""
                SELECT COUNT(*)
                FROM tutor_profiles
                WHERE created_at <= (
                    SELECT created_at FROM tutor_profiles WHERE id = %s
                )
            """, (tutor_id,))

            position = cur.fetchone()[0]

            # If in first 1000 tutors, consider as new
            return position <= 1000

    except Exception as e:
        print(f"Error checking if tutor is new: {e}")
        return False

def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current authenticated user - returns dict with user data"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (PyJWTError, ValueError, TypeError) as e:
        print(f"JWT decode error: {e}")
        raise credentials_exception

    # Fetch user from database
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, email, phone, roles, active_role,
                       first_name, father_name, grandfather_name, profile_picture
                FROM users WHERE id = %s
            """, (user_id,))
            row = cur.fetchone()

            if not row:
                raise credentials_exception

            return {
                'id': row[0],
                'email': row[1],
                'phone': row[2],
                'roles': row[3] or [],
                'active_role': row[4],
                'first_name': row[5],
                'father_name': row[6],
                'grandfather_name': row[7],
                'profile_picture': row[8]
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error in get_current_user: {e}")
        raise credentials_exception
    finally:
        conn.close()

router = APIRouter(prefix="/api/market-pricing", tags=["market-pricing"])

# Pydantic Models
class MarketPriceRequest(BaseModel):
    time_period_months: int = Field(default=3, ge=1, le=12, description="Time period in months (1-12)")
    course_ids: Optional[List[int]] = Field(default=None, description="Filter by specific courses")
    grade_level: Optional[Union[str, List[str]]] = Field(default=None, description="Filter by grade level (single value or array for range)")
    session_format: Optional[str] = Field(default=None, description="Filter by session format")

class MarketPriceResponse(BaseModel):
    suggested_price: float = Field(description="Suggested hourly rate in ETB")
    market_average: float = Field(description="Market average price")
    price_range: Dict[str, float] = Field(description="Min/max price range")
    tutor_count: int = Field(description="Number of tutors in market analysis")
    similar_tutors_count: int = Field(description="Number of similar tutors analyzed")
    confidence_level: str = Field(description="Confidence level: high, medium, low")
    factors: Dict[str, Any] = Field(description="Factors considered in calculation")
    time_period_months: int = Field(description="Time period used for analysis")

class PriceSuggestionAnalytics(BaseModel):
    tutor_id: int
    suggested_price: float
    market_average: float
    tutor_rating: Optional[float]
    tutor_experience_years: Optional[int]
    tutor_student_count: Optional[int]
    time_period_months: int
    filters_applied: Optional[Dict] = None


@router.post("/suggest-price", response_model=MarketPriceResponse)
async def suggest_market_price(
    request: MarketPriceRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze real market data and suggest optimal pricing for tutor

    Algorithm (Enhanced v2.4 - Added Grade Level & Location):
    1. Get tutor's comprehensive profile data:
       - Rating (from reviews)
       - Completion rate (success_rate from tutor_analysis)
       - Student count (current teaching load)
       - Session format (Online or In-person)
       - Grade level (from packages - elementary vs high school vs university)
       - Location (city/country - market economics)
       - Experience (years from credentials)
       - Credentials (count of uploaded credentials)
       - Account age (time since joining platform)
    2. Query database for active tutors with packages in similar subjects/levels/locations
    3. Calculate weighted similarity score (9 factors):
       - Rating similarity: 20% (reputation)
       - Completion rate similarity: 16% (quality/reliability)
       - Location similarity: 15% (market economics - CRITICAL)
       - Student count similarity: 13% (current teaching load)
       - Session format similarity: 12% (Online vs In-person pricing)
       - Grade level similarity: 10% (teaching complexity)
       - Experience similarity: 8% (years of experience)
       - Credentials similarity: 4% (number of credentials)
       - Account age similarity: 2% (platform tenure)
    4. Apply time-based adjustment factor
    5. Return suggested price with confidence metrics
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Step 1: Get current tutor's comprehensive profile data (v2.4 - Added grade_level, location)
            cur.execute("""
                SELECT
                    tp.id,
                    tp.user_id,
                    COALESCE(ta.average_rating, 2.0) as rating,
                    COALESCE(ta.success_rate, 0.0) as completion_rate,
                    COALESCE(ta.total_students, 0) as student_count,
                    COALESCE(
                        (SELECT COUNT(*) FROM credentials WHERE user_id = tp.user_id),
                        0
                    ) as credentials_count,
                    COALESCE(
                        (SELECT SUM(COALESCE(years, 0)) FROM credentials WHERE user_id = tp.user_id),
                        0
                    ) as total_experience_years,
                    tp.created_at,
                    u.first_name,
                    u.location,
                    COALESCE(
                        (SELECT grade_level FROM tutor_packages WHERE tutor_id = tp.id AND is_active = TRUE ORDER BY created_at DESC LIMIT 1),
                        ARRAY[]::text[]
                    ) as grade_levels
                FROM tutor_profiles tp
                LEFT JOIN tutor_analysis ta ON tp.id = ta.tutor_id
                LEFT JOIN users u ON tp.user_id = u.id
                WHERE tp.user_id = %s
            """, (current_user['id'],))

            tutor_row = cur.fetchone()
            if not tutor_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tutor profile not found"
                )

            tutor_id, user_id, tutor_rating, completion_rate, student_count, credentials_count, total_experience_years, created_at, first_name, tutor_location, tutor_grade_levels = tutor_row
            tutor_rating = float(tutor_rating) if tutor_rating else 2.0
            completion_rate = float(completion_rate) if completion_rate else 0.0
            student_count = student_count or 0
            credentials_count = credentials_count or 0
            total_experience_years = int(total_experience_years) if total_experience_years else 0
            tutor_location = tutor_location or ""
            tutor_grade_levels = tutor_grade_levels or []

            # Calculate account age in days
            account_age_days = (datetime.now() - created_at).days if created_at else 0

            # Extract country from location (format: "City, Country" or "Country")
            tutor_country = ""
            if tutor_location:
                parts = tutor_location.split(',')
                tutor_country = parts[-1].strip().upper() if parts else tutor_location.strip().upper()

            # Calculate grade level complexity score (1-14 scale, average of all taught levels)
            # 1-12 = Grades, 13 = University, 14 = Certification
            grade_level_map = {
                'Grade 1': 1, 'Grade 2': 2, 'Grade 3': 3, 'Grade 4': 4, 'Grade 5': 5, 'Grade 6': 6,
                'Grade 7': 7, 'Grade 8': 8, 'Grade 9': 9, 'Grade 10': 10, 'Grade 11': 11, 'Grade 12': 12,
                'University': 13, 'Certification': 14
            }
            tutor_grade_complexity = 0
            if tutor_grade_levels:
                numeric_grades = [grade_level_map.get(g, 7) for g in tutor_grade_levels]
                tutor_grade_complexity = sum(numeric_grades) / len(numeric_grades) if numeric_grades else 7
            else:
                tutor_grade_complexity = 7  # Default to middle school level

            # Credentials Score: Count of uploaded credentials (0-100 scale, capped)
            # Each credential contributes 5 points (certifications, achievements, experience letters, etc.)
            credentials_score = min(100, credentials_count * 5)

            # Experience Score: Based on years from credentials (0-100 scale, capped)
            # Each year contributes 5 points (max 20 years = 100 points)
            experience_score = min(100, total_experience_years * 5)

            # Step 2: Build query for similar tutors based on filters
            query_filters = []
            query_params = []

            # Base date filter for time period
            cutoff_date = datetime.now() - timedelta(days=request.time_period_months * 30)
            query_filters.append("pkg.created_at >= %s")
            query_params.append(cutoff_date)

            # Course filter
            if request.course_ids:
                query_filters.append("pkg.course_ids && %s")
                query_params.append(request.course_ids)

            # Grade level filter (grade_level is an array in database)
            if request.grade_level:
                if isinstance(request.grade_level, list):
                    # Range: Match packages that have ANY of the requested grade levels
                    query_filters.append("pkg.grade_level && %s")
                    query_params.append(request.grade_level)
                else:
                    # Single value: Match packages that contain this grade level
                    query_filters.append("%s = ANY(pkg.grade_level)")
                    query_params.append(request.grade_level)

            # Session format filter
            if request.session_format:
                query_filters.append("pkg.session_format = %s")
                query_params.append(request.session_format)

            where_clause = " AND ".join(query_filters) if query_filters else "1=1"

            # Step 3: Query market data with all factors including session format, location, grade level (v2.4)
            # IMPORTANT: Use agreed_price from enrolled_students (actual market prices)
            cur.execute(f"""
                SELECT
                    tp.id,
                    COALESCE(ta.average_rating, 2.0) as rating,
                    COALESCE(ta.success_rate, 0.0) as completion_rate,
                    COALESCE(ta.total_students, 0) as student_count,
                    AVG(es.agreed_price) as avg_agreed_price,
                    COALESCE(
                        (SELECT COUNT(*) FROM credentials WHERE user_id = tp.user_id),
                        0
                    ) as credentials_count,
                    COALESCE(
                        (SELECT SUM(COALESCE(years, 0)) FROM credentials WHERE user_id = tp.user_id),
                        0
                    ) as total_experience_years,
                    tp.created_at,
                    pkg.session_format,
                    u.location,
                    pkg.grade_level
                FROM tutor_profiles tp
                INNER JOIN tutor_packages pkg ON tp.id = pkg.tutor_id
                INNER JOIN enrolled_students es ON pkg.id = es.package_id
                LEFT JOIN tutor_analysis ta ON tp.id = ta.tutor_id
                LEFT JOIN users u ON tp.user_id = u.id
                WHERE pkg.is_active = TRUE
                  AND es.agreed_price > 0
                  AND tp.id != %s
                  AND es.enrolled_at >= %s
                  AND {where_clause}
                GROUP BY tp.id, ta.average_rating, ta.success_rate, ta.total_students, tp.created_at, pkg.session_format, u.location, pkg.grade_level
            """, [tutor_id, cutoff_date] + query_params)

            market_data = cur.fetchall()

            if len(market_data) < 5:
                # Not enough data - use broader criteria (all courses/grades) but still include location & grade_level (v2.4)
                cur.execute("""
                    SELECT
                        tp.id,
                        COALESCE(ta.average_rating, 2.0) as rating,
                        COALESCE(ta.success_rate, 0.0) as completion_rate,
                        COALESCE(ta.total_students, 0) as student_count,
                        AVG(es.agreed_price) as avg_agreed_price,
                        COALESCE(
                            (SELECT COUNT(*) FROM credentials WHERE user_id = tp.user_id),
                            0
                        ) as credentials_count,
                        COALESCE(
                            (SELECT SUM(COALESCE(years, 0)) FROM credentials WHERE user_id = tp.user_id),
                            0
                        ) as total_experience_years,
                        tp.created_at,
                        pkg.session_format,
                        u.location,
                        pkg.grade_level
                    FROM tutor_profiles tp
                    INNER JOIN tutor_packages pkg ON tp.id = pkg.tutor_id
                    INNER JOIN enrolled_students es ON pkg.id = es.package_id
                    LEFT JOIN tutor_analysis ta ON tp.id = ta.tutor_id
                    LEFT JOIN users u ON tp.user_id = u.id
                    WHERE pkg.is_active = TRUE
                      AND es.agreed_price > 0
                      AND tp.id != %s
                      AND es.enrolled_at >= %s
                    GROUP BY tp.id, ta.average_rating, ta.success_rate, ta.total_students, tp.created_at, pkg.session_format, u.location, pkg.grade_level
                """, (tutor_id, cutoff_date))

                market_data = cur.fetchall()

            # Check if tutor is new
            tutor_is_new = is_new_tutor(tutor_id, conn)

            if len(market_data) == 0 or tutor_is_new:
                # Use base price rules for new tutors or when no market data available
                # Map course to subject category (simplified mapping for now)
                subject_category = "all"  # Default to all subjects
                if request.course_ids:
                    # TODO: Map actual course IDs to subject categories
                    # For now use 'all' as fallback
                    subject_category = "all"

                base_price, price_source = get_base_price_for_tutor(
                    subject_category=subject_category,
                    session_format=request.session_format or "all",
                    credentials_count=credentials_count,
                    experience_years=account_age_days / 365.0  # Convert days to years
                )

                if base_price:
                    # Base price found from rules
                    suggested_price = base_price
                    note = f"New tutor pricing. {price_source}"
                    confidence = "medium" if tutor_is_new else "low"
                else:
                    # No base price rule found - use hardcoded fallback
                    suggested_price = 150.0
                    note = "No pricing rules configured. Using system default."
                    confidence = "low"

                return MarketPriceResponse(
                    suggested_price=suggested_price,
                    market_average=suggested_price,
                    price_range={"min": suggested_price * 0.7, "max": suggested_price * 1.5, "suggested_min": suggested_price * 0.9, "suggested_max": suggested_price * 1.1},
                    tutor_count=0,
                    similar_tutors_count=0,
                    confidence_level=confidence,
                    factors={
                        "tutor_id": tutor_id,
                        "first_name": first_name,
                        "note": note,
                        "is_new_tutor": tutor_is_new,
                        "tutor_rating": tutor_rating,
                        "completion_rate": completion_rate,
                        "student_count": student_count,
                        "location": tutor_location,
                        "country": tutor_country,
                        "grade_levels": tutor_grade_levels,
                        "grade_complexity": tutor_grade_complexity,
                        "experience_score": experience_score,
                        "experience_years": total_experience_years,
                        "credentials_score": credentials_score,
                        "credentials_count": credentials_count,
                        "account_age_days": account_age_days,
                        "time_factor": 1.0,
                        "algorithm_version": "2.4_grade_location_base_price",
                        "weights": {
                            "rating": "20%",
                            "completion_rate": "16%",
                            "location": "15%",
                            "student_count": "13%",
                            "session_format": "12%",
                            "grade_level": "10%",
                            "experience": "8%",
                            "credentials": "4%",
                            "account_age": "2%"
                        },
                        "filters_applied": {
                            "course_ids": request.course_ids,
                            "grade_level": request.grade_level,
                            "session_format": request.session_format
                        }
                    },
                    time_period_months=request.time_period_months
                )

            # Step 4: Calculate weighted prices based on 9-FACTOR similarity (v2.4 - Added Grade Level & Location)
            weighted_prices = []
            all_prices = []
            similar_tutors_count = 0

            for row in market_data:
                market_tutor_id, rating, comp_rate, students, price, credentials, experience_years, market_created_at, market_session_format, market_location, market_grade_levels = row
                rating = float(rating) if rating else 2.0
                comp_rate = float(comp_rate) if comp_rate else 0.0
                students = students or 0
                price = float(price)
                credentials = credentials or 0
                experience_years = int(experience_years) if experience_years else 0
                market_location = market_location or ""
                market_grade_levels = market_grade_levels or []

                all_prices.append(price)

                # Calculate market tutor's metrics
                market_credentials_score = min(100, credentials * 5)  # Credentials score (count-based)
                market_experience_score = min(100, experience_years * 5)  # Experience score (years-based)
                market_account_age_days = (datetime.now() - market_created_at).days if market_created_at else 0

                # Extract country from market tutor's location
                market_country = ""
                if market_location:
                    parts = market_location.split(',')
                    market_country = parts[-1].strip().upper() if parts else market_location.strip().upper()

                # Calculate market tutor's grade complexity
                market_grade_complexity = 7  # Default
                if market_grade_levels:
                    numeric_grades = [grade_level_map.get(g, 7) for g in market_grade_levels]
                    market_grade_complexity = sum(numeric_grades) / len(numeric_grades) if numeric_grades else 7

                # Calculate similarity scores (0-1) for each of 9 factors

                # 1. Rating similarity (0-5 scale)
                rating_diff = abs(rating - tutor_rating)
                rating_similarity = 1 - min(rating_diff / 5.0, 1.0)

                # 2. Completion rate similarity (0-1 scale, quality indicator)
                comp_rate_diff = abs(comp_rate - completion_rate)
                comp_rate_similarity = 1 - comp_rate_diff

                # 3. Location similarity (CRITICAL - market economics)
                # Same country = 1.0, Different country = 0.0
                # This ensures we compare tutors in similar economic markets
                location_similarity = 1.0 if (tutor_country and market_country and tutor_country == market_country) else 0.3

                # 4. Student count similarity (teaching load)
                # Normalize to reasonable range (0-100 students)
                student_diff = abs(students - student_count) / max(student_count, students, 100)
                student_similarity = 1 - min(student_diff, 1.0)

                # 5. Session format similarity (exact match or not)
                # Online vs In-person have different market prices
                session_format_similarity = 1.0 if market_session_format == request.session_format else 0.5

                # 6. Grade level similarity (teaching complexity)
                # Compare average grade complexity (1-14 scale)
                grade_diff = abs(market_grade_complexity - tutor_grade_complexity) / 14.0
                grade_level_similarity = 1 - min(grade_diff, 1.0)

                # 7. Experience similarity (years-based)
                exp_diff = abs(market_experience_score - experience_score) / max(experience_score, market_experience_score, 100)
                exp_similarity = 1 - min(exp_diff, 1.0)

                # 8. Credentials similarity (count-based)
                cred_diff = abs(market_credentials_score - credentials_score) / max(credentials_score, market_credentials_score, 100)
                cred_similarity = 1 - min(cred_diff, 1.0)

                # 9. Account age similarity (platform tenure)
                # Normalize to 3 years (1095 days) as typical range
                age_diff = abs(market_account_age_days - account_age_days) / max(account_age_days, market_account_age_days, 1095)
                age_similarity = 1 - min(age_diff, 1.0)

                # NEW Weight distribution (v2.4 - 9 factors total 100%):
                # - Rating: 20% (reputation)
                # - Completion rate: 16% (quality/reliability)
                # - Location: 15% (market economics - CRITICAL)
                # - Student count: 13% (current teaching load)
                # - Session format: 12% (online vs in-person pricing)
                # - Grade level: 10% (teaching complexity)
                # - Experience: 8% (years of experience)
                # - Credentials: 4% (number of credentials)
                # - Account age: 2% (platform tenure)
                similarity = (
                    rating_similarity * 0.20 +
                    comp_rate_similarity * 0.16 +
                    location_similarity * 0.15 +
                    student_similarity * 0.13 +
                    session_format_similarity * 0.12 +
                    grade_level_similarity * 0.10 +
                    exp_similarity * 0.08 +
                    cred_similarity * 0.04 +
                    age_similarity * 0.02
                )

                # Consider tutors with similarity > 0.65 as "similar"
                if similarity > 0.65:
                    similar_tutors_count += 1

                weighted_prices.append({
                    'price': price,
                    'weight': similarity,
                    'rating': rating,
                    'completion_rate': comp_rate,
                    'students': students,
                    'experience_score': market_experience_score,
                    'credentials_score': market_credentials_score,
                    'account_age_days': market_account_age_days
                })

            # Step 5: Calculate weighted average
            if weighted_prices:
                total_weight = sum(item['weight'] for item in weighted_prices)
                weighted_avg = sum(item['price'] * item['weight'] for item in weighted_prices) / total_weight
            else:
                weighted_avg = sum(all_prices) / len(all_prices)

            # Step 6: Apply time-based adjustment (market trend factor)
            # Assumption: prices trend upward over time at 5% per 3 months
            time_factor = 1.0 + ((request.time_period_months - 3) * 0.05)
            suggested_price = weighted_avg * time_factor

            # Step 7: Apply confidence-based bounds
            if similar_tutors_count >= 10:
                confidence = "high"
                price_variance = 0.15  # ±15%
            elif similar_tutors_count >= 5:
                confidence = "medium"
                price_variance = 0.25  # ±25%
            else:
                confidence = "low"
                price_variance = 0.35  # ±35%

            # Constrain within reasonable bounds
            min_bound = max(50, suggested_price * (1 - price_variance))
            max_bound = min(500, suggested_price * (1 + price_variance))
            suggested_price = max(min_bound, min(suggested_price, max_bound))

            # Round to nearest 5 ETB for clean pricing
            suggested_price = round(suggested_price / 5) * 5

            market_average = sum(all_prices) / len(all_prices)

            return MarketPriceResponse(
                suggested_price=float(suggested_price),
                market_average=float(market_average),
                price_range={
                    "min": float(min(all_prices)),
                    "max": float(max(all_prices)),
                    "suggested_min": float(min_bound),
                    "suggested_max": float(max_bound)
                },
                tutor_count=len(market_data),
                similar_tutors_count=similar_tutors_count,
                confidence_level=confidence,
                factors={
                    "tutor_id": tutor_id,
                    "first_name": first_name,
                    "tutor_rating": tutor_rating,
                    "completion_rate": completion_rate,
                    "student_count": student_count,
                    "location": tutor_location,
                    "country": tutor_country,
                    "grade_levels": tutor_grade_levels,
                    "grade_complexity": tutor_grade_complexity,
                    "credentials_score": credentials_score,
                    "credentials_count": credentials_count,
                    "experience_score": experience_score,
                    "experience_years": total_experience_years,
                    "account_age_days": account_age_days,
                    "time_factor": time_factor,
                    "algorithm_version": "2.4_grade_location",
                    "weights": {
                        "rating": "20%",
                        "completion_rate": "16%",
                        "location": "15%",
                        "student_count": "13%",
                        "session_format": "12%",
                        "grade_level": "10%",
                        "experience": "8%",
                        "credentials": "4%",
                        "account_age": "2%"
                    },
                    "note": "Experience score = years from credentials (5 pts/year, max 100). Credentials score = count of credentials (5 pts each, max 100).",
                    "filters_applied": {
                        "course_ids": request.course_ids,
                        "grade_level": request.grade_level,
                        "session_format": request.session_format
                    }
                },
                time_period_months=request.time_period_months
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in suggest_market_price: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate market price: {str(e)}"
        )
    finally:
        conn.close()


@router.post("/log-suggestion")
async def log_price_suggestion(
    analytics: PriceSuggestionAnalytics,
    current_user: dict = Depends(get_current_user)
):
    """
    Log price suggestion for analytics tracking
    This helps track which suggestions are accepted vs rejected
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO price_suggestion_analytics (
                    tutor_id,
                    user_id,
                    suggested_price,
                    market_average,
                    tutor_rating,
                    tutor_experience_years,
                    tutor_student_count,
                    time_period_months,
                    filters_applied,
                    created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING id
            """, (
                analytics.tutor_id,
                current_user['id'],
                analytics.suggested_price,
                analytics.market_average,
                analytics.tutor_rating,
                analytics.tutor_experience_years,
                analytics.tutor_student_count,
                analytics.time_period_months,
                str(analytics.filters_applied) if analytics.filters_applied else None
            ))

            suggestion_id = cur.fetchone()[0]
            conn.commit()

            return {
                "success": True,
                "suggestion_id": suggestion_id,
                "message": "Price suggestion logged for analytics"
            }

    except Exception as e:
        conn.rollback()
        print(f"Error logging price suggestion: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log price suggestion: {str(e)}"
        )
    finally:
        conn.close()


@router.post("/log-acceptance/{suggestion_id}")
async def log_price_acceptance(
    suggestion_id: int,
    accepted_price: float,
    current_user: dict = Depends(get_current_user)
):
    """
    Log when a tutor accepts and uses a suggested price
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE price_suggestion_analytics
                SET accepted = TRUE,
                    accepted_price = %s,
                    accepted_at = NOW()
                WHERE id = %s AND user_id = %s
            """, (accepted_price, suggestion_id, current_user['id']))

            conn.commit()

            return {
                "success": True,
                "message": "Price acceptance logged"
            }

    except Exception as e:
        conn.rollback()
        print(f"Error logging price acceptance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log price acceptance: {str(e)}"
        )
    finally:
        conn.close()


@router.get("/analytics/summary")
async def get_pricing_analytics_summary(
    current_user: dict = Depends(get_current_user)
):
    """
    Get summary analytics for tutor's pricing suggestions
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Get tutor_id
            cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user['id'],))
            tutor_row = cur.fetchone()
            if not tutor_row:
                raise HTTPException(status_code=404, detail="Tutor profile not found")

            tutor_id = tutor_row[0]

            # Get analytics summary
            cur.execute("""
                SELECT
                    COUNT(*) as total_suggestions,
                    COUNT(*) FILTER (WHERE accepted = TRUE) as accepted_count,
                    AVG(suggested_price) as avg_suggested_price,
                    AVG(accepted_price) FILTER (WHERE accepted = TRUE) as avg_accepted_price,
                    AVG(market_average) as avg_market_price
                FROM price_suggestion_analytics
                WHERE tutor_id = %s
                  AND created_at >= NOW() - INTERVAL '6 months'
            """, (tutor_id,))

            row = cur.fetchone()
            total, accepted, avg_suggested, avg_accepted, avg_market = row

            acceptance_rate = (accepted / total * 100) if total > 0 else 0

            return {
                "total_suggestions": total or 0,
                "accepted_count": accepted or 0,
                "acceptance_rate": round(acceptance_rate, 2),
                "avg_suggested_price": float(avg_suggested) if avg_suggested else 0,
                "avg_accepted_price": float(avg_accepted) if avg_accepted else 0,
                "avg_market_price": float(avg_market) if avg_market else 0
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting analytics summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analytics: {str(e)}"
        )
    finally:
        conn.close()


@router.post("/market-tutors")
async def get_market_tutors(
    request: MarketPriceRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Get market tutor data for charts and tables (v2.4 - 9 Factors Including Grade Level & Location)
    Returns ONLY tutors similar to the requester for accurate market comparisons

    Uses the same 9-factor similarity algorithm as price suggestion:
    - Rating similarity: 20%
    - Completion rate similarity: 16%
    - Location similarity: 15% (market economics)
    - Student count similarity: 13%
    - Session format similarity: 12%
    - Grade level similarity: 10% (teaching complexity)
    - Experience similarity: 8% (years-based)
    - Credentials similarity: 4% (count-based)
    - Account age similarity: 2%

    Only returns tutors with similarity score > 0.65
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Step 1: Get requester's profile data (v2.4 - Added location and grade_level)
            cur.execute("""
                SELECT
                    tp.id,
                    COALESCE(ta.average_rating, 2.0) as rating,
                    COALESCE(ta.success_rate, 0.0) as completion_rate,
                    COALESCE(ta.total_students, 0) as student_count,
                    COALESCE(
                        (SELECT COUNT(*) FROM credentials WHERE user_id = tp.user_id),
                        0
                    ) as credentials_count,
                    COALESCE(
                        (SELECT SUM(COALESCE(years, 0)) FROM credentials WHERE user_id = tp.user_id),
                        0
                    ) as total_experience_years,
                    tp.created_at,
                    u.location,
                    COALESCE(
                        (SELECT grade_level FROM tutor_packages WHERE tutor_id = tp.id AND is_active = TRUE ORDER BY created_at DESC LIMIT 1),
                        ARRAY[]::text[]
                    ) as grade_levels
                FROM tutor_profiles tp
                LEFT JOIN tutor_analysis ta ON tp.id = ta.tutor_id
                LEFT JOIN users u ON tp.user_id = u.id
                WHERE tp.user_id = %s
            """, (current_user['id'],))

            requester_row = cur.fetchone()
            if not requester_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tutor profile not found"
                )

            requester_id, req_rating, req_comp_rate, req_students, req_credentials, req_experience_years, req_created_at, req_location, req_grade_levels = requester_row
            req_rating = float(req_rating) if req_rating else 2.0
            req_comp_rate = float(req_comp_rate) if req_comp_rate else 0.0
            req_students = req_students or 0
            req_credentials = req_credentials or 0
            req_experience_years = int(req_experience_years) if req_experience_years else 0
            req_location = req_location or ""
            req_grade_levels = req_grade_levels or []
            req_account_age_days = (datetime.now() - req_created_at).days if req_created_at else 0
            req_credentials_score = min(100, req_credentials * 5)
            req_experience_score = min(100, req_experience_years * 5)

            # Extract country from requester's location
            req_country = ""
            if req_location:
                parts = req_location.split(',')
                req_country = parts[-1].strip().upper() if parts else req_location.strip().upper()

            # Calculate requester's grade complexity
            grade_level_map = {
                'Grade 1': 1, 'Grade 2': 2, 'Grade 3': 3, 'Grade 4': 4, 'Grade 5': 5, 'Grade 6': 6,
                'Grade 7': 7, 'Grade 8': 8, 'Grade 9': 9, 'Grade 10': 10, 'Grade 11': 11, 'Grade 12': 12,
                'University': 13, 'Certification': 14
            }
            req_grade_complexity = 7  # Default
            if req_grade_levels:
                numeric_grades = [grade_level_map.get(g, 7) for g in req_grade_levels]
                req_grade_complexity = sum(numeric_grades) / len(numeric_grades) if numeric_grades else 7

            # Step 2: Build filters for market data
            cutoff_date = datetime.now() - timedelta(days=request.time_period_months * 30)
            query_filters = ["pkg.created_at >= %s"]
            query_params = [cutoff_date]

            if request.course_ids:
                query_filters.append("pkg.course_ids && %s")
                query_params.append(request.course_ids)

            if request.grade_level:
                if isinstance(request.grade_level, list):
                    # Range: Match packages that have ANY of the requested grade levels
                    query_filters.append("pkg.grade_level && %s")
                    query_params.append(request.grade_level)
                else:
                    # Single value: Match packages that contain this grade level
                    query_filters.append("%s = ANY(pkg.grade_level)")
                    query_params.append(request.grade_level)

            if request.session_format:
                query_filters.append("pkg.session_format = %s")
                query_params.append(request.session_format)

            where_clause = " AND ".join(query_filters)

            # Step 3: Get ALL market tutors first (v2.4 - Added location and grade_level)
            cur.execute(f"""
                SELECT DISTINCT ON (tp.id)
                    tp.id,
                    COALESCE(ta.average_rating, 2.0) as rating,
                    COALESCE(ta.success_rate, 0.0) as completion_rate,
                    COALESCE(ta.total_students, 0) as student_count,
                    COALESCE(
                        (SELECT COUNT(*) FROM credentials WHERE user_id = tp.user_id),
                        0
                    ) as credentials_count,
                    COALESCE(
                        (SELECT SUM(COALESCE(years, 0)) FROM credentials WHERE user_id = tp.user_id),
                        0
                    ) as total_experience_years,
                    tp.created_at,
                    AVG(es.agreed_price) as avg_agreed_price,
                    pkg.session_format,
                    u.location,
                    pkg.grade_level
                FROM tutor_profiles tp
                INNER JOIN tutor_packages pkg ON tp.id = pkg.tutor_id
                INNER JOIN enrolled_students es ON pkg.id = es.package_id
                LEFT JOIN tutor_analysis ta ON tp.id = ta.tutor_id
                LEFT JOIN users u ON tp.user_id = u.id
                WHERE pkg.is_active = TRUE
                  AND es.agreed_price > 0
                  AND es.enrolled_at >= %s
                  AND tp.id != %s
                  AND {where_clause}
                GROUP BY tp.id, ta.average_rating, ta.success_rate, ta.total_students, tp.created_at, pkg.session_format, u.location, pkg.grade_level
                ORDER BY tp.id, ta.average_rating DESC NULLS LAST
            """, [cutoff_date, requester_id] + query_params)

            all_tutors = cur.fetchall()

            # Step 4: Filter to ONLY similar tutors (similarity > 0.65) - v2.4 with 9 factors
            similar_tutors = []

            for row in all_tutors:
                tutor_id, rating, comp_rate, students, credentials, experience_years, created_at, price, session_format, location, grade_levels = row
                rating = float(rating) if rating else 2.0
                comp_rate = float(comp_rate) if comp_rate else 0.0
                students = students or 0
                credentials = credentials or 0
                experience_years = int(experience_years) if experience_years else 0
                price = float(price)
                location = location or ""
                grade_levels = grade_levels or []

                account_age_days = (datetime.now() - created_at).days if created_at else 0
                credentials_score = min(100, credentials * 5)
                experience_score = min(100, experience_years * 5)

                # Extract country from location
                country = ""
                if location:
                    parts = location.split(',')
                    country = parts[-1].strip().upper() if parts else location.strip().upper()

                # Calculate grade complexity
                grade_complexity = 7  # Default
                if grade_levels:
                    numeric_grades = [grade_level_map.get(g, 7) for g in grade_levels]
                    grade_complexity = sum(numeric_grades) / len(numeric_grades) if numeric_grades else 7

                # Calculate similarity scores (9 factors - same as price suggestion algorithm)

                # 1. Rating similarity (0-5 scale)
                rating_diff = abs(rating - req_rating)
                rating_similarity = 1 - min(rating_diff / 5.0, 1.0)

                # 2. Completion rate similarity (0-1 scale)
                comp_rate_diff = abs(comp_rate - req_comp_rate)
                comp_rate_similarity = 1 - comp_rate_diff

                # 3. Location similarity (CRITICAL - market economics)
                location_similarity = 1.0 if (req_country and country and req_country == country) else 0.3

                # 4. Student count similarity
                student_diff = abs(students - req_students) / max(req_students, students, 100)
                student_similarity = 1 - min(student_diff, 1.0)

                # 5. Session format similarity
                session_format_similarity = 1.0 if session_format == request.session_format else 0.5

                # 6. Grade level similarity (teaching complexity)
                grade_diff = abs(grade_complexity - req_grade_complexity) / 14.0
                grade_level_similarity = 1 - min(grade_diff, 1.0)

                # 7. Experience similarity (years-based)
                exp_diff = abs(experience_score - req_experience_score) / max(req_experience_score, experience_score, 100)
                exp_similarity = 1 - min(exp_diff, 1.0)

                # 8. Credentials similarity (count-based)
                cred_diff = abs(credentials_score - req_credentials_score) / max(req_credentials_score, credentials_score, 100)
                cred_similarity = 1 - min(cred_diff, 1.0)

                # 9. Account age similarity
                age_diff = abs(account_age_days - req_account_age_days) / max(req_account_age_days, account_age_days, 1095)
                age_similarity = 1 - min(age_diff, 1.0)

                # Calculate weighted similarity (v2.4 - 9 factors)
                similarity = (
                    rating_similarity * 0.20 +
                    comp_rate_similarity * 0.16 +
                    location_similarity * 0.15 +
                    student_similarity * 0.13 +
                    session_format_similarity * 0.12 +
                    grade_level_similarity * 0.10 +
                    exp_similarity * 0.08 +
                    cred_similarity * 0.04 +
                    age_similarity * 0.02
                )

                # Only include tutors with similarity > 0.65
                if similarity > 0.65:
                    similar_tutors.append({
                        'id': tutor_id,
                        'rating': float(rating),
                        'completion_rate': float(comp_rate),
                        'student_count': students,
                        'location': location,
                        'country': country,
                        'grade_levels': grade_levels,
                        'grade_complexity': grade_complexity,
                        'experience_score': experience_score,
                        'credentials_score': credentials_score,
                        'credentials_count': credentials,
                        'experience_years': experience_years,
                        'account_age_days': account_age_days,
                        'price_per_hour': float(price),
                        'similarity_score': round(similarity, 3)
                    })

            # Sort by similarity (highest first)
            similar_tutors.sort(key=lambda x: x['similarity_score'], reverse=True)

            return {
                'tutors': similar_tutors,
                'count': len(similar_tutors),
                'total_market_tutors': len(all_tutors),
                'requester_profile': {
                    'rating': req_rating,
                    'completion_rate': req_comp_rate,
                    'student_count': req_students,
                    'location': req_location,
                    'country': req_country,
                    'grade_levels': req_grade_levels,
                    'grade_complexity': req_grade_complexity,
                    'experience_score': req_experience_score,
                    'credentials_score': req_credentials_score,
                    'credentials_count': req_credentials,
                    'experience_years': req_experience_years,
                    'account_age_days': req_account_age_days
                },
                'algorithm_version': '2.4_grade_location',
                'time_period_months': request.time_period_months,
                'filters_applied': {
                    'course_ids': request.course_ids,
                    'grade_level': request.grade_level,
                    'session_format': request.session_format,
                    'similarity_threshold': 0.65
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching market tutors: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch market tutors: {str(e)}"
        )
    finally:
        conn.close()
