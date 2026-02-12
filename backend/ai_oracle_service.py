"""
AI Oracle Backend Service
Handles verification requests from the AIOracle smart contract
"""

import os
import json
import asyncio
from typing import Dict, List, Optional
from datetime import datetime
from web3 import Web3
from eth_account import Account
from openai import OpenAI
import requests
from dotenv import load_dotenv

load_dotenv()

# Configuration
POLYGON_RPC = os.getenv("POLYGON_AMOY_RPC", "https://rpc-amoy.polygon.technology")
PRIVATE_KEY = os.getenv("ORACLE_PRIVATE_KEY")
AI_ORACLE_ADDRESS = os.getenv("AI_ORACLE_ADDRESS")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
IPFS_GATEWAY = "https://ipfs.io/ipfs/"

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(POLYGON_RPC))
account = Account.from_key(PRIVATE_KEY)

# Initialize OpenAI
client = OpenAI(api_key=OPENAI_API_KEY)

# Load AIOracle ABI
with open("../contracts/artifacts/contracts/AIOracle.sol/AIOracle.json") as f:
    ai_oracle_abi = json.load(f)["abi"]

ai_oracle = w3.eth.contract(address=AI_ORACLE_ADDRESS, abi=ai_oracle_abi)


class AIVerificationService:
    """Service for AI-powered verification of milestones, invoices, and assets"""
    
    def __init__(self):
        self.pending_requests = {}
        
    async def fetch_ipfs_content(self, ipfs_hash: str) -> Optional[Dict]:
        """Fetch proof documents from IPFS"""
        try:
            # Remove ipfs:// prefix if present
            ipfs_hash = ipfs_hash.replace("ipfs://", "")
            url = f"{IPFS_GATEWAY}{ipfs_hash}"
            
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            # Try to parse as JSON
            try:
                return response.json()
            except:
                # If not JSON, return text content
                return {"content": response.text}
                
        except Exception as e:
            print(f"Error fetching IPFS content: {e}")
            return None
    
    async def verify_milestone(self, request_data: Dict) -> Dict:
        """Verify milestone completion using AI analysis"""
        proof_data = await self.fetch_ipfs_content(request_data["proofDataURI"])
        
        if not proof_data:
            return {
                "approved": False,
                "confidence": 0,
                "response": "Failed to fetch proof documents"
            }
        
        # Prepare prompt for GPT-4
        prompt = f"""
        You are an AI verification agent for a freelance marketplace. Analyze the following milestone completion proof:
        
        Milestone Description: {request_data.get("description", "N/A")}
        Proof Documents: {json.dumps(proof_data, indent=2)}
        
        Evaluate:
        1. Does the proof demonstrate milestone completion?
        2. Is the quality of work acceptable?
        3. Are all deliverables present?
        4. Are there any red flags or concerns?
        
        Provide:
        - approved: true/false
        - confidence: 0-100 (your confidence in the assessment)
        - reasoning: detailed explanation
        
        Respond in JSON format.
        """
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a professional work verification agent. Be thorough but fair."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            
            result = json.loads(response.choices[0].message.content)
            
            return {
                "approved": result.get("approved", False),
                "confidence": min(100, max(0, result.get("confidence", 0))),
                "response": result.get("reasoning", "AI analysis completed")
            }
            
        except Exception as e:
            print(f"Error in AI verification: {e}")
            return {
                "approved": False,
                "confidence": 0,
                "response": f"AI verification error: {str(e)}"
            }
    
    async def verify_invoice(self, request_data: Dict) -> Dict:
        """Verify invoice authenticity using AI analysis"""
        proof_data = await self.fetch_ipfs_content(request_data["proofDataURI"])
        
        if not proof_data:
            return {
                "approved": False,
                "confidence": 0,
                "response": "Failed to fetch invoice documents"
            }
        
        prompt = f"""
        You are an AI invoice verification agent. Analyze the following invoice:
        
        Invoice Data: {json.dumps(proof_data, indent=2)}
        
        Verify:
        1. Is this a legitimate invoice?
        2. Are all required fields present (debtor, amount, due date)?
        3. Does the invoice match standard business formats?
        4. Are there any signs of fraud or manipulation?
        
        Provide:
        - approved: true/false
        - confidence: 0-100
        - reasoning: detailed explanation
        
        Respond in JSON format.
        """
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a professional invoice verification agent. Detect fraud and ensure authenticity."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            
            result = json.loads(response.choices[0].message.content)
            
            return {
                "approved": result.get("approved", False),
                "confidence": min(100, max(0, result.get("confidence", 0))),
                "response": result.get("reasoning", "Invoice verification completed")
            }
            
        except Exception as e:
            print(f"Error in invoice verification: {e}")
            return {
                "approved": False,
                "confidence": 0,
                "response": f"Verification error: {str(e)}"
            }
    
    async def verify_asset(self, request_data: Dict) -> Dict:
        """Verify asset documentation and valuation"""
        proof_data = await self.fetch_ipfs_content(request_data["proofDataURI"])
        
        if not proof_data:
            return {
                "approved": False,
                "confidence": 0,
                "response": "Failed to fetch asset documents"
            }
        
        prompt = f"""
        You are an AI asset verification agent. Analyze the following asset documentation:
        
        Asset Data: {json.dumps(proof_data, indent=2)}
        
        Verify:
        1. Is the asset documentation complete?
        2. Is the valuation reasonable?
        3. Are legal documents present?
        4. Are there any compliance issues?
        
        Provide:
        - approved: true/false
        - confidence: 0-100
        - reasoning: detailed explanation
        
        Respond in JSON format.
        """
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a professional asset verification agent. Ensure documentation quality and compliance."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            
            result = json.loads(response.choices[0].message.content)
            
            return {
                "approved": result.get("approved", False),
                "confidence": min(100, max(0, result.get("confidence", 0))),
                "response": result.get("reasoning", "Asset verification completed")
            }
            
        except Exception as e:
            print(f"Error in asset verification: {e}")
            return {
                "approved": False,
                "confidence": 0,
                "response": f"Verification error: {str(e)}"
            }
    
    async def submit_verification_result(self, request_id: int, result: Dict):
        """Submit verification result to the smart contract"""
        try:
            # Build transaction
            tx = ai_oracle.functions.submitVerification(
                request_id,
                result["approved"],
                result["confidence"],
                result["response"][:500]  # Limit response length
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 500000,
                'gasPrice': w3.eth.gas_price
            })
            
            # Sign and send
            signed_tx = account.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            print(f"✅ Submitted verification for request {request_id}")
            print(f"   TX: {tx_hash.hex()}")
            
            # Wait for confirmation
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            return receipt
            
        except Exception as e:
            print(f"❌ Error submitting verification: {e}")
            return None
    
    async def process_verification_request(self, event: Dict):
        """Process a verification request event"""
        request_id = event["args"]["requestId"]
        target_contract = event["args"]["targetContract"]
        target_id = event["args"]["targetId"]
        verification_type = event["args"]["verificationType"]
        
        print(f"\n🔍 Processing verification request #{request_id}")
        print(f"   Type: {verification_type}")
        print(f"   Contract: {target_contract}")
        print(f"   Target ID: {target_id}")
        
        # Fetch full request data from contract
        request_data = ai_oracle.functions.getRequest(request_id).call()
        
        request_info = {
            "requestId": request_data[0],
            "requester": request_data[1],
            "targetContract": request_data[2],
            "targetId": request_data[3],
            "verificationType": request_data[4],
            "proofDataURI": request_data[5],
            "status": request_data[6],
            "confidence": request_data[7],
            "aiResponse": request_data[8],
            "timestamp": request_data[9],
            "verifier": request_data[10]
        }
        
        # Route to appropriate verification method
        if verification_type == "milestone":
            result = await self.verify_milestone(request_info)
        elif verification_type == "invoice":
            result = await self.verify_invoice(request_info)
        elif verification_type == "asset":
            result = await self.verify_asset(request_info)
        else:
            result = {
                "approved": False,
                "confidence": 0,
                "response": f"Unknown verification type: {verification_type}"
            }
        
        print(f"   Result: {'✅ APPROVED' if result['approved'] else '❌ REJECTED'}")
        print(f"   Confidence: {result['confidence']}%")
        
        # Submit result to contract
        await self.submit_verification_result(request_id, result)
    
    async def listen_for_events(self):
        """Listen for VerificationRequested events"""
        print("🎧 Listening for verification requests...")
        
        # Get latest block
        latest_block = w3.eth.block_number
        
        # Create event filter
        event_filter = ai_oracle.events.VerificationRequested.create_filter(
            fromBlock=latest_block
        )
        
        while True:
            try:
                # Check for new events
                for event in event_filter.get_new_entries():
                    await self.process_verification_request(event)
                
                # Sleep briefly
                await asyncio.sleep(5)
                
            except Exception as e:
                print(f"Error in event loop: {e}")
                await asyncio.sleep(10)


async def main():
    """Main entry point"""
    print("=" * 60)
    print("🤖 AI Oracle Verification Service")
    print("=" * 60)
    print(f"Oracle Address: {AI_ORACLE_ADDRESS}")
    print(f"Operator Address: {account.address}")
    print(f"Network: Polygon Amoy")
    print("=" * 60)
    
    service = AIVerificationService()
    await service.listen_for_events()


if __name__ == "__main__":
    asyncio.run(main())
