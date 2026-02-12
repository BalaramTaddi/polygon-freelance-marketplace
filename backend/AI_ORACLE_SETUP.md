# AI Oracle Backend Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements_ai.txt
```

### 2. Configure Environment

Create a `.env` file in the `backend` directory:

```env
# Polygon Network
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology

# Oracle Operator Wallet
ORACLE_PRIVATE_KEY=your_private_key_here

# Contract Address (update after deployment)
AI_ORACLE_ADDRESS=0x...

# OpenAI API
OPENAI_API_KEY=sk-...

# IPFS Gateway (optional)
IPFS_GATEWAY=https://ipfs.io/ipfs/
```

### 3. Run the Service

```bash
python ai_oracle_service.py
```

You should see:
```
============================================================
🤖 AI Oracle Verification Service
============================================================
Oracle Address: 0x...
Operator Address: 0x...
Network: Polygon Amoy
============================================================
🎧 Listening for verification requests...
```

---

## 🔧 How It Works

### Event Listening
The service listens for `VerificationRequested` events from the AIOracle contract:

```python
event_filter = ai_oracle.events.VerificationRequested.create_filter(
    fromBlock=latest_block
)
```

### Verification Flow

1. **Event Detected** → New verification request
2. **Fetch Proof** → Download documents from IPFS
3. **AI Analysis** → GPT-4 analyzes proof quality
4. **Submit Result** → Send verdict to smart contract

### Verification Types

#### Milestone Verification
```python
{
    "approved": true,
    "confidence": 95,
    "response": "Milestone completed. All deliverables present and quality verified."
}
```

#### Invoice Verification
```python
{
    "approved": true,
    "confidence": 88,
    "response": "Invoice is authentic. Standard business format with all required fields."
}
```

#### Asset Verification
```python
{
    "approved": true,
    "confidence": 92,
    "response": "Asset documentation complete. Valuation reasonable and legal docs present."
}
```

---

## 🧪 Testing

### Test with Mock Request

```python
# In Python console
from ai_oracle_service import AIVerificationService
import asyncio

service = AIVerificationService()

# Test milestone verification
test_data = {
    "proofDataURI": "ipfs://Qm...",
    "description": "Complete frontend design"
}

result = asyncio.run(service.verify_milestone(test_data))
print(result)
```

### Test End-to-End

1. Deploy AIOracle contract
2. Grant ORACLE_OPERATOR_ROLE to your wallet
3. Start the service
4. Create a verification request from frontend
5. Watch the service process it automatically

---

## 📊 Monitoring

### Logs
The service outputs detailed logs:

```
🔍 Processing verification request #1
   Type: milestone
   Contract: 0x...
   Target ID: 42
   Result: ✅ APPROVED
   Confidence: 95%
✅ Submitted verification for request 1
   TX: 0x...
```

### Metrics to Track
- Requests processed per hour
- Average confidence score
- Approval rate
- Response time
- Gas costs

---

## 🔐 Security Best Practices

### 1. Secure Private Key
```bash
# Never commit .env file
echo ".env" >> .gitignore

# Use environment variables in production
export ORACLE_PRIVATE_KEY="..."
```

### 2. Rate Limiting
```python
# Add rate limiting to prevent abuse
from ratelimit import limits, sleep_and_retry

@sleep_and_retry
@limits(calls=10, period=60)  # 10 requests per minute
async def verify_milestone(self, request_data):
    # ... implementation
```

### 3. Error Handling
```python
try:
    result = await self.verify_milestone(request_data)
except Exception as e:
    # Log error and return safe default
    logger.error(f"Verification failed: {e}")
    return {
        "approved": False,
        "confidence": 0,
        "response": "Verification service error"
    }
```

---

## 🚀 Production Deployment

### Option 1: Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements_ai.txt .
RUN pip install -r requirements_ai.txt

COPY ai_oracle_service.py .
COPY .env .

CMD ["python", "ai_oracle_service.py"]
```

```bash
docker build -t ai-oracle-service .
docker run -d --name oracle ai-oracle-service
```

### Option 2: Systemd Service

```ini
# /etc/systemd/system/ai-oracle.service
[Unit]
Description=AI Oracle Verification Service
After=network.target

[Service]
Type=simple
User=oracle
WorkingDirectory=/opt/ai-oracle
ExecStart=/usr/bin/python3 ai_oracle_service.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ai-oracle
sudo systemctl start ai-oracle
sudo systemctl status ai-oracle
```

### Option 3: Cloud (AWS/GCP)

```bash
# Deploy to AWS Lambda
pip install -t package -r requirements_ai.txt
cd package && zip -r ../lambda.zip .
cd .. && zip -g lambda.zip ai_oracle_service.py

aws lambda create-function \
  --function-name ai-oracle-service \
  --runtime python3.11 \
  --handler ai_oracle_service.main \
  --zip-file fileb://lambda.zip
```

---

## 🐛 Troubleshooting

### Issue: "Connection refused"
**Solution**: Check RPC endpoint and network connectivity
```bash
curl https://rpc-amoy.polygon.technology
```

### Issue: "Insufficient funds"
**Solution**: Fund oracle operator wallet with MATIC
```bash
# Check balance
cast balance $ORACLE_ADDRESS --rpc-url $POLYGON_AMOY_RPC
```

### Issue: "OpenAI rate limit"
**Solution**: Implement exponential backoff
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
async def call_openai_api(self, prompt):
    # ... implementation
```

### Issue: "IPFS timeout"
**Solution**: Use multiple gateways
```python
IPFS_GATEWAYS = [
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://gateway.pinata.cloud/ipfs/"
]
```

---

## 📈 Scaling

### Horizontal Scaling
Run multiple instances with load balancing:

```python
# Add instance ID to prevent duplicate processing
INSTANCE_ID = os.getenv("INSTANCE_ID", "1")

# Process only requests matching instance
if request_id % NUM_INSTANCES == int(INSTANCE_ID):
    await self.process_verification_request(event)
```

### Database Integration
Store verification history:

```python
import psycopg2

# Save to database
cursor.execute("""
    INSERT INTO verifications (request_id, result, confidence, timestamp)
    VALUES (%s, %s, %s, %s)
""", (request_id, result["approved"], result["confidence"], datetime.now()))
```

---

## 💰 Cost Estimation

### OpenAI API Costs
- GPT-4o: ~$0.01 per verification
- 1000 verifications/day = $10/day = $300/month

### Gas Costs
- submitVerification: ~120,000 gas
- At 50 Gwei: ~$0.15 per submission
- 1000 submissions/day = $150/day = $4,500/month

### Total Monthly Cost
- API: $300
- Gas: $4,500
- Infrastructure: $100
- **Total: ~$5,000/month**

**Revenue**: 2.5% fee on $1M volume = $25,000/month  
**Profit**: $20,000/month 💰

---

## 📞 Support

- **Issues**: github.com/polylance/issues
- **Discord**: discord.gg/polylance
- **Email**: dev@polylance.io

---

**Happy Verifying! 🤖**
