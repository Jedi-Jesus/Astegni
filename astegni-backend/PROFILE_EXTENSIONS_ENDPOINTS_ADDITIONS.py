# ============================================
# INDIVIDUAL GET AND UPDATE ENDPOINTS
# Add these to tutor_profile_extensions_endpoints.py
# ============================================

# Individual Certification Endpoints
@router.get("/api/tutor/certifications/{certification_id}")
async def get_certification(
    certification_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a single certification by ID"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id, name, description, issuing_organization,
                    credential_id, credential_url, issue_date, expiry_date,
                    certificate_type, field_of_study, certificate_image_url,
                    is_verified, is_active, created_at, verification_status
                FROM tutor_certificates
                WHERE id = %s AND tutor_id = %s
            """, (certification_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Certification not found")

            return {
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'issuing_organization': row[3],
                'credential_id': row[4],
                'credential_url': row[5],
                'issue_date': row[6].isoformat() if row[6] else None,
                'expiry_date': row[7].isoformat() if row[7] else None,
                'certificate_type': row[8],
                'field_of_study': row[9],
                'certificate_image_url': row[10],
                'is_verified': row[11],
                'is_active': row[12],
                'created_at': row[13].isoformat() if row[13] else None,
                'verification_status': row[14]
            }
    finally:
        conn.close()


@router.put("/api/tutor/certifications/{certification_id}")
async def update_certification(
    certification_id: int,
    name: str = Form(...),
    issuing_organization: str = Form(...),
    description: Optional[str] = Form(None),
    credential_id: Optional[str] = Form(None),
    credential_url: Optional[str] = Form(None),
    issue_date: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    certificate_type: Optional[str] = Form("certification"),
    field_of_study: Optional[str] = Form(None),
    certificate_image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Update a certification"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Verify ownership and get existing data
            cur.execute("""
                SELECT id, certificate_image_url FROM tutor_certificates
                WHERE id = %s AND tutor_id = %s
            """, (certification_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Certification not found or unauthorized")

            # Handle file upload if provided
            certificate_image_url = row[1]  # Keep existing if no new file
            if certificate_image and certificate_image.filename:
                # Delete old file from Backblaze if exists
                if certificate_image_url:
                    try:
                        b2_service.delete_file(certificate_image_url)
                    except Exception as e:
                        print(f"Warning: Could not delete old file: {e}")

                # Upload new file
                try:
                    file_data = await certificate_image.read()
                    certificate_image_url = b2_service.upload_file(
                        file_data,
                        certificate_image.filename,
                        'certifications',
                        current_user['id']
                    )
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

            # Update certification
            cur.execute("""
                UPDATE tutor_certificates
                SET name = %s, issuing_organization = %s, description = %s,
                    credential_id = %s, credential_url = %s, issue_date = %s,
                    expiry_date = %s, certificate_type = %s, field_of_study = %s,
                    certificate_image_url = %s, updated_at = NOW()
                WHERE id = %s
            """, (
                name, issuing_organization, description, credential_id, credential_url,
                issue_date if issue_date else None,
                expiry_date if expiry_date else None,
                certificate_type, field_of_study, certificate_image_url,
                certification_id
            ))

            conn.commit()
            return {'message': 'Certification updated successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update certification: {str(e)}")
    finally:
        conn.close()


# Individual Achievement Endpoints
@router.get("/api/tutor/achievements/{achievement_id}")
async def get_achievement(
    achievement_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a single achievement by ID"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id, title, description, category, icon, color,
                    year, date_achieved, issuer, verification_url,
                    is_featured, display_order, created_at, certificate_url,
                    is_verified, verification_status, rejection_reason, verified_at
                FROM tutor_achievements
                WHERE id = %s AND tutor_id = %s
            """, (achievement_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Achievement not found")

            return {
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'category': row[3],
                'icon': row[4],
                'color': row[5],
                'year': row[6],
                'date_achieved': row[7].isoformat() if row[7] else None,
                'issuer': row[8],
                'verification_url': row[9],
                'is_featured': row[10],
                'display_order': row[11],
                'created_at': row[12].isoformat() if row[12] else None,
                'certificate_url': row[13],
                'is_verified': row[14],
                'verification_status': row[15],
                'rejection_reason': row[16],
                'verified_at': row[17].isoformat() if row[17] else None
            }
    finally:
        conn.close()


@router.put("/api/tutor/achievements/{achievement_id}")
async def update_achievement(
    achievement_id: int,
    title: str = Form(...),
    category: str = Form(...),
    description: Optional[str] = Form(None),
    icon: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    issuer: Optional[str] = Form(None),
    verification_url: Optional[str] = Form(None),
    certificate: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Update an achievement"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Verify ownership and get existing data
            cur.execute("""
                SELECT id, certificate_url FROM tutor_achievements
                WHERE id = %s AND tutor_id = %s
            """, (achievement_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Achievement not found or unauthorized")

            # Handle file upload if provided
            certificate_url = row[1]  # Keep existing if no new file
            if certificate and certificate.filename:
                # Delete old file from Backblaze if exists
                if certificate_url:
                    try:
                        b2_service.delete_file(certificate_url)
                    except Exception as e:
                        print(f"Warning: Could not delete old file: {e}")

                # Upload new file
                try:
                    file_data = await certificate.read()
                    certificate_url = b2_service.upload_file(
                        file_data,
                        certificate.filename,
                        'achievements',
                        current_user['id']
                    )
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

            # Update achievement
            cur.execute("""
                UPDATE tutor_achievements
                SET title = %s, category = %s, description = %s, icon = %s,
                    year = %s, issuer = %s, verification_url = %s,
                    certificate_url = %s, updated_at = NOW()
                WHERE id = %s
            """, (
                title, category, description, icon, year, issuer,
                verification_url, certificate_url, achievement_id
            ))

            conn.commit()
            return {'message': 'Achievement updated successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update achievement: {str(e)}")
    finally:
        conn.close()


# Individual Experience Endpoints
@router.get("/api/tutor/experience/{experience_id}")
async def get_experience(
    experience_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a single experience by ID"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id, job_title, institution, location, description,
                    responsibilities, achievements, start_date, end_date,
                    is_current, employment_type, certificate_url, is_verified,
                    verification_status, created_at
                FROM tutor_experience
                WHERE id = %s AND tutor_id = %s
            """, (experience_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Experience not found")

            return {
                'id': row[0],
                'job_title': row[1],
                'institution': row[2],
                'location': row[3],
                'description': row[4],
                'responsibilities': row[5],
                'achievements': row[6],
                'start_date': row[7].isoformat() if row[7] else None,
                'end_date': row[8].isoformat() if row[8] else None,
                'is_current': row[9],
                'employment_type': row[10],
                'certificate_url': row[11],
                'is_verified': row[12],
                'verification_status': row[13],
                'created_at': row[14].isoformat() if row[14] else None
            }
    finally:
        conn.close()


@router.put("/api/tutor/experience/{experience_id}")
async def update_experience(
    experience_id: int,
    job_title: str = Form(...),
    institution: str = Form(...),
    start_date: str = Form(...),
    location: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    responsibilities: Optional[str] = Form(None),
    achievements: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    is_current: bool = Form(False),
    employment_type: Optional[str] = Form(None),
    certificate: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Update an experience"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Verify ownership and get existing data
            cur.execute("""
                SELECT id, certificate_url FROM tutor_experience
                WHERE id = %s AND tutor_id = %s
            """, (experience_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Experience not found or unauthorized")

            # Handle file upload if provided
            certificate_url = row[1]  # Keep existing if no new file
            if certificate and certificate.filename:
                # Delete old file from Backblaze if exists
                if certificate_url:
                    try:
                        b2_service.delete_file(certificate_url)
                    except Exception as e:
                        print(f"Warning: Could not delete old file: {e}")

                # Upload new file
                try:
                    file_data = await certificate.read()
                    certificate_url = b2_service.upload_file(
                        file_data,
                        certificate.filename,
                        'experience_certificates',
                        current_user['id']
                    )
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

            # Update experience
            cur.execute("""
                UPDATE tutor_experience
                SET job_title = %s, institution = %s, location = %s, description = %s,
                    responsibilities = %s, achievements = %s, start_date = %s,
                    end_date = %s, is_current = %s, employment_type = %s,
                    certificate_url = %s, updated_at = NOW()
                WHERE id = %s
            """, (
                job_title, institution, location, description, responsibilities,
                achievements, start_date, end_date if not is_current else None,
                is_current, employment_type, certificate_url, experience_id
            ))

            conn.commit()
            return {'message': 'Experience updated successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update experience: {str(e)}")
    finally:
        conn.close()


# Update DELETE endpoints to handle Backblaze cleanup
# Replace the existing DELETE endpoints with these versions:

@router.delete("/api/tutor/certifications/{certification_id}")
async def delete_certification(
    certification_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a certification and its associated file from Backblaze"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Get file URL before deleting
            cur.execute("""
                SELECT certificate_image_url FROM tutor_certificates
                WHERE id = %s AND tutor_id = %s
            """, (certification_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Certification not found or unauthorized")

            certificate_image_url = row[0]

            # Delete from Backblaze if file exists
            if certificate_image_url:
                try:
                    b2_service.delete_file(certificate_image_url)
                except Exception as e:
                    print(f"Warning: Could not delete file from Backblaze: {e}")

            # Delete from database
            cur.execute("""
                DELETE FROM tutor_certificates
                WHERE id = %s
            """, (certification_id,))

            conn.commit()
            return {'message': 'Certification and associated file deleted successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete certification: {str(e)}")
    finally:
        conn.close()


@router.delete("/api/tutor/achievements/{achievement_id}")
async def delete_achievement(
    achievement_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete an achievement and its associated file from Backblaze"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Get file URL before deleting
            cur.execute("""
                SELECT certificate_url FROM tutor_achievements
                WHERE id = %s AND tutor_id = %s
            """, (achievement_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Achievement not found or unauthorized")

            certificate_url = row[0]

            # Delete from Backblaze if file exists
            if certificate_url:
                try:
                    b2_service.delete_file(certificate_url)
                except Exception as e:
                    print(f"Warning: Could not delete file from Backblaze: {e}")

            # Delete from database
            cur.execute("""
                DELETE FROM tutor_achievements
                WHERE id = %s
            """, (achievement_id,))

            conn.commit()
            return {'message': 'Achievement and associated file deleted successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete achievement: {str(e)}")
    finally:
        conn.close()


@router.delete("/api/tutor/experience/{experience_id}")
async def delete_experience(
    experience_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete an experience and its associated file from Backblaze"""

    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Not authorized. Tutor role required.")

    tutor_id = current_user.get('tutor_id')
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Get file URL before deleting
            cur.execute("""
                SELECT certificate_url FROM tutor_experience
                WHERE id = %s AND tutor_id = %s
            """, (experience_id, tutor_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Experience not found or unauthorized")

            certificate_url = row[0]

            # Delete from Backblaze if file exists
            if certificate_url:
                try:
                    b2_service.delete_file(certificate_url)
                except Exception as e:
                    print(f"Warning: Could not delete file from Backblaze: {e}")

            # Delete from database
            cur.execute("""
                DELETE FROM tutor_experience
                WHERE id = %s
            """, (experience_id,))

            conn.commit()
            return {'message': 'Experience and associated file deleted successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete experience: {str(e)}")
    finally:
        conn.close()
