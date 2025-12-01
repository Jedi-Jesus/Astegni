#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration: Fix Tutor Review Ratings Calculation

This migration:
1. Creates a trigger to automatically calculate the 'rating' field as the average of the 4 factor ratings
2. Updates all existing reviews to have the correct rating value
3. Ensures future reviews always have the correct rating

The 4-Factor Rating System:
- Subject Understanding (subject_understanding_rating)
- Communication (communication_rating)
- Discipline (discipline_rating)
- Punctuality (punctuality_rating)

Overall rating = Average of these 4 factors
"""

import psycopg
from dotenv import load_dotenv
import os
import sys

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def create_rating_calculation_trigger():
    """Create trigger to auto-calculate rating from 4 factors"""

    print("\n" + "="*60)
    print("TUTOR REVIEW RATING CALCULATION FIX")
    print("="*60)

    try:
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()

        # Step 1: Create the trigger function
        print("\n📝 Creating trigger function to calculate rating...")
        cur.execute("""
            CREATE OR REPLACE FUNCTION calculate_tutor_review_rating()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Calculate rating as average of 4 factors
                -- Use COALESCE to handle NULL values (treat as 0)
                NEW.rating := (
                    COALESCE(NEW.subject_understanding_rating, 0) +
                    COALESCE(NEW.communication_rating, 0) +
                    COALESCE(NEW.discipline_rating, 0) +
                    COALESCE(NEW.punctuality_rating, 0)
                ) / 4.0;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)
        print("✅ Trigger function created")

        # Step 2: Create the trigger (if not exists)
        print("\n📝 Creating trigger on tutor_reviews table...")
        cur.execute("""
            DROP TRIGGER IF EXISTS calculate_rating_before_insert_update ON tutor_reviews;

            CREATE TRIGGER calculate_rating_before_insert_update
            BEFORE INSERT OR UPDATE ON tutor_reviews
            FOR EACH ROW
            EXECUTE FUNCTION calculate_tutor_review_rating();
        """)
        print("✅ Trigger created successfully")

        # Step 3: Update all existing reviews to have correct ratings
        print("\n📝 Updating all existing reviews with correct ratings...")
        cur.execute("""
            UPDATE tutor_reviews
            SET rating = (
                COALESCE(subject_understanding_rating, 0) +
                COALESCE(communication_rating, 0) +
                COALESCE(discipline_rating, 0) +
                COALESCE(punctuality_rating, 0)
            ) / 4.0
            WHERE rating != (
                COALESCE(subject_understanding_rating, 0) +
                COALESCE(communication_rating, 0) +
                COALESCE(discipline_rating, 0) +
                COALESCE(punctuality_rating, 0)
            ) / 4.0
            OR rating IS NULL;
        """)
        updated_count = cur.rowcount
        print(f"✅ Updated {updated_count} review(s) with corrected ratings")

        # Step 4: Show sample data to verify
        print("\n📊 Sample Reviews (Before and After):")
        cur.execute("""
            SELECT
                id,
                rating,
                subject_understanding_rating,
                communication_rating,
                discipline_rating,
                punctuality_rating,
                (subject_understanding_rating + communication_rating + discipline_rating + punctuality_rating) / 4.0 as calculated_rating
            FROM tutor_reviews
            ORDER BY id
            LIMIT 5;
        """)

        print(f"\n{'ID':<5} {'Rating':<8} {'Subject':<8} {'Comm':<8} {'Disc':<8} {'Punct':<8} {'Calculated':<12}")
        print("-" * 70)
        for row in cur.fetchall():
            id_val, rating, subject, comm, disc, punct, calc = row
            print(f"{id_val:<5} {rating:<8.2f} {subject:<8.2f} {comm:<8.2f} {disc:<8.2f} {punct:<8.2f} {calc:<12.2f}")

        # Step 5: Verify all ratings are correct
        print("\n🔍 Verifying all ratings are correctly calculated...")
        cur.execute("""
            SELECT COUNT(*)
            FROM tutor_reviews
            WHERE ABS(rating - (
                (COALESCE(subject_understanding_rating, 0) +
                 COALESCE(communication_rating, 0) +
                 COALESCE(discipline_rating, 0) +
                 COALESCE(punctuality_rating, 0)) / 4.0
            )) > 0.01;  -- Allow tiny floating point differences
        """)
        incorrect_count = cur.fetchone()[0]

        if incorrect_count == 0:
            print("✅ All reviews have correct ratings!")
        else:
            print(f"⚠️  Warning: {incorrect_count} reviews still have incorrect ratings")

        # Commit changes
        conn.commit()
        cur.close()
        conn.close()

        print("\n" + "="*60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("="*60)
        print("\nWhat changed:")
        print("1. ✅ Created automatic rating calculation trigger")
        print("2. ✅ Updated all existing reviews with correct ratings")
        print("3. ✅ Future reviews will auto-calculate rating from 4 factors")
        print("\nHow it works:")
        print("• When a review is created/updated, rating is automatically calculated")
        print("• Rating = (Subject + Communication + Discipline + Punctuality) / 4")
        print("• No manual rating input needed - it's always accurate!")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise

if __name__ == "__main__":
    create_rating_calculation_trigger()
