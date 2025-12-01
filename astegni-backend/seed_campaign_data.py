"""
Seed Campaign Data for Manage Campaigns Page
Creates campaigns with various statuses and media (images/videos)
"""

import psycopg
from psycopg.types.json import Jsonb
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import random
import json

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

# Ethiopian company names and campaign types
ETHIOPIAN_COMPANIES = [
    # Education sector
    {"name": "Addis Ababa University Outreach", "industry": "Education", "type": "University"},
    {"name": "Yekatit 12 Hospital Medical Training", "industry": "Healthcare Education", "type": "Institute"},
    {"name": "Ras Dashen Educational Services", "industry": "Education", "type": "Agency"},
    {"name": "Bole International School Enrollment", "industry": "Education", "type": "School"},
    {"name": "Haile Selassie University Program", "industry": "Education", "type": "University"},

    # Tech companies
    {"name": "Gebeya Tech Training Campaign", "industry": "Technology", "type": "Corporate"},
    {"name": "Ethiopian Airlines Digital Services", "industry": "Technology", "type": "Corporate"},
    {"name": "M-Birr Mobile Wallet Promotion", "industry": "Fintech", "type": "Corporate"},
    {"name": "Ride Ethiopia Transportation", "industry": "Technology", "type": "Small Business"},
    {"name": "ZayRide Driver Recruitment", "industry": "Technology", "type": "Small Business"},

    # Retail & Services
    {"name": "Sheger Bookstore Educational Materials", "industry": "Retail", "type": "Small Business"},
    {"name": "Abyssinia Bank Student Loans", "industry": "Finance", "type": "Corporate"},
    {"name": "Awash Insurance Education Coverage", "industry": "Insurance", "type": "Corporate"},
    {"name": "Moha Soft Drinks Brand Campaign", "industry": "FMCG", "type": "Corporate"},
    {"name": "St. George Beer University Partnership", "industry": "Beverage", "type": "Corporate"},

    # Online education
    {"name": "ICog Labs AI Training Program", "industry": "Education Technology", "type": "Agency"},
    {"name": "SoleRebels Global Export Campaign", "industry": "Manufacturing", "type": "Small Business"},
    {"name": "Blue Nile Hotel Conference Packages", "industry": "Hospitality", "type": "Corporate"},
    {"name": "Dashen Bank Youth Banking", "industry": "Finance", "type": "Corporate"},
    {"name": "Safaricom Ethiopia Launch Campaign", "industry": "Telecommunications", "type": "Corporate"},

    # More education focused
    {"name": "Alliance Academy Summer Programs", "industry": "Education", "type": "School"},
    {"name": "Nazareth School Online Classes", "industry": "Education", "type": "School"},
    {"name": "Mekane Yesus Seminary Recruitment", "industry": "Religious Education", "type": "Institute"},
    {"name": "Adama Science University Open Day", "industry": "Education", "type": "University"},
    {"name": "Jimma University Distance Learning", "industry": "Education", "type": "University"},
]

CAMPAIGN_OBJECTIVES = [
    "brand_awareness", "lead_generation", "conversions", "engagement",
    "student_enrollment", "app_downloads", "website_traffic"
]

AD_TYPES = ["image", "video", "carousel", "text"]

LOCATIONS = [
    "Addis Ababa", "Dire Dawa", "Bahir Dar", "Gondar", "Mekelle",
    "Hawassa", "Jimma", "Dessie", "Adama", "Harar"
]

TARGET_AUDIENCES = [
    "students_high_school", "students_university", "parents",
    "teachers", "young_professionals", "business_owners"
]

# Realistic ETB budgets
BUDGET_RANGES = {
    "small": (10000, 50000),      # 10k - 50k ETB
    "medium": (50000, 150000),     # 50k - 150k ETB
    "large": (150000, 500000),     # 150k - 500k ETB
}

REJECTION_REASONS = [
    "Policy Violation - Misleading Content",
    "Incomplete Documentation",
    "Target Audience Mismatch",
    "Budget Below Minimum Threshold",
    "Content Does Not Meet Guidelines",
    "Prohibited Industry Sector",
    "Duplicate Campaign Submission"
]

SUSPENSION_REASONS = [
    "Misleading Content Detected",
    "User Complaints Received",
    "Payment Issues",
    "Performance Concerns",
    "Terms of Service Violation",
    "Under Investigation"
]

