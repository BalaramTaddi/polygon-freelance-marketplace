"""
KYC/AML Integration Service
Integrates with Persona and Sumsub for identity verification
"""

import os
import json
import hashlib
import hmac
import requests
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()

# Configuration
POLYGON_RPC = os.getenv("POLYGON_AMOY_RPC", "https://rpc-amoy.polygon.technology")
PRIVATE_KEY = os.getenv("KYC_OPERATOR_PRIVATE_KEY")
COMPLIANCE_REGISTRY_ADDRESS = os.getenv("COMPLIANCE_REGISTRY_ADDRESS")

# KYC Provider APIs
PERSONA_API_KEY = os.getenv("PERSONA_API_KEY")
PERSONA_TEMPLATE_ID = os.getenv("PERSONA_TEMPLATE_ID")
SUMSUB_API_KEY = os.getenv("SUMSUB_API_KEY")
SUMSUB_SECRET_KEY = os.getenv("SUMSUB_SECRET_KEY")
SUMSUB_APP_TOKEN = os.getenv("SUMSUB_APP_TOKEN")

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(POLYGON_RPC))
account = Account.from_key(PRIVATE_KEY)

# Load ComplianceRegistry ABI
with open("../contracts/artifacts/contracts/ComplianceRegistry.sol/ComplianceRegistry.json") as f:
    compliance_abi = json.load(f)["abi"]

compliance_registry = w3.eth.contract(
    address=COMPLIANCE_REGISTRY_ADDRESS,
    abi=compliance_abi
)


class KYCLevel:
    """KYC verification levels"""
    NONE = 0
    BASIC = 1
    INTERMEDIATE = 2
    ADVANCED = 3
    INSTITUTIONAL = 4


