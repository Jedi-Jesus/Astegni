"""
Partner Request Endpoints
Handles partnership request submissions from companies and institutions
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, List
import json
import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime
import aiofiles
from pathlib import Path

from backblaze_service import BackblazeService

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

router = APIRouter()
b2_service = BackblazeService()

# File upload configuration
UPLOAD_DIR = Path("uploads/partner_proposals")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx'}
DOC_EXTENSIONS = {'.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.svg'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

async def _upload_to_b2(file: UploadFile, file_type: str, allowed_exts, slug: str):
    """Validate + upload an UploadFile to B2, returning its URL. Raises on bad input."""
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type for {file_type}. Allowed: {', '.join(sorted(allowed_exts))}",
        )
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail=f"{file_type} file is empty")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"{file_type} exceeds 10MB limit")
    result = b2_service.upload_file(
        file_data=content,
        file_name=file.filename,
        file_type=file_type,
        content_type=file.content_type,
        user_id=f"partner_{slug}",
    )
    if not result or not result.get("url"):
        raise HTTPException(status_code=502, detail=f"Upload failed for {file_type}")
    return result["url"]


@router.post("/api/partner-requests")
async def create_partner_request(
    company_name: str = Form(...),
    contact_person: str = Form(...),
    emails: str = Form(...),  # JSON string of email array
    phones: str = Form(...),  # JSON string of phone array
    partnership_type: str = Form(...),
    partnership_type_category: str = Form(...),
    description: str = Form(""),
    # Branding
    website: str = Form(""),
    social_link: str = Form(""),
    # Applicant identity
    naming_system: str = Form("ethiopian"),
    applicant_first_name: str = Form(""),
    applicant_father_name: str = Form(""),
    applicant_grandfather_name: str = Form(""),
    applicant_last_name: str = Form(""),
    date_of_birth: str = Form(""),
    personal_email: str = Form(...),
    # Files: logo + ownership proof are required; proposal stays required.
    logo: UploadFile = File(...),
    ownership_proof: UploadFile = File(...),
    proposal: UploadFile = File(...),
):
    """
    Create a new partnership request.

    Logo (image) and business-ownership proof are now required alongside the
    proposal. A website is recommended; if absent a social-media link should be
    given. Applicant identity (Ethiopian/International naming, DOB, personal
    email) is captured so identity KYC can run against this application.

    Files go to Backblaze B2. Returns the new request_id, which the frontend then
    uses to run the KYC steps (/api/partner-kyc/*).
    """
    try:
        try:
            emails_list = json.loads(emails)
            phones_list = json.loads(phones)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format for emails or phones")

        if not contact_person:
            raise HTTPException(status_code=400, detail="Contact person is required")
        if not emails_list or not isinstance(emails_list, list):
            raise HTTPException(status_code=400, detail="At least one email is required")
        if not phones_list or not isinstance(phones_list, list):
            raise HTTPException(status_code=400, detail="At least one phone number is required")
        if partnership_type_category not in ['educational_institution', 'technology', 'other']:
            raise HTTPException(status_code=400, detail="Invalid partnership type category")
        if not partnership_type:
            raise HTTPException(status_code=400, detail="Partnership type is required")
        if not personal_email or '@' not in personal_email:
            raise HTTPException(status_code=400, detail="A valid personal email is required")

        # Applicant name validation by naming system.
        naming_system = (naming_system or 'ethiopian').lower()
        if not applicant_first_name.strip():
            raise HTTPException(status_code=400, detail="Applicant first name is required")
        if naming_system == 'international':
            if not applicant_last_name.strip():
                raise HTTPException(status_code=400, detail="Applicant last name is required")
        else:
            if not applicant_father_name.strip() or not applicant_grandfather_name.strip():
                raise HTTPException(status_code=400, detail="Father and grandfather names are required")

        dob_value = date_of_birth.strip() or None

        slug = "".join(c if c.isalnum() else "_" for c in (company_name or contact_person))[:40]

        # Required uploads -> B2.
        logo_url = await _upload_to_b2(logo, "brand_logo", IMAGE_EXTENSIONS, slug)
        ownership_proof_url = await _upload_to_b2(ownership_proof, "company_document", DOC_EXTENSIONS, slug)
        proposal_url = await _upload_to_b2(proposal, "company_document", ALLOWED_EXTENSIONS, slug)

        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO partner_requests (
                        company_name, contact_person, emails, phones,
                        partnership_type, partnership_type_category, description,
                        proposal_file_path, logo_url, website, social_link,
                        naming_system, applicant_first_name, applicant_father_name,
                        applicant_grandfather_name, applicant_last_name,
                        date_of_birth, personal_email, ownership_proof_url,
                        status, kyc_status
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    RETURNING id, created_at
                """, (
                    company_name, contact_person,
                    json.dumps(emails_list), json.dumps(phones_list),
                    partnership_type, partnership_type_category, description or None,
                    proposal_url, logo_url, website.strip() or None, social_link.strip() or None,
                    naming_system, applicant_first_name.strip(),
                    applicant_father_name.strip() or None,
                    applicant_grandfather_name.strip() or None,
                    applicant_last_name.strip() or None,
                    dob_value, personal_email.strip(), ownership_proof_url,
                    'pending', 'pending',
                ))
                request_id, created_at = cur.fetchone()
                conn.commit()

        return {
            "success": True,
            "message": "Partnership request submitted successfully",
            "request_id": request_id,
            "created_at": created_at.isoformat(),
            "company_name": company_name,
            "emails": emails_list,
            "phones": phones_list,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating partner request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit partnership request: {str(e)}")


@router.get("/api/partner-requests")
async def get_partner_requests(
    status: Optional[str] = None,
    partnership_type: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """
    Get all partnership requests (admin endpoint)

    Query Parameters:
    - status: Filter by status ('pending', 'under_review', 'approved', 'rejected')
    - partnership_type: Filter by type ('educational_institution', 'technology', 'other')
    - page: Page number (default: 1)
    - limit: Items per page (default: 20)

    Returns:
    - List of partnership requests with pagination
    """

    try:
        offset = (page - 1) * limit

        # Build query
        query = """
            SELECT id, company_name, contact_person, emails, phones,
                   partnership_type, description, proposal_file_path, status,
                   created_at, updated_at, reviewed_by, reviewed_at, admin_notes
            FROM partner_requests
            WHERE 1=1
        """
        params = []

        if status:
            query += " AND status = %s"
            params.append(status)

        if partnership_type:
            query += " AND partnership_type = %s"
            params.append(partnership_type)

        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        # Get total count
        count_query = """
            SELECT COUNT(*) FROM partner_requests WHERE 1=1
        """
        count_params = []

        if status:
            count_query += " AND status = %s"
            count_params.append(status)

        if partnership_type:
            count_query += " AND partnership_type = %s"
            count_params.append(partnership_type)

        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Get requests
                cur.execute(query, params)
                requests = cur.fetchall()

                # Get total count
                cur.execute(count_query, count_params)
                total = cur.fetchone()[0]

        # Format results
        formatted_requests = []
        for req in requests:
            formatted_requests.append({
                "id": req[0],
                "company_name": req[1],
                "contact_person": req[2],
                "emails": json.loads(req[3]) if isinstance(req[3], str) else req[3],
                "phones": json.loads(req[4]) if isinstance(req[4], str) else req[4],
                "partnership_type": req[5],
                "description": req[6],
                "proposal_file_path": req[7],
                "status": req[8],
                "created_at": req[9].isoformat() if req[9] else None,
                "updated_at": req[10].isoformat() if req[10] else None,
                "reviewed_by": req[11],
                "reviewed_at": req[12].isoformat() if req[12] else None,
                "admin_notes": req[13]
            })

        return {
            "success": True,
            "requests": formatted_requests,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }

    except Exception as e:
        print(f"Error fetching partner requests: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch partner requests: {str(e)}")


@router.get("/api/partner-requests/{request_id}")
async def get_partner_request(request_id: int):
    """Get a specific partnership request by ID"""

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, company_name, contact_person, emails, phones,
                           partnership_type, description, proposal_file_path, status,
                           created_at, updated_at, reviewed_by, reviewed_at, admin_notes
                    FROM partner_requests
                    WHERE id = %s
                """, (request_id,))

                result = cur.fetchone()

                if not result:
                    raise HTTPException(status_code=404, detail="Partnership request not found")

                return {
                    "success": True,
                    "request": {
                        "id": result[0],
                        "company_name": result[1],
                        "contact_person": result[2],
                        "emails": json.loads(result[3]) if isinstance(result[3], str) else result[3],
                        "phones": json.loads(result[4]) if isinstance(result[4], str) else result[4],
                        "partnership_type": result[5],
                        "description": result[6],
                        "proposal_file_path": result[7],
                        "status": result[8],
                        "created_at": result[9].isoformat() if result[9] else None,
                        "updated_at": result[10].isoformat() if result[10] else None,
                        "reviewed_by": result[11],
                        "reviewed_at": result[12].isoformat() if result[12] else None,
                        "admin_notes": result[13]
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching partner request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch partner request: {str(e)}")
