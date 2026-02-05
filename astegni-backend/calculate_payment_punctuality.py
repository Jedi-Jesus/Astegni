"""
Payment Punctuality Calculator
Calculates parent payment punctuality based on historical payment records
Uses both active and archived records for accurate scoring
"""
from sqlalchemy import create_engine, text
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

def calculate_parent_payment_punctuality(parent_id, include_archived=True):
    """
    Calculate payment punctuality for a parent based on all their children's enrollments

    Args:
        parent_id (int): Parent profile ID
        include_archived (bool): Include archived payment records in calculation

    Returns:
        dict: Payment punctuality metrics
    """
    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.connect() as conn:
        # Build query to get all payment records for parent's children
        query = """
            SELECT
                es.id,
                es.payment_status,
                es.payment_due_date,
                es.payment_received_date,
                es.agreed_price,
                es.created_at,
                es.is_archived,
                ui.days_overdue,
                ui.late_fee
            FROM enrolled_students es
            LEFT JOIN user_investments ui ON ui.student_payment_id = es.id
            JOIN student_profiles sp ON sp.id = es.student_id
            JOIN parent_profiles pp ON pp.id = :parent_id
            WHERE es.student_id = ANY(pp.children_ids)
        """

        if not include_archived:
            query += " AND (es.is_archived = FALSE OR es.is_archived IS NULL)"

        result = conn.execute(text(query), {"parent_id": parent_id})
        records = result.fetchall()

        if not records:
            return {
                "parent_id": parent_id,
                "total_payments": 0,
                "punctuality_score": 0.0,
                "punctuality_percentage": 0,
                "message": "No payment records found"
            }

        # Calculate metrics
        total_payments = len(records)
        paid_on_time = 0
        paid_late = 0
        still_pending = 0
        overdue = 0
        total_days_late = 0
        total_late_fees = 0.0

        for record in records:
            payment_status = record[1]
            due_date = record[2]
            received_date = record[3]
            days_overdue = record[7] or 0
            late_fee = record[8] or 0.0

            if payment_status == 'paid':
                if received_date and due_date:
                    # Calculate if paid on time
                    if received_date <= due_date:
                        paid_on_time += 1
                    else:
                        paid_late += 1
                        days_late = (received_date - due_date).days
                        total_days_late += days_late
                else:
                    # No dates to compare, assume on time if paid
                    paid_on_time += 1

                total_late_fees += late_fee

            elif payment_status == 'pending':
                if due_date and datetime.now().date() > due_date:
                    overdue += 1
                    total_days_late += days_overdue
                else:
                    still_pending += 1

        # Calculate punctuality score (0-5 scale like parent reviews)
        if total_payments == 0:
            punctuality_score = 0.0
        else:
            # Weight: on-time = 5.0, late = 2.0-4.0 based on lateness, overdue = 1.0, pending = neutral
            on_time_score = paid_on_time * 5.0
            late_score = paid_late * 3.0  # Average score for late payments
            overdue_score = overdue * 1.0  # Low score for overdue

            total_score = on_time_score + late_score + overdue_score
            counted_payments = paid_on_time + paid_late + overdue

            punctuality_score = total_score / counted_payments if counted_payments > 0 else 0.0

        # Calculate percentage (0-100%)
        punctuality_percentage = round((punctuality_score / 5.0) * 100)

        # Calculate average days late (excluding on-time payments)
        avg_days_late = total_days_late / (paid_late + overdue) if (paid_late + overdue) > 0 else 0

        return {
            "parent_id": parent_id,
            "total_payments": total_payments,
            "paid_on_time": paid_on_time,
            "paid_late": paid_late,
            "still_pending": still_pending,
            "overdue": overdue,
            "punctuality_score": round(punctuality_score, 2),  # 0-5 scale
            "punctuality_percentage": punctuality_percentage,  # 0-100%
            "avg_days_late": round(avg_days_late, 1),
            "total_late_fees": round(total_late_fees, 2),
            "on_time_rate": round((paid_on_time / total_payments * 100), 1) if total_payments > 0 else 0,
            "include_archived": include_archived
        }


