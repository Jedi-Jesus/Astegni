"""
Seed Campaign Verification Statuses
Populates ad_campaigns table with campaigns in different verification_status:
- pending (requested)
- verified
- rejected
- suspended

Run this script to add realistic test data for campaign verification workflow.
"""

import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import random
import json

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def get_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)

# Ethiopian companies and campaigns
CAMPAIGN_DATA = [
    # PENDING CAMPAIGNS (requested panel)
    {
        "name": "Addis Ababa University Enrollment Drive",
        "description": "Promote 2025 undergraduate enrollment with focus on STEM programs",
        "verification_status": "pending",
        "ad_type": "video",
        "budget": 75000,
        "objective": "student_enrollment",
        "target_audience": ["High School Students", "Parents", "Academic Advisors"],
        "locations": ["Addis Ababa", "Bahir Dar", "Hawassa"],
        "company_name": "Addis Ababa University",
        "industry": "Education",
        "submitted_date": datetime.now() - timedelta(hours=2),
        "submitted_reason": "New semester enrollment campaign targeting high school graduates"
    },
    {
        "name": "Ethio Telecom 5G Launch Campaign",
        "description": "Announce nationwide 5G rollout with special promotional packages",
        "verification_status": "pending",
        "ad_type": "carousel",
        "budget": 150000,
        "objective": "brand_awareness",
        "target_audience": ["Tech Enthusiasts", "Business Professionals", "Urban Youth"],
        "locations": ["Addis Ababa", "Dire Dawa", "Mekelle"],
        "company_name": "Ethio Telecom",
        "industry": "Technology",
        "submitted_date": datetime.now() - timedelta(hours=5),
        "submitted_reason": "Major infrastructure upgrade announcement"
    },
    {
        "name": "Awash Bank Digital Banking Promotion",
        "description": "Drive adoption of mobile banking app with cashback offers",
        "verification_status": "pending",
        "ad_type": "image",
        "budget": 50000,
        "objective": "app_downloads",
        "target_audience": ["Bank Customers", "Mobile Users", "Urban Residents"],
        "locations": ["Addis Ababa", "Adama", "Dessie"],
        "company_name": "Awash International Bank",
        "industry": "Finance",
        "submitted_date": datetime.now() - timedelta(hours=12),
        "submitted_reason": "Digital transformation initiative to increase app downloads"
    },
    {
        "name": "St. Mary's Hospital Health Screening Campaign",
        "description": "Free diabetes and blood pressure screening for World Health Day",
        "verification_status": "pending",
        "ad_type": "image",
        "budget": 30000,
        "objective": "engagement",
        "target_audience": ["Adults 40+", "Health-Conscious Individuals", "Local Community"],
        "locations": ["Addis Ababa"],
        "company_name": "St. Mary's Hospital",
        "industry": "Healthcare",
        "submitted_date": datetime.now() - timedelta(days=1),
        "submitted_reason": "Public health awareness campaign for World Health Day"
    },
    {
        "name": "Habesha Breweries Summer Festival",
        "description": "Promote new beer flavors at annual summer festival event",
        "verification_status": "pending",
        "ad_type": "video",
        "budget": 85000,
        "objective": "conversions",
        "target_audience": ["Adults 25-45", "Event Attendees", "Beer Enthusiasts"],
        "locations": ["Addis Ababa", "Bahir Dar"],
        "company_name": "Habesha Breweries",
        "industry": "Food & Beverage",
        "submitted_date": datetime.now() - timedelta(days=2),
        "submitted_reason": "Annual summer event promotion with new product launch"
    },

    # VERIFIED CAMPAIGNS
    {
        "name": "Ethiopian Airlines New Routes Campaign",
        "description": "Announce new international routes with introductory fares",
        "verification_status": "verified",
        "ad_type": "carousel",
        "budget": 200000,
        "objective": "conversions",
        "target_audience": ["International Travelers", "Business Travelers", "Tourism Industry"],
        "locations": ["Addis Ababa", "Dire Dawa"],
        "company_name": "Ethiopian Airlines",
        "industry": "Transportation",
        "submitted_date": datetime.now() - timedelta(days=10),
        "verified_date": datetime.now() - timedelta(days=9)
    },
    {
        "name": "Safaricom Ethiopia Network Expansion",
        "description": "Celebrate reaching 10 million subscribers milestone",
        "verification_status": "verified",
        "ad_type": "video",
        "budget": 180000,
        "objective": "brand_awareness",
        "target_audience": ["Mobile Users", "Youth", "Urban Residents"],
        "locations": ["Addis Ababa", "Hawassa", "Jimma"],
        "company_name": "Safaricom Ethiopia",
        "industry": "Technology",
        "submitted_date": datetime.now() - timedelta(days=15),
        "verified_date": datetime.now() - timedelta(days=14)
    },
    {
        "name": "Dashen Bank Student Loan Program",
        "description": "Affordable education loans for university students",
        "verification_status": "verified",
        "ad_type": "image",
        "budget": 60000,
        "objective": "lead_generation",
        "target_audience": ["University Students", "Parents", "High School Graduates"],
        "locations": ["Addis Ababa", "Mekelle", "Bahir Dar"],
        "company_name": "Dashen Bank",
        "industry": "Finance",
        "submitted_date": datetime.now() - timedelta(days=20),
        "verified_date": datetime.now() - timedelta(days=19)
    },
    {
        "name": "Zemen Bank SME Support Initiative",
        "description": "Special financing packages for small and medium enterprises",
        "verification_status": "verified",
        "ad_type": "image",
        "budget": 70000,
        "objective": "lead_generation",
        "target_audience": ["Business Owners", "Entrepreneurs", "SME Sector"],
        "locations": ["Addis Ababa", "Adama", "Hawassa"],
        "company_name": "Zemen Bank",
        "industry": "Finance",
        "submitted_date": datetime.now() - timedelta(days=25),
        "verified_date": datetime.now() - timedelta(days=24)
    },
    {
        "name": "Anbessa City Bus New Routes Launch",
        "description": "Introducing 15 new routes across Addis Ababa",
        "verification_status": "verified",
        "ad_type": "image",
        "budget": 40000,
        "objective": "engagement",
        "target_audience": ["Commuters", "Residents", "Students"],
        "locations": ["Addis Ababa"],
        "company_name": "Anbessa City Bus",
        "industry": "Transportation",
        "submitted_date": datetime.now() - timedelta(days=30),
        "verified_date": datetime.now() - timedelta(days=29)
    },

    # REJECTED CAMPAIGNS
    {
        "name": "Miracle Weight Loss Tea - Quick Results",
        "description": "Lose 10kg in 7 days with our herbal tea formula",
        "verification_status": "rejected",
        "ad_type": "image",
        "budget": 25000,
        "objective": "conversions",
        "target_audience": ["Adults", "Health-Conscious"],
        "locations": ["Addis Ababa"],
        "company_name": "Wellness Plus Ltd",
        "industry": "Healthcare",
        "submitted_date": datetime.now() - timedelta(days=8),
        "rejected_date": datetime.now() - timedelta(days=7),
        "rejected_reason": "Unrealistic health claims and misleading advertising. No scientific evidence provided for weight loss claims."
    },
    {
        "name": "Get Rich Quick Investment Scheme",
        "description": "Double your money in 30 days guaranteed returns",
        "verification_status": "rejected",
        "ad_type": "video",
        "budget": 40000,
        "objective": "conversions",
        "target_audience": ["Investors", "Young Professionals"],
        "locations": ["Addis Ababa", "Dire Dawa"],
        "company_name": "Fast Money Ltd",
        "industry": "Finance",
        "submitted_date": datetime.now() - timedelta(days=6),
        "rejected_date": datetime.now() - timedelta(days=5),
        "rejected_reason": "Suspicious financial scheme with unrealistic guarantees. Potential pyramid scheme. Lacks regulatory approval from National Bank of Ethiopia."
    },
    {
        "name": "Luxury Apartments - Misleading Pricing",
        "description": "Premium apartments from 5000 ETB per month",
        "verification_status": "rejected",
        "ad_type": "carousel",
        "budget": 35000,
        "objective": "lead_generation",
        "target_audience": ["House Hunters", "Families"],
        "locations": ["Addis Ababa"],
        "company_name": "Dream Homes Real Estate",
        "industry": "Real Estate",
        "submitted_date": datetime.now() - timedelta(days=4),
        "rejected_date": datetime.now() - timedelta(days=3),
        "rejected_reason": "Misleading pricing information. Advertised rate is for unfurnished studio only, not the luxury apartments shown in images. Bait-and-switch tactics."
    },

    # SUSPENDED CAMPAIGNS
    {
        "name": "Herbal Cure for Chronic Diseases",
        "description": "Natural cure for diabetes, hypertension, and cancer",
        "verification_status": "suspended",
        "ad_type": "video",
        "budget": 50000,
        "objective": "conversions",
        "target_audience": ["Health-Conscious", "Chronic Disease Patients"],
        "locations": ["Addis Ababa", "Bahir Dar"],
        "company_name": "Traditional Medicine Center",
        "industry": "Healthcare",
        "submitted_date": datetime.now() - timedelta(days=35),
        "verified_date": datetime.now() - timedelta(days=34),
        "suspended_date": datetime.now() - timedelta(days=3),
        "suspended_reason": "Multiple complaints received about unverified medical claims. Campaign suspended pending review by Ministry of Health. Violates medical advertising guidelines."
    },
    {
        "name": "Unauthorized University Degree Program",
        "description": "Get accredited bachelor's degree in 6 months online",
        "verification_status": "suspended",
        "ad_type": "image",
        "budget": 45000,
        "objective": "lead_generation",
        "target_audience": ["Working Professionals", "Career Changers"],
        "locations": ["Addis Ababa", "Hawassa"],
        "company_name": "Fast Track Education Ltd",
        "industry": "Education",
        "submitted_date": datetime.now() - timedelta(days=40),
        "verified_date": datetime.now() - timedelta(days=39),
        "suspended_date": datetime.now() - timedelta(days=5),
        "suspended_reason": "Institution lacks proper accreditation from Ministry of Education. Degrees not recognized. Campaign suspended pending verification of credentials."
    },
    {
        "name": "Counterfeit Electronics Sale Event",
        "description": "Brand new iPhones and Samsung phones at 50% off",
        "verification_status": "suspended",
        "ad_type": "carousel",
        "budget": 60000,
        "objective": "conversions",
        "target_audience": ["Tech Enthusiasts", "Smartphone Users"],
        "locations": ["Addis Ababa"],
        "company_name": "Tech Bargains Ltd",
        "industry": "Technology",
        "submitted_date": datetime.now() - timedelta(days=45),
        "verified_date": datetime.now() - timedelta(days=44),
        "suspended_date": datetime.now() - timedelta(days=7),
        "suspended_reason": "User reports of receiving counterfeit products. Investigation ongoing with customs office. Campaign suspended pending legal review."
    }
]