def get_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)

def ensure_advertiser_exists(conn, company_data):
    """Ensure advertiser exists for the company, or create one"""
    cursor = conn.cursor()
    try:
        # Check if advertiser with this company name exists
        cursor.execute(
            "SELECT id FROM advertiser_profiles WHERE company_name = %s",
            (company_data["name"],)
        )
        result = cursor.fetchone()

        if result:
            return result[0]

        # Create advertiser for this company
        cursor.execute("""
            INSERT INTO advertiser_profiles
            (user_id, company_name, industry, website, phone_number, verified)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            1,  # Default user_id
            company_data["name"],
            company_data["industry"],
            f"https://{company_data['name'].lower().replace(' ', '')}.com",
            f"+25191{random.randint(1000000, 9999999)}",
            True
        ))
        advertiser_id = cursor.fetchone()[0]
        conn.commit()
        return advertiser_id

    finally:
        cursor.close()

def create_campaign(conn, company_data, status, advertiser_id, index):
    """Create a single campaign"""
    cursor = conn.cursor()

    try:
        # Company name
        company_name = company_data["name"]

        # Campaign name - more specific campaign names
        campaign_names = [
            f"{company_name.split()[0]} Student Enrollment Drive 2025",
            f"{company_name.split()[0]} Digital Marketing Campaign",
            f"Spring Semester Promotion - {company_name.split()[0]}",
            f"{company_name.split()[0]} Brand Awareness Initiative",
            f"Back to School Campaign - {company_name.split()[0]}",
            f"{company_name.split()[0]} Education Excellence Program",
            f"Summer Learning Campaign - {company_name.split()[0]}"
        ]
        campaign_name = random.choice(campaign_names)

        # Campaign objective - more specific
        objective = random.choice(CAMPAIGN_OBJECTIVES)

        # Campaign description - detailed
        description = f"""
This campaign aims to {objective.replace('_', ' ')} through targeted digital marketing across multiple channels.
The campaign will run for {random.randint(30, 90)} days, focusing on the Ethiopian education sector with emphasis
on student enrollment, brand recognition, and community engagement. We will utilize social media platforms,
digital advertising, and content marketing to reach our target audience effectively.
        """.strip()

        # Ad type (image or video)
        ad_type = random.choice(["image", "video"])

        # Target audience - combining multiple segments
        target_audience = random.sample(TARGET_AUDIENCES, k=random.randint(2, 4))

        # Target region - Ethiopian cities
        target_region = random.sample(LOCATIONS, k=random.randint(2, 5))

        # Campaign socials - social media links
        campaign_socials = {
            "facebook": f"https://facebook.com/{company_name.lower().replace(' ', '')}.campaign",
            "instagram": f"https://instagram.com/{company_name.lower().replace(' ', '')}_official",
            "twitter": f"https://twitter.com/{company_name.lower().replace(' ', '')}_et",
            "tiktok": f"https://tiktok.com/@{company_name.lower().replace(' ', '')}official",
            "youtube": f"https://youtube.com/@{company_name.lower().replace(' ', '')}ethiopia"
        }

        # Budget based on company type
        if company_data["type"] == "Corporate":
            budget_range = BUDGET_RANGES["large"]
        elif company_data["type"] == "Agency":
            budget_range = BUDGET_RANGES["medium"]
        else:
            budget_range = BUDGET_RANGES["small"]

        budget = random.uniform(*budget_range)
        daily_budget = budget / random.randint(14, 45)

        # Date ranges
        if status in ["verified", "suspended"]:
            # Active campaigns - started in past, ending in future
            start_date = datetime.now() - timedelta(days=random.randint(1, 30))
            end_date = datetime.now() + timedelta(days=random.randint(30, 90))
        elif status == "rejected":
            # Rejected campaigns - all in the past
            start_date = datetime.now() - timedelta(days=random.randint(5, 60))
            end_date = start_date + timedelta(days=random.randint(30, 90))
        else:  # pending/requested
            # Future campaigns
            start_date = datetime.now() + timedelta(days=random.randint(1, 15))
            end_date = start_date + timedelta(days=random.randint(30, 90))

        # Media URLs (mock data - in production these would be actual file URLs)
        if ad_type == "image":
            creative_urls = [
                f"https://astegni-media.b2cdn.com/campaigns/campaign_{index}_main.jpg",
                f"https://astegni-media.b2cdn.com/campaigns/campaign_{index}_secondary.jpg"
            ]
        else:
            creative_urls = [
                f"https://astegni-media.b2cdn.com/campaigns/campaign_{index}_video.mp4"
            ]

        # Performance metrics (only for verified/suspended campaigns)
        if status in ["verified", "suspended"]:
            impressions = random.randint(5000, 50000)
            clicks = int(impressions * random.uniform(0.02, 0.08))  # 2-8% CTR
            ctr = (clicks / impressions * 100) if impressions > 0 else 0
            conversions = int(clicks * random.uniform(0.05, 0.15))  # 5-15% conversion
            spent = random.uniform(budget * 0.1, budget * 0.7)
        else:
            impressions = 0
            clicks = 0
            ctr = 0
            conversions = 0
            spent = 0

        # Additional fields based on status
        is_verified = status == "verified"

        # Insert campaign with new fields
        cursor.execute("""
            INSERT INTO ad_campaigns (
                advertiser_id, name, description, objective,
                is_verified, verification_status,
                budget, spent, daily_budget, currency,
                start_date, end_date,
                target_audience, locations,
                ad_type, creative_urls,
                impressions, clicks, ctr, conversions,
                created_at, updated_at,
                campaign_socials
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s, %s, %s,
                %s, %s,
                %s
            )
        """, (
            advertiser_id, campaign_name, description, objective,
            is_verified, status,
            budget, spent, daily_budget, "ETB",
            start_date, end_date,
            target_audience, target_region,
            ad_type, creative_urls,
            impressions, clicks, ctr, conversions,
            datetime.now() - timedelta(days=random.randint(1, 30)),  # created_at
            datetime.now() - timedelta(days=random.randint(0, 5)),    # updated_at
            campaign_socials  # JSON field
        ))

        return cursor.rowcount > 0

    except Exception as e:
        print(f"Error creating campaign '{company_data['name']}': {e}")
        return False
    finally:
        cursor.close()

def seed_campaigns():
    """Seed campaigns with various statuses"""
    conn = get_connection()

    try:
        print("=" * 60)
        print("SEEDING CAMPAIGN DATA")
        print("=" * 60)

        # Clear existing campaigns and advertisers (optional - comment out if you want to keep existing)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM ad_campaigns")
        cursor.execute("DELETE FROM advertiser_profiles")
        conn.commit()
        cursor.close()
        print("✓ Cleared existing campaigns and advertisers")

        # Distribution of campaigns by status
        status_distribution = {
            "pending": 15,      # Requested campaigns
            "verified": 45,     # Verified/active campaigns
            "rejected": 8,      # Rejected campaigns
            "suspended": 5      # Suspended campaigns
        }

        total_campaigns = 0
        status_counts = {status: 0 for status in status_distribution.keys()}

        # Shuffle companies for variety
        companies = ETHIOPIAN_COMPANIES.copy()
        random.shuffle(companies)

        # Create campaigns for each status
        company_index = 0
        for status, count in status_distribution.items():
            print(f"\nCreating {count} {status} campaigns...")

            for i in range(count):
                # Wrap around if we run out of companies
                company_data = companies[company_index % len(companies)]
                company_index += 1

                # Ensure advertiser exists for this company
                advertiser_id = ensure_advertiser_exists(conn, company_data)

                success = create_campaign(
                    conn,
                    company_data,
                    status,
                    advertiser_id,
                    total_campaigns + i
                )

                if success:
                    status_counts[status] += 1
                    total_campaigns += 1

            conn.commit()
            print(f"✓ Created {status_counts[status]} {status} campaigns")

        print("\n" + "=" * 60)
        print("CAMPAIGN SEEDING COMPLETE")
        print("=" * 60)
        print(f"Total campaigns created: {total_campaigns}")
        print("\nBreakdown by status:")
        for status, count in status_counts.items():
            print(f"  {status.upper()}: {count}")
        print("\n✓ All campaigns have been seeded successfully!")
        print("✓ Each campaign includes either an image or video")
        print("\n" + "=" * 60)

    except Exception as e:
        print(f"✗ Error during seeding: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    seed_campaigns()
