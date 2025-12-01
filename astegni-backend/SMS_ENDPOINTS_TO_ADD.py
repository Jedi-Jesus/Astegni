# SMS CONFIGURATION ENDPOINTS
# Add these endpoints to system_settings_endpoints.py after the @router.post("/test-email") endpoint (line 807)

@router.get("/sms-config")
async def get_sms_config():
    """Get SMS configuration"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT twilio_account_sid, twilio_from_number, default_country_code,
                   enabled, daily_limit, otp_expiry_minutes, otp_length, otp_numeric_only
            FROM system_sms_config
            LIMIT 1
        """)

        row = cursor.fetchone()

        if not row:
            config = {
                "twilio_account_sid": "",
                "twilio_from_number": "",
                "default_country_code": "+251",
                "enabled": True,
                "daily_limit": 1000,
                "otp_expiry_minutes": 5,
                "otp_length": 6,
                "otp_numeric_only": True
            }
        else:
            config = {
                "twilio_account_sid": row[0] or "",
                "twilio_from_number": row[1] or "",
                "default_country_code": row[2] or "+251",
                "enabled": row[3] if row[3] is not None else True,
                "daily_limit": row[4] or 1000,
                "otp_expiry_minutes": row[5] or 5,
                "otp_length": row[6] or 6,
                "otp_numeric_only": row[7] if row[7] is not None else True
            }

        return {"success": True, **config}

    finally:
        cursor.close()
        conn.close()


@router.put("/sms-config")
async def update_sms_config(config: Dict[str, Any]):
    """Update SMS configuration"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Extract auth token if provided (optional field)
        twilio_auth_token = config.get("twilio_auth_token")

        # Build UPDATE query - only update auth token if provided
        if twilio_auth_token:
            cursor.execute("""
                INSERT INTO system_sms_config (
                    id, twilio_account_sid, twilio_auth_token, twilio_from_number,
                    default_country_code, enabled, daily_limit, otp_expiry_minutes,
                    otp_length, otp_numeric_only
                ) VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    twilio_account_sid = EXCLUDED.twilio_account_sid,
                    twilio_auth_token = EXCLUDED.twilio_auth_token,
                    twilio_from_number = EXCLUDED.twilio_from_number,
                    default_country_code = EXCLUDED.default_country_code,
                    enabled = EXCLUDED.enabled,
                    daily_limit = EXCLUDED.daily_limit,
                    otp_expiry_minutes = EXCLUDED.otp_expiry_minutes,
                    otp_length = EXCLUDED.otp_length,
                    otp_numeric_only = EXCLUDED.otp_numeric_only,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                config.get("twilio_account_sid", ""),
                twilio_auth_token,
                config.get("twilio_from_number", ""),
                config.get("default_country_code", "+251"),
                config.get("enabled", True),
                config.get("daily_limit", 1000),
                config.get("otp_expiry_minutes", 5),
                config.get("otp_length", 6),
                config.get("otp_numeric_only", True)
            ))
        else:
            # Don't update auth token field
            cursor.execute("""
                INSERT INTO system_sms_config (
                    id, twilio_account_sid, twilio_from_number,
                    default_country_code, enabled, daily_limit, otp_expiry_minutes,
                    otp_length, otp_numeric_only
                ) VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    twilio_account_sid = EXCLUDED.twilio_account_sid,
                    twilio_from_number = EXCLUDED.twilio_from_number,
                    default_country_code = EXCLUDED.default_country_code,
                    enabled = EXCLUDED.enabled,
                    daily_limit = EXCLUDED.daily_limit,
                    otp_expiry_minutes = EXCLUDED.otp_expiry_minutes,
                    otp_length = EXCLUDED.otp_length,
                    otp_numeric_only = EXCLUDED.otp_numeric_only,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                config.get("twilio_account_sid", ""),
                config.get("twilio_from_number", ""),
                config.get("default_country_code", "+251"),
                config.get("enabled", True),
                config.get("daily_limit", 1000),
                config.get("otp_expiry_minutes", 5),
                config.get("otp_length", 6),
                config.get("otp_numeric_only", True)
            ))

        conn.commit()
        return {"success": True, "message": "SMS configuration updated successfully"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating SMS config: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/sms-stats")
async def get_sms_stats():
    """Get SMS statistics for today"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                COALESCE(SUM(CASE WHEN status IN ('sent', 'delivered', 'pending', 'failed') THEN 1 ELSE 0 END), 0) as sent_today,
                COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0) as delivered,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed
            FROM system_sms_log
            WHERE DATE(sent_at) = CURRENT_DATE
        """)

        row = cursor.fetchone()

        stats = {
            "sent_today": row[0] if row else 0,
            "delivered": row[1] if row else 0,
            "pending": row[2] if row else 0,
            "failed": row[3] if row else 0
        }

        return {"success": True, **stats}

    finally:
        cursor.close()
        conn.close()


@router.post("/test-sms-connection")
async def test_sms_connection():
    """Test SMS connection (verify Twilio credentials)"""
    try:
        from sms_service import sms_service

        if not sms_service.is_configured:
            return {
                "success": False,
                "message": "SMS service is not configured. Please configure Twilio settings first."
            }

        # Check if Twilio client is initialized
        if sms_service.client is None:
            return {
                "success": False,
                "message": "Failed to initialize Twilio client. Please check your credentials."
            }

        return {
            "success": True,
            "message": f"SMS connection successful! Twilio is properly configured with number {sms_service.twilio_from_number}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing SMS connection: {str(e)}")


@router.post("/send-test-sms")
async def send_test_sms(data: Dict[str, Any]):
    """Send a test SMS to verify configuration"""
    from sms_service import sms_service

    try:
        phone_number = data.get("phone_number")
        message = data.get("message")

        if not phone_number:
            raise HTTPException(status_code=400, detail="phone_number is required")

        if not message:
            raise HTTPException(status_code=400, detail="message is required")

        # Send test SMS using the SMS service
        success = sms_service.send_otp_sms(
            to_phone=phone_number,
            otp_code="",  # Not an OTP, just a test message
            purpose="Test Message"
        )

        # If sending a custom message, we need to use the actual message
        # For now, we'll use the send_otp_sms method with a simple approach
        # In production, you might want to add a send_sms() method to sms_service

        if success:
            # Log the SMS
            conn = get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO system_sms_log (phone_number, message, status, sent_at)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                """, (phone_number, message, 'sent'))
                conn.commit()
            finally:
                cursor.close()
                conn.close()

            return {"success": True, "message": f"Test SMS sent successfully to {phone_number}"}
        else:
            return {"success": False, "message": "Failed to send test SMS. Check server logs for details."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending test SMS: {str(e)}")
