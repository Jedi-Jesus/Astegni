"""
Migration: Fix Profile ID References
- Convert parent_profiles.children_ids from user_id[] to student_profile.id[]
- Convert student_profiles.parent_id from user_id[] to parent_profile.id[]

This ensures consistency: profile tables reference other profile tables by their IDs,
not by user_ids.

Before:
- parent_profiles.children_ids = [user_id1, user_id2]  (WRONG)
- student_profiles.parent_id = [parent_user_id1, parent_user_id2]  (WRONG)

After:
- parent_profiles.children_ids = [student_profile_id1, student_profile_id2]  (CORRECT)
- student_profiles.parent_id = [parent_profile_id1, parent_profile_id2]  (CORRECT)
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def run_migration():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)

    with Session() as db:
        try:
            print("[START] Starting Profile ID Reference Migration...")
            print("=" * 60)

            # Step 1: Get all parent profiles with children
            print("\n[STEP 1] Analyzing parent_profiles.children_ids...")
            parents_with_children = db.execute(text("""
                SELECT id, user_id, children_ids
                FROM parent_profiles
                WHERE array_length(children_ids, 1) > 0
            """)).fetchall()

            print(f"   Found {len(parents_with_children)} parent profiles with children")

            for parent in parents_with_children:
                parent_id, parent_user_id, old_children_ids = parent
                print(f"\n   Parent Profile ID: {parent_id} (user_id: {parent_user_id})")
                print(f"   Current children_ids (user_ids): {old_children_ids}")

                # Convert user_ids to student_profile.ids
                new_children_ids = []
                for child_user_id in old_children_ids:
                    # Find student_profile.id for this user_id
                    result = db.execute(text("""
                        SELECT id FROM student_profiles WHERE user_id = :user_id
                    """), {"user_id": child_user_id}).fetchone()

                    if result:
                        new_children_ids.append(result[0])
                        print(f"   - user_id {child_user_id} -> student_profile.id {result[0]}")
                    else:
                        print(f"   - WARNING: No student_profile found for user_id {child_user_id}")

                # Update parent_profiles.children_ids
                if new_children_ids:
                    db.execute(text("""
                        UPDATE parent_profiles
                        SET children_ids = :new_ids, total_children = :total
                        WHERE id = :parent_id
                    """), {
                        "new_ids": new_children_ids,
                        "total": len(new_children_ids),
                        "parent_id": parent_id
                    })
                    print(f"   [OK] Updated children_ids to: {new_children_ids}")

            # Step 2: Get all student profiles with parents
            print("\n[STEP 2] Analyzing student_profiles.parent_id...")
            students_with_parents = db.execute(text("""
                SELECT id, user_id, parent_id
                FROM student_profiles
                WHERE array_length(parent_id, 1) > 0
            """)).fetchall()

            print(f"   Found {len(students_with_parents)} student profiles with parents")

            for student in students_with_parents:
                student_id, student_user_id, old_parent_ids = student
                print(f"\n   Student Profile ID: {student_id} (user_id: {student_user_id})")
                print(f"   Current parent_id (user_ids): {old_parent_ids}")

                # Convert user_ids to parent_profile.ids
                new_parent_ids = []
                for parent_user_id in old_parent_ids:
                    # Find parent_profile.id for this user_id
                    result = db.execute(text("""
                        SELECT id FROM parent_profiles WHERE user_id = :user_id
                    """), {"user_id": parent_user_id}).fetchone()

                    if result:
                        new_parent_ids.append(result[0])
                        print(f"   - user_id {parent_user_id} -> parent_profile.id {result[0]}")
                    else:
                        print(f"   - WARNING: No parent_profile found for user_id {parent_user_id}")

                # Update student_profiles.parent_id
                if new_parent_ids:
                    db.execute(text("""
                        UPDATE student_profiles
                        SET parent_id = :new_ids
                        WHERE id = :student_id
                    """), {
                        "new_ids": new_parent_ids,
                        "student_id": student_id
                    })
                    print(f"   [OK] Updated parent_id to: {new_parent_ids}")

            db.commit()

            print("\n" + "=" * 60)
            print("[SUCCESS] Migration completed successfully!")
            print("\nNew schema:")
            print("   - parent_profiles.children_ids now stores student_profile.id values")
            print("   - student_profiles.parent_id now stores parent_profile.id values")
            print("\nVerifying changes...")

            # Verify
            verify_parents = db.execute(text("""
                SELECT pp.id, pp.children_ids, sp.id as child_profile_id
                FROM parent_profiles pp
                LEFT JOIN student_profiles sp ON sp.id = ANY(pp.children_ids)
                WHERE array_length(pp.children_ids, 1) > 0
            """)).fetchall()

            print("\nParent -> Children mapping:")
            for row in verify_parents:
                print(f"   Parent Profile {row[0]}: children_ids={row[1]}, joined child={row[2]}")

            verify_students = db.execute(text("""
                SELECT sp.id, sp.parent_id, pp.id as parent_profile_id
                FROM student_profiles sp
                LEFT JOIN parent_profiles pp ON pp.id = ANY(sp.parent_id)
                WHERE array_length(sp.parent_id, 1) > 0
            """)).fetchall()

            print("\nStudent -> Parents mapping:")
            for row in verify_students:
                print(f"   Student Profile {row[0]}: parent_id={row[1]}, joined parent={row[2]}")

        except Exception as e:
            db.rollback()
            print(f"\n[ERROR] Migration failed: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