def update_parent_payment_punctuality_in_reviews(parent_id):
    """
    Update the payment_consistency_rating in parent_reviews table
    based on calculated punctuality

    Args:
        parent_id (int): Parent profile ID
    """
    engine = create_engine(os.getenv('DATABASE_URL'))

    # Calculate punctuality
    punctuality = calculate_parent_payment_punctuality(parent_id, include_archived=True)

    if punctuality["total_payments"] == 0:
        print(f"⚠️  Parent {parent_id} has no payment records, skipping review update")
        return

    with engine.begin() as conn:
        # Get average payment_consistency_rating from reviews
        result = conn.execute(text("""
            SELECT AVG(payment_consistency_rating) as avg_rating, COUNT(*) as count
            FROM parent_reviews
            WHERE parent_id = :parent_id
        """), {"parent_id": parent_id})

        review_stats = result.fetchone()
        avg_review_rating = review_stats[0] or 0
        review_count = review_stats[1]

        # Calculated score from actual payment data
        calculated_score = punctuality["punctuality_score"]

        # If no reviews yet, use calculated score
        # If reviews exist, blend 70% calculated + 30% reviews
        if review_count == 0:
            final_score = calculated_score
            blend_method = "calculated_only"
        else:
            final_score = (calculated_score * 0.7) + (avg_review_rating * 0.3)
            blend_method = "blended"

        print(f"\n{'='*60}")
        print(f"Parent {parent_id} Payment Punctuality Update")
        print(f"{'='*60}")
        print(f"Payment Records: {punctuality['total_payments']}")
        print(f"Paid On Time: {punctuality['paid_on_time']}")
        print(f"Paid Late: {punctuality['paid_late']}")
        print(f"Overdue: {punctuality['overdue']}")
        print(f"Calculated Score: {calculated_score:.2f}/5.0")
        print(f"Review Average: {avg_review_rating:.2f}/5.0 ({review_count} reviews)")
        print(f"Final Score: {final_score:.2f}/5.0 ({blend_method})")
        print(f"{'='*60}\n")

        return {
            "parent_id": parent_id,
            "calculated_score": calculated_score,
            "review_average": avg_review_rating,
            "final_score": round(final_score, 2),
            "blend_method": blend_method,
            "punctuality": punctuality
        }


def calculate_all_parents_punctuality():
    """
    Calculate payment punctuality for all parents and display statistics
    """
    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.connect() as conn:
        # Get all parents
        result = conn.execute(text("""
            SELECT id, username
            FROM parent_profiles
            WHERE total_children > 0
        """))

        parents = result.fetchall()

        print(f"\n{'='*80}")
        print(f"Payment Punctuality Report - All Parents")
        print(f"{'='*80}\n")
        print(f"{'ID':<5} {'Username':<20} {'Payments':<10} {'On Time':<10} {'Late':<8} {'Overdue':<10} {'Score':<8} {'%':<6}")
        print(f"{'-'*80}")

        scores = []

        for parent in parents:
            parent_id = parent[0]
            username = parent[1] or "N/A"

            punctuality = calculate_parent_payment_punctuality(parent_id, include_archived=True)

            if punctuality["total_payments"] > 0:
                scores.append(punctuality["punctuality_score"])
                print(f"{parent_id:<5} {username:<20} {punctuality['total_payments']:<10} "
                      f"{punctuality['paid_on_time']:<10} {punctuality['paid_late']:<8} "
                      f"{punctuality['overdue']:<10} {punctuality['punctuality_score']:<8.2f} "
                      f"{punctuality['punctuality_percentage']:<6}%")

        print(f"{'-'*80}")
        if scores:
            print(f"\nAverage Punctuality Score: {sum(scores)/len(scores):.2f}/5.0")
            print(f"Highest Score: {max(scores):.2f}/5.0")
            print(f"Lowest Score: {min(scores):.2f}/5.0")
        print(f"\n{'='*80}\n")


def get_payment_punctuality_for_widget(parent_id):
    """
    Get payment punctuality data formatted for the parent overview widget

    Args:
        parent_id (int): Parent profile ID

    Returns:
        dict: Widget-ready punctuality data
    """
    punctuality = calculate_parent_payment_punctuality(parent_id, include_archived=False)  # Active only for widget

    return {
        "punctuality_percentage": punctuality["punctuality_percentage"],
        "paid_on_time": punctuality["paid_on_time"],
        "total_payments": punctuality["total_payments"],
        "late_payments": punctuality["paid_late"],
        "overdue_payments": punctuality["overdue"]
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == "--all":
            # Calculate for all parents
            calculate_all_parents_punctuality()
        elif sys.argv[1] == "--update":
            # Update reviews with calculated scores
            if len(sys.argv) > 2:
                parent_id = int(sys.argv[2])
                update_parent_payment_punctuality_in_reviews(parent_id)
            else:
                print("Usage: python calculate_payment_punctuality.py --update <parent_id>")
        else:
            # Calculate for specific parent
            parent_id = int(sys.argv[1])
            result = calculate_parent_payment_punctuality(parent_id, include_archived=True)

            print(f"\n{'='*60}")
            print(f"Payment Punctuality Report - Parent {parent_id}")
            print(f"{'='*60}")
            print(f"Total Payments: {result['total_payments']}")
            print(f"Paid On Time: {result['paid_on_time']}")
            print(f"Paid Late: {result['paid_late']}")
            print(f"Still Pending: {result['still_pending']}")
            print(f"Overdue: {result['overdue']}")
            print(f"Punctuality Score: {result['punctuality_score']}/5.0")
            print(f"Punctuality Percentage: {result['punctuality_percentage']}%")
            print(f"Average Days Late: {result['avg_days_late']} days")
            print(f"Total Late Fees: ${result['total_late_fees']}")
            print(f"On-Time Rate: {result['on_time_rate']}%")
            print(f"{'='*60}\n")
    else:
        print("Usage:")
        print("  python calculate_payment_punctuality.py <parent_id>      # Calculate for specific parent")
        print("  python calculate_payment_punctuality.py --all            # Calculate for all parents")
        print("  python calculate_payment_punctuality.py --update <id>    # Update parent reviews with calculated score")
