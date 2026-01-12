"""
Job Board Email Notification Service
Handles sending email notifications for job alerts, application updates, etc.
"""

from email_service import EmailService
from sqlalchemy import text
from datetime import datetime
import logging
from typing import Optional, Dict, Any
import uuid

logger = logging.getLogger(__name__)

class JobEmailService:
    """Service for sending job-related email notifications"""

    def __init__(self, db_session):
        self.db = db_session
        self.email_service = EmailService()

    # ============================================
    # EMAIL QUEUE MANAGEMENT
    # ============================================

    def queue_email(
        self,
        recipient_email: str,
        recipient_name: str,
        subject: str,
        body_html: str,
        email_type: str,
        user_id: Optional[int] = None,
        job_id: Optional[int] = None,
        notification_id: Optional[int] = None,
        priority: int = 5,
        scheduled_for: Optional[datetime] = None
    ) -> int:
        """Add email to sending queue"""

        query = text("""
            INSERT INTO email_queue (
                recipient_email, recipient_name, user_id, subject, body_html,
                body_text, email_type, job_id, notification_id, priority, scheduled_for
            )
            VALUES (
                :recipient_email, :recipient_name, :user_id, :subject, :body_html,
                :body_text, :email_type, :job_id, :notification_id, :priority, :scheduled_for
            )
            RETURNING id, tracking_id
        """)

        # Generate plain text version (simple strip HTML for now)
        body_text = body_html.replace('<br>', '\n').replace('<p>', '').replace('</p>', '\n')

        result = self.db.execute(query, {
            "recipient_email": recipient_email,
            "recipient_name": recipient_name,
            "user_id": user_id,
            "subject": subject,
            "body_html": body_html,
            "body_text": body_text,
            "email_type": email_type,
            "job_id": job_id,
            "notification_id": notification_id,
            "priority": priority,
            "scheduled_for": scheduled_for
        })

        email_id, tracking_id = result.fetchone()
        self.db.commit()

        logger.info(f"Email queued: ID {email_id}, Type: {email_type}, To: {recipient_email}")

        return email_id

    def process_email_queue(self, batch_size: int = 50):
        """Process pending emails in queue"""

        # Get pending emails
        query = text("""
            SELECT id, recipient_email, recipient_name, subject, body_html, body_text, tracking_id
            FROM email_queue
            WHERE status = 'pending'
            AND attempts < max_attempts
            AND (scheduled_for IS NULL OR scheduled_for <= CURRENT_TIMESTAMP)
            ORDER BY priority ASC, created_at ASC
            LIMIT :batch_size
        """)

        result = self.db.execute(query, {"batch_size": batch_size})
        emails = result.fetchall()

        sent_count = 0
        failed_count = 0

        for email in emails:
            email_id, recipient_email, recipient_name, subject, body_html, body_text, tracking_id = email

            try:
                # Update status to sending
                self.db.execute(
                    text("UPDATE email_queue SET status = 'sending', attempts = attempts + 1 WHERE id = :id"),
                    {"id": email_id}
                )
                self.db.commit()

                # Send email (using existing email_service.py)
                success = self.email_service.send_email(
                    to_email=recipient_email,
                    subject=subject,
                    body=body_html,
                    is_html=True
                )

                if success:
                    # Mark as sent
                    self.db.execute(
                        text("UPDATE email_queue SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = :id"),
                        {"id": email_id}
                    )
                    sent_count += 1
                else:
                    # Mark as failed
                    self.db.execute(
                        text("UPDATE email_queue SET status = 'failed', failed_at = CURRENT_TIMESTAMP, error_message = 'Email service returned failure' WHERE id = :id"),
                        {"id": email_id}
                    )
                    failed_count += 1

                self.db.commit()

            except Exception as e:
                logger.error(f"Failed to send email {email_id}: {str(e)}")
                self.db.execute(
                    text("UPDATE email_queue SET status = 'failed', failed_at = CURRENT_TIMESTAMP, error_message = :error WHERE id = :id"),
                    {"id": email_id, "error": str(e)}
                )
                self.db.commit()
                failed_count += 1

        logger.info(f"Email queue processed: {sent_count} sent, {failed_count} failed")

        return {"sent": sent_count, "failed": failed_count}

    # ============================================
    # JOB ALERT EMAILS
    # ============================================

    def send_job_alert_email(self, user_id: int, alert_id: int, matching_jobs: list):
        """Send job alert notification email"""

        # Get user details
        user_query = text("SELECT email, full_name FROM users WHERE id = :user_id")
        user = self.db.execute(user_query, {"user_id": user_id}).fetchone()

        if not user or not user[0]:
            logger.warning(f"User {user_id} has no email address")
            return None

        recipient_email, recipient_name = user

        # Get alert details
        alert_query = text("SELECT alert_name FROM job_alerts WHERE id = :alert_id")
        alert = self.db.execute(alert_query, {"alert_id": alert_id}).fetchone()
        alert_name = alert[0] if alert else "Your Job Alert"

        # Build email HTML
        subject = f"🔔 {len(matching_jobs)} New Job{'s' if len(matching_jobs) > 1 else ''} Match Your Alert: {alert_name}"

        jobs_html = ""
        for job in matching_jobs[:10]:  # Limit to 10 jobs per email
            salary_range = ""
            if job.get('salary_min') and job.get('salary_max'):
                salary_range = f"{job['salary_min']:,} - {job['salary_max']:,} ETB"
            elif job.get('salary_min'):
                salary_range = f"From {job['salary_min']:,} ETB"

            jobs_html += f"""
            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #ffffff;">
                <h3 style="margin: 0 0 8px 0; color: #1e40af;">{job['title']}</h3>
                <p style="margin: 4px 0; color: #666;"><strong>{job.get('company_name', 'Company')}</strong></p>
                <p style="margin: 4px 0; color: #666;">📍 {job.get('location', 'Location not specified')}</p>
                {f'<p style="margin: 4px 0; color: #666;">💰 {salary_range}</p>' if salary_range else ''}
                <p style="margin: 4px 0; color: #666;">🕐 {job.get('job_type', 'Full-time')}</p>
                <a href="https://astegni.com/jobs/{job['id']}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">View Job</a>
            </div>
            """

        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #3b82f6; margin-bottom: 10px;">🎯 New Job Matches!</h1>
                <p style="color: #666; font-size: 16px;">We found {len(matching_jobs)} new job{'s' if len(matching_jobs) > 1 else ''} matching your alert: <strong>{alert_name}</strong></p>
            </div>

            {jobs_html}

            {f'<p style="text-align: center; color: #666; margin-top: 20px;">+ {len(matching_jobs) - 10} more jobs available on Astegni</p>' if len(matching_jobs) > 10 else ''}

            <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 15px 0;">Want to refine your job alerts?</p>
                <a href="https://astegni.com/profile/job-alerts" style="display: inline-block; padding: 10px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Manage Alerts</a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
                <p>You're receiving this because you created a job alert on Astegni.</p>
                <p><a href="https://astegni.com/profile/notification-preferences" style="color: #3b82f6;">Update notification preferences</a></p>
            </div>
        </body>
        </html>
        """

        return self.queue_email(
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            subject=subject,
            body_html=body_html,
            email_type="job_alert",
            user_id=user_id,
            priority=3  # High priority
        )

    # ============================================
    # APPLICATION STATUS EMAILS
    # ============================================

    def send_application_received_email(self, advertiser_id: int, job_id: int, applicant_name: str):
        """Send email to advertiser when new application received"""

        # Get advertiser details
        user_query = text("""
            SELECT u.email, u.full_name
            FROM users u
            WHERE u.id = :advertiser_id
        """)
        user = self.db.execute(user_query, {"advertiser_id": advertiser_id}).fetchone()

        if not user or not user[0]:
            return None

        recipient_email, recipient_name = user

        # Get job details
        job_query = text("SELECT title FROM job_posts WHERE id = :job_id")
        job = self.db.execute(job_query, {"job_id": job_id}).fetchone()
        job_title = job[0] if job else "Your Job Post"

        subject = f"📬 New Application for {job_title}"

        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10b981; margin-bottom: 10px;">🎉 New Application Received!</h1>
            </div>

            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background: #ffffff;">
                <p style="font-size: 16px; margin-bottom: 15px;">
                    <strong>{applicant_name}</strong> has applied for your job posting:
                </p>
                <h3 style="color: #1e40af; margin: 10px 0;">{job_title}</h3>
            </div>

            <div style="margin-top: 30px; text-align: center;">
                <a href="https://astegni.com/advertiser-profile?panel=job-board&tab=applications&job={job_id}" style="display: inline-block; padding: 12px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Review Application</a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
                <p><a href="https://astegni.com/profile/notification-preferences" style="color: #3b82f6;">Update notification preferences</a></p>
            </div>
        </body>
        </html>
        """

        return self.queue_email(
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            subject=subject,
            body_html=body_html,
            email_type="application_status",
            user_id=advertiser_id,
            job_id=job_id,
            priority=4
        )

    def send_application_status_change_email(self, applicant_id: int, job_id: int, new_status: str):
        """Send email to applicant when application status changes"""

        # Get applicant details
        user_query = text("SELECT email, full_name FROM users WHERE id = :applicant_id")
        user = self.db.execute(user_query, {"applicant_id": applicant_id}).fetchone()

        if not user or not user[0]:
            return None

        recipient_email, recipient_name = user

        # Get job details
        job_query = text("SELECT title, company_name FROM job_posts WHERE id = :job_id")
        job = self.db.execute(job_query, {"job_id": job_id}).fetchone()
        job_title, company_name = job if job else ("Job Post", "Company")

        # Status-specific messaging
        status_messages = {
            "reviewing": {
                "emoji": "👀",
                "title": "Application Under Review",
                "message": "Your application is currently being reviewed by the hiring team.",
                "color": "#3b82f6"
            },
            "shortlisted": {
                "emoji": "⭐",
                "title": "You've Been Shortlisted!",
                "message": "Congratulations! You've been shortlisted for the next stage of the hiring process.",
                "color": "#10b981"
            },
            "interview_scheduled": {
                "emoji": "📅",
                "title": "Interview Scheduled",
                "message": "The employer has scheduled an interview with you. Check your application for details.",
                "color": "#8b5cf6"
            },
            "rejected": {
                "emoji": "😔",
                "title": "Application Update",
                "message": "Thank you for your interest. Unfortunately, we've decided to move forward with other candidates.",
                "color": "#ef4444"
            },
            "hired": {
                "emoji": "🎊",
                "title": "Congratulations! You Got the Job!",
                "message": "We're excited to offer you the position. The employer will contact you with next steps.",
                "color": "#10b981"
            }
        }

        status_info = status_messages.get(new_status, status_messages["reviewing"])

        subject = f"{status_info['emoji']} {status_info['title']} - {job_title}"

        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: {status_info['color']}; margin-bottom: 10px;">{status_info['emoji']} {status_info['title']}</h1>
            </div>

            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background: #ffffff;">
                <h3 style="color: #1e40af; margin-top: 0;">{job_title}</h3>
                <p style="color: #666; margin: 5px 0;"><strong>{company_name}</strong></p>
                <p style="font-size: 16px; margin-top: 20px;">{status_info['message']}</p>
            </div>

            <div style="margin-top: 30px; text-align: center;">
                <a href="https://astegni.com/profile/applications" style="display: inline-block; padding: 12px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Application</a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
                <p><a href="https://astegni.com/profile/notification-preferences" style="color: #3b82f6;">Update notification preferences</a></p>
            </div>
        </body>
        </html>
        """

        return self.queue_email(
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            subject=subject,
            body_html=body_html,
            email_type="application_status",
            user_id=applicant_id,
            job_id=job_id,
            priority=3
        )

    # ============================================
    # DEADLINE REMINDER EMAILS
    # ============================================

    def send_deadline_reminder_email(self, advertiser_id: int, job_id: int, days_remaining: int):
        """Send deadline reminder to advertiser"""

        # Get advertiser details
        user_query = text("SELECT email, full_name FROM users WHERE id = :advertiser_id")
        user = self.db.execute(user_query, {"advertiser_id": advertiser_id}).fetchone()

        if not user or not user[0]:
            return None

        recipient_email, recipient_name = user

        # Get job details
        job_query = text("""
            SELECT title, application_deadline,
                   (SELECT COUNT(*) FROM job_applications WHERE job_id = :job_id) as application_count
            FROM job_posts
            WHERE id = :job_id
        """)
        job = self.db.execute(job_query, {"job_id": job_id}).fetchone()
        job_title, deadline, application_count = job if job else ("Job Post", None, 0)

        subject = f"⏰ Reminder: {job_title} closes in {days_remaining} day{'s' if days_remaining > 1 else ''}"

        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #f59e0b; margin-bottom: 10px;">⏰ Deadline Reminder</h1>
            </div>

            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background: #ffffff;">
                <h3 style="color: #1e40af; margin-top: 0;">{job_title}</h3>
                <p style="font-size: 16px; margin: 15px 0;">
                    Your job posting closes in <strong>{days_remaining} day{'s' if days_remaining > 1 else ''}</strong>.
                </p>
                <p style="font-size: 16px; color: #666;">
                    📅 Deadline: {deadline.strftime('%B %d, %Y') if deadline else 'Not set'}<br>
                    📬 Applications received: <strong>{application_count}</strong>
                </p>
            </div>

            <div style="margin-top: 30px; text-align: center;">
                <a href="https://astegni.com/advertiser-profile?panel=job-board&tab=applications&job={job_id}" style="display: inline-block; padding: 12px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Review Applications</a>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #92400e;">Need more time? You can extend the deadline from your job board dashboard.</p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
                <p><a href="https://astegni.com/profile/notification-preferences" style="color: #3b82f6;">Update notification preferences</a></p>
            </div>
        </body>
        </html>
        """

        return self.queue_email(
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            subject=subject,
            body_html=body_html,
            email_type="deadline_reminder",
            user_id=advertiser_id,
            job_id=job_id,
            priority=5
        )
