"""
Seed script to populate advertiser_profiles and ad_campaigns with sample data
Run this after migrate_advertiser_tables.py
"""

import sys
from datetime import date, timedelta
from sqlalchemy.orm import Session
from models import engine, SessionLocal, User, AdvertiserProfile, AdCampaign
import bcrypt

# Sample Ethiopian company names and industries
SAMPLE_ADVERTISERS = [
    {
        "company_name": "EduAds Ethiopia",
        "bio": "Leading educational advertising agency in Ethiopia, specializing in connecting students with quality learning resources.",
        "quote": "Empowering Education Through Strategic Marketing",
        "location": "Addis Ababa, Ethiopia",
        "website": "https://eduads.et",
        "industry": "Education",
        "company_size": "Medium",
        "is_verified": True,
        "is_premium": True,
        "total_budget": 500000,
        "available_budget": 350000,
        "email": "contact@eduads.et",
        "phone": "+251 912 345 678"
    },
    {
        "company_name": "Smart Learning Solutions",
        "bio": "Innovative e-learning platform promoting quality education across Ethiopia with targeted advertising campaigns.",
        "quote": "Your Gateway to Digital Education",
        "location": "Bahir Dar, Ethiopia",
        "website": "https://smartlearning.et",
        "industry": "Technology",
        "company_size": "Small",
        "is_verified": True,
        "is_premium": False,
        "total_budget": 200000,
        "available_budget": 150000,
        "email": "info@smartlearning.et",
        "phone": "+251 918 234 567"
    },
    {
        "company_name": "Ethiopian Education Network",
        "bio": "Connecting students, tutors, and institutions through strategic advertising and content marketing.",
        "quote": "Building Bridges in Education",
        "location": "Mekelle, Ethiopia",
        "website": "https://enet.et",
        "industry": "Education",
        "company_size": "Large",
        "is_verified": True,
        "is_premium": True,
        "total_budget": 800000,
        "available_budget": 600000,
        "email": "hello@enet.et",
        "phone": "+251 914 567 890"
    },
    {
        "company_name": "Habesha Tutors Marketing",
        "bio": "Specialized marketing services for tutors and educational institutions across Ethiopia.",
        "quote": "Amplifying Educational Excellence",
        "location": "Hawassa, Ethiopia",
        "website": "https://habeshatutors.com",
        "industry": "Services",
        "company_size": "Small",
        "is_verified": False,
        "is_premium": False,
        "total_budget": 150000,
        "available_budget": 100000,
        "email": "support@habeshatutors.com",
        "phone": "+251 916 789 012"
    },
    {
        "company_name": "Addis Learning Center",
        "bio": "Premier learning center offering comprehensive courses with targeted student outreach campaigns.",
        "quote": "Excellence in Education Marketing",
        "location": "Addis Ababa, Ethiopia",
        "website": "https://addislearning.et",
        "industry": "Education",
        "company_size": "Medium",
        "is_verified": True,
        "is_premium": True,
        "total_budget": 400000,
        "available_budget": 300000,
        "email": "info@addislearning.et",
        "phone": "+251 911 234 567"
    }
]