def seed_campaigns():
    """Seed campaigns with different verification statuses"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        print("Starting campaign verification status seeding...")
        print("=" * 60)

        # Create unique users for each advertiser company
        created_users = {}

        for campaign_data in CAMPAIGN_DATA:
            company_name = campaign_data.get("company_name")
            industry = campaign_data.get("industry")

            # Check if advertiser exists
            cursor.execute("""
                SELECT id FROM advertiser_profiles
                WHERE company_name = %s
            """, (company_name,))

            advertiser = cursor.fetchone()

            if not advertiser:
                # Create unique user for this advertiser
                email = f"{company_name.lower().replace(' ', '_')}@astegni.et"

                cursor.execute("""
                    SELECT id FROM users WHERE email = %s
                """, (email,))
                user = cursor.fetchone()

                if not user:
                    # Create user for this company
                    cursor.execute("""
                        INSERT INTO users (first_name, father_name, grandfather_name, email, password_hash, roles, created_at)
                        VALUES (%s, 'Test', 'Advertiser', %s, 'hashed_password', '["advertiser"]', NOW())
                        RETURNING id
                    """, (company_name[:50], email))  # Limit first_name to 50 chars
                    user_id = cursor.fetchone()[0]
                    conn.commit()
                    print(f"[+] Created user for {company_name}")
                else:
                    user_id = user[0]
                    print(f"[*] Using existing user for {company_name}")

                # Create advertiser profile
                cursor.execute("""
                    INSERT INTO advertiser_profiles (
                        user_id, company_name, industry, company_size, created_at
                    ) VALUES (%s, %s, %s, %s, NOW())
                    RETURNING id
                """, (user_id, company_name, industry, "Medium"))
                advertiser_id = cursor.fetchone()[0]
                print(f"[+] Created advertiser: {company_name}")
            else:
                advertiser_id = advertiser[0]
                print(f"[*] Using existing advertiser: {company_name}")

            # Insert campaign - convert Python lists to JSON
            cursor.execute("""
                INSERT INTO ad_campaigns (
                    advertiser_id, name, description, verification_status,
                    is_verified, ad_type, budget, objective, target_audience,
                    locations,
                    rejected_date, rejected_reason,
                    suspended_date, suspended_reason,
                    start_date, end_date, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                )
            """, (
                advertiser_id,
                campaign_data["name"],
                campaign_data["description"],
                campaign_data["verification_status"],
                campaign_data["verification_status"] == "verified",
                campaign_data["ad_type"],
                campaign_data["budget"],
                campaign_data["objective"],
                json.dumps(campaign_data["target_audience"]),  # Convert list to JSON string
                json.dumps(campaign_data["locations"]),  # Convert list to JSON string
                campaign_data.get("rejected_date"),
                campaign_data.get("rejected_reason"),
                campaign_data.get("suspended_date"),
                campaign_data.get("suspended_reason"),
                datetime.now() + timedelta(days=7),  # start_date
                datetime.now() + timedelta(days=37),  # end_date (30 days after start)
            ))

            status_label = {
                "pending": "[PENDING]",
                "verified": "[VERIFIED]",
                "rejected": "[REJECTED]",
                "suspended": "[SUSPENDED]"
            }
            label = status_label.get(campaign_data["verification_status"], "[CAMPAIGN]")
            print(f"{label} Added: {campaign_data['name']}")

        conn.commit()

        # Print summary
        print("\n" + "=" * 60)
        print("Campaign Seeding Summary:")
        print("=" * 60)

        cursor.execute("""
            SELECT verification_status, COUNT(*) as count
            FROM ad_campaigns
            GROUP BY verification_status
            ORDER BY verification_status
        """)

        for row in cursor.fetchall():
            status = row[0]
            count = row[1]
            print(f"{status.upper()}: {count} campaigns")

        print("\n[SUCCESS] Campaign verification status seeding completed!")
        print("\nNext steps:")
        print("  1. Start the backend: cd astegni-backend && python app.py")
        print("  2. Open http://localhost:8080/admin-pages/manage-campaigns.html")
        print("  3. Test panel switching and verification workflows")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Error seeding campaigns: {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    seed_campaigns()