class PersonaKYC:
    """Persona identity verification integration"""
    
    BASE_URL = "https://withpersona.com/api/v1"
    
    def __init__(self, api_key: str, template_id: str):
        self.api_key = api_key
        self.template_id = template_id
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Persona-Version": "2023-01-05"
        }
    
    def create_inquiry(self, user_data: Dict) -> Dict:
        """Create a new KYC inquiry"""
        url = f"{self.BASE_URL}/inquiries"
        
        payload = {
            "data": {
                "type": "inquiry",
                "attributes": {
                    "inquiry-template-id": self.template_id,
                    "reference-id": user_data.get("wallet_address"),
                    "fields": {
                        "name_first": user_data.get("first_name"),
                        "name_last": user_data.get("last_name"),
                        "email_address": user_data.get("email"),
                        "phone_number": user_data.get("phone")
                    }
                }
            }
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json()
    
    def get_inquiry_status(self, inquiry_id: str) -> Dict:
        """Get inquiry verification status"""
        url = f"{self.BASE_URL}/inquiries/{inquiry_id}"
        
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_verification_level(self, inquiry_data: Dict) -> int:
        """Determine KYC level from Persona inquiry"""
        status = inquiry_data["data"]["attributes"]["status"]
        
        if status != "approved":
            return KYCLevel.NONE
        
        # Check verification types completed
        verifications = inquiry_data["data"]["relationships"]["verifications"]["data"]
        
        has_email = any(v["type"] == "verification/email" for v in verifications)
        has_phone = any(v["type"] == "verification/phone" for v in verifications)
        has_id = any(v["type"] == "verification/government-id" for v in verifications)
        has_address = any(v["type"] == "verification/address" for v in verifications)
        
        if has_email and has_phone and has_id and has_address:
            return KYCLevel.ADVANCED
        elif has_email and has_phone and has_id:
            return KYCLevel.INTERMEDIATE
        elif has_email and has_phone:
            return KYCLevel.BASIC
        else:
            return KYCLevel.NONE


class SumsubKYC:
    """Sumsub identity verification integration"""
    
    BASE_URL = "https://api.sumsub.com"
    
    def __init__(self, api_key: str, secret_key: str, app_token: str):
        self.api_key = api_key
        self.secret_key = secret_key
        self.app_token = app_token
    
    def _generate_signature(self, method: str, url: str, timestamp: str, body: str = "") -> str:
        """Generate HMAC signature for Sumsub API"""
        message = f"{timestamp}{method}{url}{body}"
        signature = hmac.new(
            self.secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def create_applicant(self, user_data: Dict) -> Dict:
        """Create a new applicant"""
        url = "/resources/applicants"
        timestamp = str(int(datetime.now().timestamp()))
        
        payload = {
            "externalUserId": user_data.get("wallet_address"),
            "email": user_data.get("email"),
            "phone": user_data.get("phone"),
            "fixedInfo": {
                "firstName": user_data.get("first_name"),
                "lastName": user_data.get("last_name"),
                "country": user_data.get("country", "US")
            }
        }
        
        body = json.dumps(payload)
        signature = self._generate_signature("POST", url, timestamp, body)
        
        headers = {
            "X-App-Token": self.app_token,
            "X-App-Access-Sig": signature,
            "X-App-Access-Ts": timestamp,
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{self.BASE_URL}{url}",
            headers=headers,
            data=body
        )
        response.raise_for_status()
        return response.json()
    
    def get_applicant_status(self, applicant_id: str) -> Dict:
        """Get applicant verification status"""
        url = f"/resources/applicants/{applicant_id}/status"
        timestamp = str(int(datetime.now().timestamp()))
        
        signature = self._generate_signature("GET", url, timestamp)
        
        headers = {
            "X-App-Token": self.app_token,
            "X-App-Access-Sig": signature,
            "X-App-Access-Ts": timestamp
        }
        
        response = requests.get(f"{self.BASE_URL}{url}", headers=headers)
        response.raise_for_status()
        return response.json()
    
    def get_verification_level(self, status_data: Dict) -> int:
        """Determine KYC level from Sumsub status"""
        review_status = status_data.get("reviewStatus")
        
        if review_status != "completed":
            return KYCLevel.NONE
        
        review_result = status_data.get("reviewResult", {})
        review_answer = review_result.get("reviewAnswer")
        
        if review_answer != "GREEN":
            return KYCLevel.NONE
        
        # Check verification types
        verification_types = status_data.get("verificationTypes", [])
        
        if "IDENTITY" in verification_types and "PROOF_OF_RESIDENCE" in verification_types:
            return KYCLevel.ADVANCED
        elif "IDENTITY" in verification_types:
            return KYCLevel.INTERMEDIATE
        elif "EMAIL" in verification_types:
            return KYCLevel.BASIC
        else:
            return KYCLevel.NONE


class ComplianceService:
    """Main compliance service orchestrating KYC providers and blockchain updates"""
    
    def __init__(self):
        self.persona = PersonaKYC(PERSONA_API_KEY, PERSONA_TEMPLATE_ID) if PERSONA_API_KEY else None
        self.sumsub = SumsubKYC(SUMSUB_API_KEY, SUMSUB_SECRET_KEY, SUMSUB_APP_TOKEN) if SUMSUB_API_KEY else None
    
    async def verify_user(
        self,
        wallet_address: str,
        user_data: Dict,
        provider: str = "persona"
    ) -> Dict:
        """Initiate KYC verification for a user"""
        
        if provider == "persona" and self.persona:
            inquiry = self.persona.create_inquiry(user_data)
            return {
                "provider": "persona",
                "inquiry_id": inquiry["data"]["id"],
                "inquiry_url": inquiry["data"]["attributes"]["inquiry-url"],
                "status": "pending"
            }
        
        elif provider == "sumsub" and self.sumsub:
            applicant = self.sumsub.create_applicant(user_data)
            return {
                "provider": "sumsub",
                "applicant_id": applicant["id"],
                "status": "pending"
            }
        
        else:
            raise ValueError(f"Unsupported KYC provider: {provider}")
    
    async def check_verification_status(
        self,
        verification_id: str,
        provider: str
    ) -> Dict:
        """Check KYC verification status"""
        
        if provider == "persona" and self.persona:
            inquiry = self.persona.get_inquiry_status(verification_id)
            status = inquiry["data"]["attributes"]["status"]
            kyc_level = self.persona.get_verification_level(inquiry)
            
            return {
                "status": status,
                "kyc_level": kyc_level,
                "data": inquiry
            }
        
        elif provider == "sumsub" and self.sumsub:
            status_data = self.sumsub.get_applicant_status(verification_id)
            kyc_level = self.sumsub.get_verification_level(status_data)
            
            return {
                "status": status_data.get("reviewStatus"),
                "kyc_level": kyc_level,
                "data": status_data
            }
        
        else:
            raise ValueError(f"Unsupported KYC provider: {provider}")
    
    async def submit_to_blockchain(
        self,
        wallet_address: str,
        kyc_level: int,
        provider: str,
        jurisdiction: str,
        kyc_data: Dict
    ) -> str:
        """Submit KYC verification to blockchain"""
        
        # Create privacy-preserving hash of KYC data
        kyc_hash = self._hash_kyc_data(kyc_data)
        
        # Build transaction
        tx = compliance_registry.functions.verifyKYC(
            wallet_address,
            kyc_level,
            provider,
            jurisdiction,
            kyc_hash,
            12  # 12 months expiry
        ).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 300000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign and send
        signed_tx = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        print(f"✅ KYC verified on-chain for {wallet_address}")
        print(f"   Level: {kyc_level}")
        print(f"   Provider: {provider}")
        print(f"   TX: {tx_hash.hex()}")
        
        # Wait for confirmation
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        return tx_hash.hex()
    
    def _hash_kyc_data(self, kyc_data: Dict) -> bytes:
        """Create privacy-preserving hash of KYC data"""
        # Extract only essential fields for hashing
        essential_data = {
            "name": kyc_data.get("name"),
            "dob": kyc_data.get("date_of_birth"),
            "country": kyc_data.get("country"),
            "verified_at": kyc_data.get("verified_at")
        }
        
        data_str = json.dumps(essential_data, sort_keys=True)
        return w3.keccak(text=data_str)
    
    async def check_sanctions(self, wallet_address: str) -> bool:
        """Check if address is on sanctions list (OFAC, etc.)"""
        # In production, integrate with Chainalysis, Elliptic, or TRM Labs
        # For now, check on-chain registry
        is_sanctioned = compliance_registry.functions.sanctionedAddresses(wallet_address).call()
        return is_sanctioned
    
    async def get_user_compliance(self, wallet_address: str) -> Dict:
        """Get user's compliance status from blockchain"""
        compliance_data = compliance_registry.functions.getUserCompliance(wallet_address).call()
        
        return {
            "kyc_level": compliance_data[0],
            "status": compliance_data[1],
            "verified_at": compliance_data[2],
            "expires_at": compliance_data[3],
            "provider": compliance_data[4],
            "jurisdiction": compliance_data[6],
            "is_accredited": compliance_data[7],
            "is_sanctioned": compliance_data[8],
            "risk_score": compliance_data[9]
        }


# Example usage
async def main():
    service = ComplianceService()
    
    # Example: Verify user with Persona
    user_data = {
        "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "country": "US"
    }
    
    # Initiate verification
    result = await service.verify_user(
        user_data["wallet_address"],
        user_data,
        provider="persona"
    )
    
    print(f"KYC Inquiry Created: {result['inquiry_id']}")
    print(f"Complete verification at: {result['inquiry_url']}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
