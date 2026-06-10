"""
Platform Bank Accounts (admin system settings).

Lets a system-settings admin record the platform's bank account number for each
Ethiopian bank — used so advertisers/users know where to transfer payments and so
receipts can be reconciled. Self-bootstrapping table (CREATE TABLE IF NOT EXISTS),
mirrors the payment_gateways pattern in pricing_settings_endpoints.py.

Storage: platform_bank_accounts in the user DB (DATABASE_URL).
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/admin/banks", tags=["Bank Accounts"])


def get_db_connection():
    url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")
    return psycopg.connect(url.replace("postgresql+psycopg://", "postgresql://"))


def _ensure_table(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS platform_bank_accounts (
            id SERIAL PRIMARY KEY,
            bank_code VARCHAR(50) UNIQUE NOT NULL,
            bank_name VARCHAR(255) NOT NULL,
            account_number VARCHAR(100),
            account_name VARCHAR(255),
            enabled BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)


class BankAccount(BaseModel):
    bank_code: str
    bank_name: str
    account_number: Optional[str] = None
    account_name: Optional[str] = None
    enabled: Optional[bool] = True


@router.get("")
@router.get("/")
async def list_bank_accounts():
    """Return all saved platform bank accounts (those with an account number)."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT bank_code, bank_name, account_number, account_name, enabled, updated_at
            FROM platform_bank_accounts
            ORDER BY bank_name
        """)
        cols = [d[0] for d in cur.description]
        accounts = [dict(zip(cols, row)) for row in cur.fetchall()]
        for a in accounts:
            if a.get('updated_at'):
                a['updated_at'] = str(a['updated_at'])
        return {"success": True, "accounts": accounts}
    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "accounts": []}
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if conn:
            cur.close()
            conn.close()


@router.post("")
@router.post("/")
async def save_bank_account(bank: BankAccount):
    """Upsert a bank's account number (keyed by bank_code)."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        _ensure_table(cur)
        cur.execute("""
            INSERT INTO platform_bank_accounts
                (bank_code, bank_name, account_number, account_name, enabled, updated_at)
            VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (bank_code) DO UPDATE SET
                bank_name = EXCLUDED.bank_name,
                account_number = EXCLUDED.account_number,
                account_name = EXCLUDED.account_name,
                enabled = EXCLUDED.enabled,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (bank.bank_code, bank.bank_name,
              (bank.account_number or '').strip() or None,
              (bank.account_name or '').strip() or None,
              bool(bank.enabled)))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id, "message": f"{bank.bank_name} saved."}
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if conn:
            cur.close()
            conn.close()


@router.delete("/{bank_code}")
async def delete_bank_account(bank_code: str):
    """Remove a saved bank account."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM platform_bank_accounts WHERE bank_code = %s", (bank_code,))
        conn.commit()
        return {"success": True, "message": "Bank account removed."}
    except Exception as e:
        if conn:
            conn.rollback()
        if "does not exist" in str(e):
            return {"success": True, "message": "Nothing to remove."}
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if conn:
            cur.close()
            conn.close()