# Sample campaign data
SAMPLE_CAMPAIGNS = [
    {
        "name": "Summer Education Drive",
        "description": "Comprehensive summer learning campaign targeting grade 10-12 students",
        "objective": "lead_generation",
        "status": "active",
        "budget": 45000,
        "spent": 32000,
        "daily_budget": 1500,
        "days_offset": -30,  # Started 30 days ago
        "duration": 90,      # 90 days total
        "impressions": 450000,
        "clicks": 28000,
        "conversions": 1250,
        "likes": 18500,
        "shares": 3200,
        "comments": 1840,
        "followers": 2340,
        "ad_type": "video",
        "ad_copy": "Transform your summer into a learning adventure! Join thousands of Ethiopian students excelling in their studies.",
        "call_to_action": "Enroll Now",
        "platforms": ["web", "mobile", "social_media"]
    },
    {
        "name": "Back to School Campaign",
        "description": "Exciting back-to-school promotion for new academic year",
        "objective": "brand_awareness",
        "status": "scheduled",
        "budget": 75000,
        "spent": 0,
        "daily_budget": 2500,
        "days_offset": 30,   # Starts in 30 days
        "duration": 30,
        "impressions": 0,
        "clicks": 0,
        "conversions": 0,
        "likes": 0,
        "shares": 0,
        "comments": 0,
        "followers": 0,
        "ad_type": "carousel",
        "ad_copy": "Get ready for success! Premium tutoring services now available for the new school year.",
        "call_to_action": "Learn More",
        "platforms": ["web", "social_media"]
    },
    {
        "name": "Math Tutoring Promo",
        "description": "Specialized mathematics tutoring campaign for all grade levels",
        "objective": "conversions",
        "status": "active",
        "budget": 25000,
        "spent": 18500,
        "daily_budget": 1000,
        "days_offset": -15,
        "duration": 30,
        "impressions": 280000,
        "clicks": 15000,
        "conversions": 850,
        "likes": 12300,
        "shares": 2100,
        "comments": 980,
        "followers": 1120,
        "ad_type": "image",
        "ad_copy": "Master mathematics with Ethiopia's top tutors. From algebra to calculus, we've got you covered!",
        "call_to_action": "Start Learning",
        "platforms": ["web", "mobile"]
    },
    {
        "name": "Online Learning Platform",
        "description": "Promoting digital learning platform with interactive features",
        "objective": "engagement",
        "status": "completed",
        "budget": 50000,
        "spent": 50000,
        "daily_budget": 1666,
        "days_offset": -60,
        "duration": 30,
        "impressions": 620000,
        "clicks": 45000,
        "conversions": 2100,
        "likes": 28900,
        "shares": 5400,
        "comments": 3200,
        "followers": 3450,
        "ad_type": "video",
        "ad_copy": "Learn anywhere, anytime! Join our interactive online learning community.",
        "call_to_action": "Sign Up",
        "platforms": ["web", "mobile", "social_media"]
    },
    {
        "name": "STEM Workshop Series",
        "description": "Hands-on STEM workshops for high school students",
        "objective": "brand_awareness",
        "status": "draft",
        "budget": 30000,
        "spent": 0,
        "daily_budget": 1000,
        "days_offset": 60,
        "duration": 30,
        "impressions": 0,
        "clicks": 0,
        "conversions": 0,
        "likes": 0,
        "shares": 0,
        "comments": 0,
        "followers": 0,
        "ad_type": "carousel",
        "ad_copy": "Explore Science, Technology, Engineering & Math through hands-on workshops!",
        "call_to_action": "Register",
        "platforms": ["web"]
    },
    {
        "name": "Language Learning App",
        "description": "Mobile app promoting English and Amharic language learning",
        "objective": "conversions",
        "status": "under-review",
        "budget": 40000,
        "spent": 0,
        "daily_budget": 1500,
        "days_offset": 15,
        "duration": 30,
        "impressions": 0,
        "clicks": 0,
        "conversions": 0,
        "likes": 0,
        "shares": 0,
        "comments": 0,
        "followers": 0,
        "ad_type": "video",
        "ad_copy": "Master English and Amharic with our innovative mobile app. Download now!",
        "call_to_action": "Download",
        "platforms": ["mobile"]
    }
]

