"""
Tax Reporting Service
Generates tax reports for freelancers including 1099, W-8BEN, and transaction history
"""

import os
import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import csv
import io
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Configuration
POLYGON_RPC = os.getenv("POLYGON_AMOY_RPC", "https://rpc-amoy.polygon.technology")
ESCROW_ADDRESS = os.getenv("FREELANCE_ESCROW_ADDRESS")


class TaxReportingService:
    """Generate tax reports for freelancers"""
    
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(POLYGON_RPC))
        # Load contract ABIs as needed
    
    def get_annual_earnings(
        self,
        wallet_address: str,
        year: int
    ) -> Dict:
        """
        Calculate total earnings for tax year
        Required for 1099-NEC (US) and similar forms
        """
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31, 23, 59, 59)
        
        # Query blockchain for all payments received
        # In production, use The Graph or event logs
        transactions = self._get_transactions(
            wallet_address,
            start_date.timestamp(),
            end_date.timestamp()
        )
        
        total_earnings = Decimal(0)
        earnings_by_client = {}
        earnings_by_token = {}
        
        for tx in transactions:
            amount = Decimal(tx["amount"])
            client = tx["client"]
            token = tx["token"]
            
            total_earnings += amount
            
            if client not in earnings_by_client:
                earnings_by_client[client] = Decimal(0)
            earnings_by_client[client] += amount
            
            if token not in earnings_by_token:
                earnings_by_token[token] = Decimal(0)
            earnings_by_token[token] += amount
        
        return {
            "year": year,
            "wallet_address": wallet_address,
            "total_earnings_usd": float(total_earnings),
            "earnings_by_client": {k: float(v) for k, v in earnings_by_client.items()},
            "earnings_by_token": {k: float(v) for k, v in earnings_by_token.items()},
            "transaction_count": len(transactions),
            "generated_at": datetime.now().isoformat()
        }
    
    def generate_1099_nec(
        self,
        freelancer_data: Dict,
        client_data: Dict,
        year: int,
        amount: Decimal
    ) -> Dict:
        """
        Generate 1099-NEC form data (US non-employee compensation)
        Required for US freelancers earning >$600 from a single client
        """
        return {
            "form_type": "1099-NEC",
            "tax_year": year,
            "payer": {
                "name": client_data.get("business_name"),
                "tin": client_data.get("ein"),  # Employer Identification Number
                "address": client_data.get("address"),
                "city": client_data.get("city"),
                "state": client_data.get("state"),
                "zip": client_data.get("zip")
            },
            "recipient": {
                "name": f"{freelancer_data['first_name']} {freelancer_data['last_name']}",
                "tin": freelancer_data.get("ssn") or freelancer_data.get("ein"),
                "address": freelancer_data.get("address"),
                "city": freelancer_data.get("city"),
                "state": freelancer_data.get("state"),
                "zip": freelancer_data.get("zip")
            },
            "box_1_nonemployee_compensation": float(amount),
            "generated_at": datetime.now().isoformat(),
            "filing_deadline": f"{year + 1}-01-31"
        }
    
    def generate_w8ben(
        self,
        freelancer_data: Dict
    ) -> Dict:
        """
        Generate W-8BEN form data (Certificate of Foreign Status)
        Required for non-US freelancers to claim tax treaty benefits
        """
        return {
            "form_type": "W-8BEN",
            "part_1": {
                "name": f"{freelancer_data['first_name']} {freelancer_data['last_name']}",
                "country_of_citizenship": freelancer_data.get("country"),
                "permanent_residence_address": {
                    "address": freelancer_data.get("address"),
                    "city": freelancer_data.get("city"),
                    "country": freelancer_data.get("country")
                },
                "mailing_address": freelancer_data.get("mailing_address"),
                "us_tin": freelancer_data.get("us_tin"),  # If applicable
                "foreign_tin": freelancer_data.get("foreign_tin"),
                "reference_number": freelancer_data.get("wallet_address")
            },
            "part_2": {
                "claim_treaty_benefits": freelancer_data.get("claim_treaty", False),
                "treaty_country": freelancer_data.get("treaty_country"),
                "treaty_article": freelancer_data.get("treaty_article"),
                "withholding_rate": freelancer_data.get("withholding_rate", 30)
            },
            "certification": {
                "signed_date": datetime.now().isoformat(),
                "capacity": "Individual"
            },
            "generated_at": datetime.now().isoformat()
        }
    
    def generate_transaction_report_csv(
        self,
        wallet_address: str,
        start_date: datetime,
        end_date: datetime
    ) -> str:
        """
        Generate CSV transaction report for tax filing
        """
        transactions = self._get_transactions(
            wallet_address,
            start_date.timestamp(),
            end_date.timestamp()
        )
        
        output = io.StringIO()
        fieldnames = [
            "Date",
            "Transaction Hash",
            "Type",
            "Client",
            "Amount (USD)",
            "Token",
            "Token Amount",
            "Exchange Rate",
            "Job ID",
            "Description",
            "Category"
        ]
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for tx in transactions:
            writer.writerow({
                "Date": datetime.fromtimestamp(tx["timestamp"]).strftime("%Y-%m-%d"),
                "Transaction Hash": tx["tx_hash"],
                "Type": tx["type"],
                "Client": tx["client"],
                "Amount (USD)": f"${tx['amount']:.2f}",
                "Token": tx["token_symbol"],
                "Token Amount": tx["token_amount"],
                "Exchange Rate": tx["exchange_rate"],
                "Job ID": tx["job_id"],
                "Description": tx["description"],
                "Category": tx["category"]
            })
        
        return output.getvalue()
    
    def generate_quarterly_report(
        self,
        wallet_address: str,
        year: int,
        quarter: int
    ) -> Dict:
        """
        Generate quarterly earnings report
        Useful for estimated tax payments (US Form 1040-ES)
        """
        quarter_dates = {
            1: (datetime(year, 1, 1), datetime(year, 3, 31)),
            2: (datetime(year, 4, 1), datetime(year, 6, 30)),
            3: (datetime(year, 7, 1), datetime(year, 9, 30)),
            4: (datetime(year, 10, 1), datetime(year, 12, 31))
        }
        
        start_date, end_date = quarter_dates[quarter]
        
        transactions = self._get_transactions(
            wallet_address,
            start_date.timestamp(),
            end_date.timestamp()
        )
        
        total_income = sum(Decimal(tx["amount"]) for tx in transactions)
        
        # Estimate self-employment tax (US: 15.3% of 92.35% of net earnings)
        estimated_se_tax = total_income * Decimal("0.9235") * Decimal("0.153")
        
        # Estimate income tax (simplified - actual calculation depends on bracket)
        estimated_income_tax = total_income * Decimal("0.22")  # Assume 22% bracket
        
        total_estimated_tax = estimated_se_tax + estimated_income_tax
        
        return {
            "year": year,
            "quarter": quarter,
            "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "gross_income": float(total_income),
            "estimated_self_employment_tax": float(estimated_se_tax),
            "estimated_income_tax": float(estimated_income_tax),
            "total_estimated_tax": float(total_estimated_tax),
            "payment_due_date": self._get_quarterly_due_date(year, quarter),
            "transaction_count": len(transactions),
            "generated_at": datetime.now().isoformat()
        }
    
    def generate_expense_report(
        self,
        wallet_address: str,
        year: int
    ) -> Dict:
        """
        Generate deductible business expenses report
        """
        # In production, integrate with expense tracking system
        expenses = self._get_expenses(wallet_address, year)
        
        expense_categories = {
            "platform_fees": Decimal(0),
            "gas_fees": Decimal(0),
            "software_subscriptions": Decimal(0),
            "equipment": Decimal(0),
            "professional_services": Decimal(0),
            "education": Decimal(0),
            "other": Decimal(0)
        }
        
        for expense in expenses:
            category = expense.get("category", "other")
            amount = Decimal(expense["amount"])
            
            if category in expense_categories:
                expense_categories[category] += amount
            else:
                expense_categories["other"] += amount
        
        total_expenses = sum(expense_categories.values())
        
        return {
            "year": year,
            "wallet_address": wallet_address,
            "expense_categories": {k: float(v) for k, v in expense_categories.items()},
            "total_expenses": float(total_expenses),
            "generated_at": datetime.now().isoformat()
        }
    
    def generate_crypto_tax_report(
        self,
        wallet_address: str,
        year: int
    ) -> Dict:
        """
        Generate cryptocurrency gains/losses report
        Required for IRS Form 8949 (US) and similar forms
        """
        transactions = self._get_crypto_transactions(wallet_address, year)
        
        capital_gains = []
        total_short_term_gains = Decimal(0)
        total_long_term_gains = Decimal(0)
        
        for tx in transactions:
            holding_period = tx["sell_date"] - tx["buy_date"]
            is_long_term = holding_period > timedelta(days=365)
            
            cost_basis = Decimal(tx["buy_price"]) * Decimal(tx["amount"])
            proceeds = Decimal(tx["sell_price"]) * Decimal(tx["amount"])
            gain_loss = proceeds - cost_basis
            
            capital_gains.append({
                "asset": tx["token_symbol"],
                "buy_date": tx["buy_date"].strftime("%Y-%m-%d"),
                "sell_date": tx["sell_date"].strftime("%Y-%m-%d"),
                "amount": float(tx["amount"]),
                "cost_basis": float(cost_basis),
                "proceeds": float(proceeds),
                "gain_loss": float(gain_loss),
                "term": "Long-term" if is_long_term else "Short-term"
            })
            
            if is_long_term:
                total_long_term_gains += gain_loss
            else:
                total_short_term_gains += gain_loss
        
        return {
            "year": year,
            "wallet_address": wallet_address,
            "capital_gains": capital_gains,
            "total_short_term_gains": float(total_short_term_gains),
            "total_long_term_gains": float(total_long_term_gains),
            "total_capital_gains": float(total_short_term_gains + total_long_term_gains),
            "generated_at": datetime.now().isoformat()
        }
    
    def _get_transactions(
        self,
        wallet_address: str,
        start_timestamp: float,
        end_timestamp: float
    ) -> List[Dict]:
        """Fetch transactions from blockchain"""
        # In production, use The Graph or event logs
        # This is a placeholder
        return [
            {
                "timestamp": 1704067200,
                "tx_hash": "0x123...",
                "type": "payment_received",
                "client": "0xabc...",
                "amount": 5000.00,
                "token": "USDC",
                "token_symbol": "USDC",
                "token_amount": 5000,
                "exchange_rate": 1.0,
                "job_id": 1,
                "description": "Web development services",
                "category": "Software Development"
            }
        ]
    
    def _get_expenses(self, wallet_address: str, year: int) -> List[Dict]:
        """Fetch business expenses"""
        # Placeholder - integrate with expense tracking
        return []
    
    def _get_crypto_transactions(self, wallet_address: str, year: int) -> List[Dict]:
        """Fetch crypto buy/sell transactions"""
        # Placeholder - integrate with DEX aggregator
        return []
    
    def _get_quarterly_due_date(self, year: int, quarter: int) -> str:
        """Get quarterly estimated tax payment due date"""
        due_dates = {
            1: f"{year}-04-15",
            2: f"{year}-06-15",
            3: f"{year}-09-15",
            4: f"{year + 1}-01-15"
        }
        return due_dates[quarter]


# Example usage
if __name__ == "__main__":
    tax_service = TaxReportingService()
    
    # Generate annual earnings report
    earnings = tax_service.get_annual_earnings(
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        2025
    )
    print("Annual Earnings:", json.dumps(earnings, indent=2))
    
    # Generate quarterly report
    quarterly = tax_service.generate_quarterly_report(
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        2025,
        4
    )
    print("\nQ4 2025 Report:", json.dumps(quarterly, indent=2))
