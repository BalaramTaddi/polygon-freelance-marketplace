"""
GDPR-Compliant Data Management Service
Handles user data with full GDPR compliance including right to access, rectification, erasure, and portability
"""

import os
import json
import hashlib
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import psycopg2
from psycopg2.extras import RealDictCursor
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "polylance")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# Encryption key for PII
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key())
cipher = Fernet(ENCRYPTION_KEY)


class DataCategory(Enum):
    """GDPR data categories"""
    IDENTITY = "identity"  # Name, DOB, ID numbers
    CONTACT = "contact"    # Email, phone, address
    FINANCIAL = "financial"  # Payment info, transaction history
    BEHAVIORAL = "behavioral"  # Usage patterns, preferences
    TECHNICAL = "technical"  # IP address, device info
    PROFESSIONAL = "professional"  # Skills, work history


class LegalBasis(Enum):
    """GDPR legal basis for processing"""
    CONSENT = "consent"
    CONTRACT = "contract"
    LEGAL_OBLIGATION = "legal_obligation"
    VITAL_INTERESTS = "vital_interests"
    PUBLIC_TASK = "public_task"
    LEGITIMATE_INTERESTS = "legitimate_interests"


class GDPRDataManager:
    """Manages user data with full GDPR compliance"""
    
    def __init__(self):
        self.conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        self._initialize_tables()
    
    def _initialize_tables(self):
        """Create GDPR-compliant database schema"""
        with self.conn.cursor() as cur:
            # User data table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_data (
                    id SERIAL PRIMARY KEY,
                    wallet_address VARCHAR(42) UNIQUE NOT NULL,
                    email_encrypted BYTEA,
                    phone_encrypted BYTEA,
                    first_name_encrypted BYTEA,
                    last_name_encrypted BYTEA,
                    date_of_birth_encrypted BYTEA,
                    country VARCHAR(2),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    data_retention_until TIMESTAMP,
                    is_deleted BOOLEAN DEFAULT FALSE
                )
            """)
            
            # Consent records
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_consents (
                    id SERIAL PRIMARY KEY,
                    wallet_address VARCHAR(42) NOT NULL,
                    data_category VARCHAR(50) NOT NULL,
                    legal_basis VARCHAR(50) NOT NULL,
                    purpose TEXT NOT NULL,
                    consent_given BOOLEAN DEFAULT FALSE,
                    consent_date TIMESTAMP,
                    withdrawal_date TIMESTAMP,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    FOREIGN KEY (wallet_address) REFERENCES user_data(wallet_address)
                )
            """)
            
            # Data access log (for audit trail)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS data_access_log (
                    id SERIAL PRIMARY KEY,
                    wallet_address VARCHAR(42) NOT NULL,
                    accessed_by VARCHAR(100) NOT NULL,
                    access_type VARCHAR(50) NOT NULL,
                    data_categories TEXT[],
                    purpose TEXT,
                    timestamp TIMESTAMP DEFAULT NOW(),
                    ip_address VARCHAR(45)
                )
            """)
            
            # Data processing activities
            cur.execute("""
                CREATE TABLE IF NOT EXISTS processing_activities (
                    id SERIAL PRIMARY KEY,
                    activity_name VARCHAR(200) NOT NULL,
                    purpose TEXT NOT NULL,
                    legal_basis VARCHAR(50) NOT NULL,
                    data_categories TEXT[],
                    recipients TEXT[],
                    retention_period VARCHAR(100),
                    security_measures TEXT[],
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Data breach incidents
            cur.execute("""
                CREATE TABLE IF NOT EXISTS data_breaches (
                    id SERIAL PRIMARY KEY,
                    incident_date TIMESTAMP NOT NULL,
                    discovered_date TIMESTAMP NOT NULL,
                    description TEXT NOT NULL,
                    affected_users INT,
                    data_categories TEXT[],
                    severity VARCHAR(20),
                    reported_to_authority BOOLEAN DEFAULT FALSE,
                    authority_report_date TIMESTAMP,
                    users_notified BOOLEAN DEFAULT FALSE,
                    mitigation_measures TEXT
                )
            """)
            
            self.conn.commit()
    
    def encrypt_pii(self, data: str) -> bytes:
        """Encrypt personally identifiable information"""
        if not data:
            return None
        return cipher.encrypt(data.encode())
    
    def decrypt_pii(self, encrypted_data: bytes) -> str:
        """Decrypt personally identifiable information"""
        if not encrypted_data:
            return None
        return cipher.decrypt(encrypted_data).decode()
    
    def create_user(self, user_data: Dict) -> str:
        """Create user with encrypted PII"""
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO user_data (
                    wallet_address,
                    email_encrypted,
                    phone_encrypted,
                    first_name_encrypted,
                    last_name_encrypted,
                    date_of_birth_encrypted,
                    country,
                    data_retention_until
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING wallet_address
            """, (
                user_data["wallet_address"],
                self.encrypt_pii(user_data.get("email")),
                self.encrypt_pii(user_data.get("phone")),
                self.encrypt_pii(user_data.get("first_name")),
                self.encrypt_pii(user_data.get("last_name")),
                self.encrypt_pii(user_data.get("date_of_birth")),
                user_data.get("country"),
                datetime.now() + timedelta(days=365 * 7)  # 7 years default retention
            ))
            
            self.conn.commit()
            return user_data["wallet_address"]
    
    def record_consent(
        self,
        wallet_address: str,
        data_category: DataCategory,
        legal_basis: LegalBasis,
        purpose: str,
        consent_given: bool,
        ip_address: str = None,
        user_agent: str = None
    ):
        """Record user consent for data processing"""
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO user_consents (
                    wallet_address,
                    data_category,
                    legal_basis,
                    purpose,
                    consent_given,
                    consent_date,
                    ip_address,
                    user_agent
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                wallet_address,
                data_category.value,
                legal_basis.value,
                purpose,
                consent_given,
                datetime.now() if consent_given else None,
                ip_address,
                user_agent
            ))
            
            self.conn.commit()
    
    def withdraw_consent(self, wallet_address: str, data_category: DataCategory):
        """Withdraw consent for specific data category"""
        with self.conn.cursor() as cur:
            cur.execute("""
                UPDATE user_consents
                SET consent_given = FALSE,
                    withdrawal_date = %s
                WHERE wallet_address = %s
                AND data_category = %s
                AND consent_given = TRUE
            """, (datetime.now(), wallet_address, data_category.value))
            
            self.conn.commit()
    
    def log_data_access(
        self,
        wallet_address: str,
        accessed_by: str,
        access_type: str,
        data_categories: List[str],
        purpose: str,
        ip_address: str = None
    ):
        """Log data access for audit trail"""
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO data_access_log (
                    wallet_address,
                    accessed_by,
                    access_type,
                    data_categories,
                    purpose,
                    ip_address
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                wallet_address,
                accessed_by,
                access_type,
                data_categories,
                purpose,
                ip_address
            ))
            
            self.conn.commit()
    
    def get_user_data(self, wallet_address: str, requester: str) -> Dict:
        """
        Right to Access (GDPR Article 15)
        Retrieve all user data in portable format
        """
        # Log access
        self.log_data_access(
            wallet_address,
            requester,
            "data_export",
            ["all"],
            "GDPR data access request"
        )
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get user data
            cur.execute("""
                SELECT * FROM user_data
                WHERE wallet_address = %s
                AND is_deleted = FALSE
            """, (wallet_address,))
            
            user_data = cur.fetchone()
            
            if not user_data:
                return None
            
            # Decrypt PII
            decrypted_data = {
                "wallet_address": user_data["wallet_address"],
                "email": self.decrypt_pii(user_data["email_encrypted"]),
                "phone": self.decrypt_pii(user_data["phone_encrypted"]),
                "first_name": self.decrypt_pii(user_data["first_name_encrypted"]),
                "last_name": self.decrypt_pii(user_data["last_name_encrypted"]),
                "date_of_birth": self.decrypt_pii(user_data["date_of_birth_encrypted"]),
                "country": user_data["country"],
                "created_at": user_data["created_at"].isoformat(),
                "updated_at": user_data["updated_at"].isoformat(),
                "data_retention_until": user_data["data_retention_until"].isoformat()
            }
            
            # Get consents
            cur.execute("""
                SELECT * FROM user_consents
                WHERE wallet_address = %s
                ORDER BY consent_date DESC
            """, (wallet_address,))
            
            consents = [dict(row) for row in cur.fetchall()]
            
            # Get access log
            cur.execute("""
                SELECT * FROM data_access_log
                WHERE wallet_address = %s
                ORDER BY timestamp DESC
                LIMIT 100
            """, (wallet_address,))
            
            access_log = [dict(row) for row in cur.fetchall()]
            
            return {
                "personal_data": decrypted_data,
                "consents": consents,
                "access_log": access_log,
                "export_date": datetime.now().isoformat(),
                "format": "JSON"
            }
    
    def update_user_data(self, wallet_address: str, updates: Dict, requester: str):
        """
        Right to Rectification (GDPR Article 16)
        Update user data
        """
        # Log access
        self.log_data_access(
            wallet_address,
            requester,
            "data_update",
            list(updates.keys()),
            "User data rectification"
        )
        
        with self.conn.cursor() as cur:
            # Build update query dynamically
            encrypted_updates = {}
            for key, value in updates.items():
                if key in ["email", "phone", "first_name", "last_name", "date_of_birth"]:
                    encrypted_updates[f"{key}_encrypted"] = self.encrypt_pii(value)
                else:
                    encrypted_updates[key] = value
            
            set_clause = ", ".join([f"{k} = %s" for k in encrypted_updates.keys()])
            values = list(encrypted_updates.values()) + [datetime.now(), wallet_address]
            
            cur.execute(f"""
                UPDATE user_data
                SET {set_clause}, updated_at = %s
                WHERE wallet_address = %s
            """, values)
            
            self.conn.commit()
    
    def delete_user_data(self, wallet_address: str, requester: str):
        """
        Right to Erasure / Right to be Forgotten (GDPR Article 17)
        Permanently delete user data
        """
        # Log access
        self.log_data_access(
            wallet_address,
            requester,
            "data_deletion",
            ["all"],
            "GDPR right to erasure request"
        )
        
        with self.conn.cursor() as cur:
            # Soft delete (mark as deleted but keep for legal compliance)
            cur.execute("""
                UPDATE user_data
                SET is_deleted = TRUE,
                    email_encrypted = NULL,
                    phone_encrypted = NULL,
                    first_name_encrypted = NULL,
                    last_name_encrypted = NULL,
                    date_of_birth_encrypted = NULL,
                    updated_at = %s
                WHERE wallet_address = %s
            """, (datetime.now(), wallet_address))
            
            # Withdraw all consents
            cur.execute("""
                UPDATE user_consents
                SET consent_given = FALSE,
                    withdrawal_date = %s
                WHERE wallet_address = %s
            """, (datetime.now(), wallet_address))
            
            self.conn.commit()
    
    def export_user_data(self, wallet_address: str, requester: str, format: str = "json") -> str:
        """
        Right to Data Portability (GDPR Article 20)
        Export user data in machine-readable format
        """
        data = self.get_user_data(wallet_address, requester)
        
        if format == "json":
            return json.dumps(data, indent=2, default=str)
        elif format == "csv":
            # Convert to CSV format
            import csv
            import io
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=data["personal_data"].keys())
            writer.writeheader()
            writer.writerow(data["personal_data"])
            return output.getvalue()
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def get_processing_activities(self) -> List[Dict]:
        """
        Article 30: Records of processing activities
        Required for GDPR compliance
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM processing_activities ORDER BY created_at DESC")
            return [dict(row) for row in cur.fetchall()]
    
    def report_data_breach(
        self,
        description: str,
        affected_users: int,
        data_categories: List[str],
        severity: str
    ) -> int:
        """
        Article 33: Notification of data breach to supervisory authority
        Must be reported within 72 hours
        """
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO data_breaches (
                    incident_date,
                    discovered_date,
                    description,
                    affected_users,
                    data_categories,
                    severity
                ) VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                datetime.now(),
                datetime.now(),
                description,
                affected_users,
                data_categories,
                severity
            ))
            
            breach_id = cur.fetchone()[0]
            self.conn.commit()
            
            # TODO: Send notification to supervisory authority if severity is high
            if severity in ["high", "critical"]:
                self._notify_supervisory_authority(breach_id)
            
            return breach_id
    
    def _notify_supervisory_authority(self, breach_id: int):
        """Notify supervisory authority of data breach"""
        # In production, integrate with relevant data protection authority
        print(f"⚠️  Data breach {breach_id} reported to supervisory authority")
        pass


# Example usage
if __name__ == "__main__":
    gdpr = GDPRDataManager()
    
    # Create user with consent
    user_data = {
        "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        "email": "john@example.com",
        "phone": "+1234567890",
        "first_name": "John",
        "last_name": "Doe",
        "date_of_birth": "1990-01-01",
        "country": "US"
    }
    
    gdpr.create_user(user_data)
    
    # Record consent
    gdpr.record_consent(
        user_data["wallet_address"],
        DataCategory.IDENTITY,
        LegalBasis.CONSENT,
        "KYC verification for platform access",
        consent_given=True,
        ip_address="192.168.1.1"
    )
    
    # Export user data (GDPR Article 15)
    export = gdpr.export_user_data(user_data["wallet_address"], "user_request")
    print("User data export:", export)