def seed_advertisers():
    """Create sample advertiser profiles with campaigns"""
    db = SessionLocal()

    try:
        print("Starting advertiser data seeding...")
        print("=" * 60)

        # Check if advertisers already exist
        existing_count = db.query(AdvertiserProfile).count()
        if existing_count > 0:
            print(f"⚠️  Found {existing_count} existing advertiser(s).")
            response = input("Do you want to add more sample data? (y/n): ")
            if response.lower() != 'y':
                print("Seeding cancelled.")
                return

        advertisers_created = 0
        campaigns_created = 0

        for idx, adv_data in enumerate(SAMPLE_ADVERTISERS, 1):
            print(f"\n[{idx}/{len(SAMPLE_ADVERTISERS)}] Creating advertiser: {adv_data['company_name']}")

            # Create user account for advertiser
            email = adv_data.pop('email')
            phone = adv_data.pop('phone')

            # Check if user already exists
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                print(f"  ⚠️  User with email {email} already exists, skipping...")
                continue

            # Hash password
            password_hash = bcrypt.hashpw("advertiser123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            # Create user
            name_parts = adv_data['company_name'].split()
            user = User(
                first_name=name_parts[0],
                father_name=" ".join(name_parts[1:]) if len(name_parts) > 1 else "Company",
                username=email.split('@')[0],
                email=email,
                phone=phone,
                password_hash=password_hash,
                roles=["advertiser"],
                active_role="advertiser",
                is_active=True
            )
            db.add(user)
            db.flush()  # Get user ID

            # Create advertiser profile
            advertiser = AdvertiserProfile(
                user_id=user.id,
                username=email.split('@')[0],
                **adv_data
            )
            db.add(advertiser)
            db.flush()  # Get advertiser ID

            advertisers_created += 1
            print(f"  ✓ Created advertiser profile (ID: {advertiser.id})")

            # Create campaigns for this advertiser (2-3 campaigns per advertiser)
            num_campaigns = min(3, len(SAMPLE_CAMPAIGNS) - campaigns_created)
            campaign_start_idx = campaigns_created

            for camp_idx in range(num_campaigns):
                if campaign_start_idx + camp_idx >= len(SAMPLE_CAMPAIGNS):
                    break

                camp_data = SAMPLE_CAMPAIGNS[campaign_start_idx + camp_idx].copy()

                # Calculate dates
                today = date.today()
                days_offset = camp_data.pop('days_offset')
                duration = camp_data.pop('duration')
                start_date = today + timedelta(days=days_offset)
                end_date = start_date + timedelta(days=duration)

                # Create campaign
                campaign = AdCampaign(
                    advertiser_id=advertiser.id,
                    start_date=start_date,
                    end_date=end_date,
                    **camp_data
                )

                # Calculate metrics
                if campaign.impressions > 0:
                    campaign.ctr = round((campaign.clicks / campaign.impressions) * 100, 2)
                    campaign.engagement_rate = round((campaign.likes / campaign.impressions) * 100, 2)

                if campaign.clicks > 0:
                    campaign.conversion_rate = round((campaign.conversions / campaign.clicks) * 100, 2)
                    campaign.cost_per_click = round(campaign.spent / campaign.clicks, 2)

                if campaign.conversions > 0:
                    campaign.cost_per_conversion = round(campaign.spent / campaign.conversions, 2)

                # Set performance grade
                if campaign.ctr >= 5 and campaign.conversion_rate >= 10:
                    campaign.performance = "excellent"
                elif campaign.ctr >= 3 and campaign.conversion_rate >= 5:
                    campaign.performance = "good"
                elif campaign.ctr >= 1:
                    campaign.performance = "average"
                elif campaign.status in ["draft", "scheduled", "under-review"]:
                    campaign.performance = "pending"
                else:
                    campaign.performance = "poor"

                db.add(campaign)
                campaigns_created += 1

                print(f"    ✓ Created campaign: {campaign.name} ({campaign.status})")

            # Update advertiser statistics
            advertiser_campaigns = db.query(AdCampaign).filter(
                AdCampaign.advertiser_id == advertiser.id
            ).all()

            advertiser.total_campaigns = len(advertiser_campaigns)
            advertiser.active_campaigns = sum(1 for c in advertiser_campaigns if c.status == "active")

            for campaign in advertiser_campaigns:
                advertiser.total_impressions += campaign.impressions
                advertiser.total_clicks += campaign.clicks
                advertiser.total_conversions += campaign.conversions
                advertiser.total_likes += campaign.likes
                advertiser.total_followers += campaign.followers
                advertiser.total_spent += campaign.spent

            # Calculate averages
            if advertiser.total_campaigns > 0:
                total_ctr = sum(c.ctr for c in advertiser_campaigns)
                total_conv_rate = sum(c.conversion_rate for c in advertiser_campaigns)
                advertiser.average_ctr = round(total_ctr / advertiser.total_campaigns, 2)
                advertiser.average_conversion_rate = round(total_conv_rate / advertiser.total_campaigns, 2)

                successful = sum(1 for c in advertiser_campaigns if c.performance in ["excellent", "good"])
                advertiser.success_rate = round((successful / advertiser.total_campaigns) * 100, 2)

            print(f"  ✓ Updated advertiser statistics")

        # Commit all changes
        db.commit()

        print("\n" + "=" * 60)
        print("✅ Seeding completed successfully!")
        print(f"   Advertisers created: {advertisers_created}")
        print(f"   Campaigns created: {campaigns_created}")
        print("\nSample Login Credentials:")
        print("   Email: contact@eduads.et")
        print("   Password: advertiser123")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_advertisers()
