"""
Populate email configuration table with current working settings
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def populate_email_config():
    """Insert current working email configuration into database"""

    DATABASE_URL = os.getenv('DATABASE_URL')

    # Get current email settings from .env
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_user = os.getenv('SMTP_USER', 'noreplay@astegni.com')
    smtp_password = os.getenv('SMTP_PASSWORD', '')
    from_email = os.getenv('FROM_EMAIL', 'noreplay@astegni.com')
    from_name = os.getenv('FROM_NAME', 'Astegni Educational Platform')

    print("="*60)
    print("Populating Email Configuration Table")
    print("="*60)
    print(f"SMTP Host: {smtp_host}")
    print(f"SMTP Port: {smtp_port}")
    print(f"SMTP Username: {smtp_user}")
    print(f"From Email: {from_email}")
    print(f"From Name: {from_name}")
    print(f"Password: {'*' * len(smtp_password) if smtp_password else '(NOT SET)'}")
    print("="*60)

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Insert email configuration
        cursor.execute("""
            INSERT INTO system_email_config (
                id, smtp_host, smtp_port, smtp_username, smtp_password,
                smtp_encryption, from_email, from_name, reply_to_email,
                daily_limit, enabled
            ) VALUES (
                1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                smtp_host = EXCLUDED.smtp_host,
                smtp_port = EXCLUDED.smtp_port,
                smtp_username = EXCLUDED.smtp_username,
                smtp_password = EXCLUDED.smtp_password,
                smtp_encryption = EXCLUDED.smtp_encryption,
                from_email = EXCLUDED.from_email,
                from_name = EXCLUDED.from_name,
                reply_to_email = EXCLUDED.reply_to_email,
                daily_limit = EXCLUDED.daily_limit,
                enabled = EXCLUDED.enabled,
                updated_at = CURRENT_TIMESTAMP
        """, (
            smtp_host,           # smtp_host
            smtp_port,           # smtp_port
            smtp_user,           # smtp_username
            smtp_password,       # smtp_password (App Password)
            'TLS',              # smtp_encryption
            from_email,         # from_email
            from_name,          # from_name
            '',                 # reply_to_email (empty - noreply address)
            2000,               # daily_limit (Google Workspace limit)
            True                # enabled
        ))

        conn.commit()

        print("\n✓ Email configuration inserted successfully!")

        # Verify insertion
        cursor.execute("SELECT * FROM system_email_config WHERE id = 1")
        row = cursor.fetchone()

        if row:
            print("\n" + "="*60)
            print("Verification - Data in Database:")
            print("="*60)
            print(f"ID: {row[0]}")
            print(f"SMTP Host: {row[1]}")
            print(f"SMTP Port: {row[2]}")
            print(f"SMTP Username: {row[3]}")
            print(f"SMTP Password: {'*' * 16}")  # Don't show actual password
            print(f"Encryption: {row[5]}")
            print(f"From Email: {row[6]}")
            print(f"From Name: {row[7]}")
            print(f"Daily Limit: {row[9]}")
            print(f"Enabled: {row[10]}")
            print("="*60)

        return True

    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    success = populate_email_config()
    if success:
        print("\n✓ Email configuration is now stored in the database!")
        print("✓ The admin panel will now show your current email settings!")
    else:
        print("\n✗ Failed to populate email configuration")
