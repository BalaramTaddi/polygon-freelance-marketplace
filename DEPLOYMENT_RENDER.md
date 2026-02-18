# Deploying PolyLance Backend on Render

## Prerequisites
- A GitHub account with this repository pushed.
- A Render account (https://render.com).
- A MongoDB Atlas cluster (free tier is fine).

## Steps

1. **Push to GitHub**: ensure your latest changes are pushed to your GitHub repository.

2. **Create New Web Service on Render**:
   - Go to your Render Dashboard.
   - Click "New +" -> "Web Service".
   - Connect your GitHub repository.

3. **Configure Service**:
   - **Name**: `polylance-backend` (or your choice)
   - **Root Directory**: `backend` (Important!)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Starter)

4. **Environment Variables**:
   Add the following environment variables in the "Environment" tab or during setup:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB Atlas connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/polylance?retryWrites=true&w=majority`)
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `PINATA_API_KEY`: Your Pinata API Key (for IPFS).
   - `PINATA_SECRET_KEY`: Your Pinata Secret Key.
   - `STRIPE_SECRET_KEY`: Your Stripe Secret Key.
   - `FRONTEND_URL`: The URL of your deployed frontend (e.g., `https://your-app.vercel.app`).
   - `PUSH_CHANNEL_PRIVATE_KEY`: (Optional) Private key for Push Protocol notifications.
   - `PUSH_CHANNEL_ADDRESS`: (Optional) Public address for Push Protocol channel.

5. **Deploy**:
   - Click "Create Web Service".
   - Render will build and deploy your backend.
   - Once live, you will get a URL like `https://polylance-backend.onrender.com`.

6. **Update Frontend**:
   - Update your frontend's `VITE_API_BASE_URL` environment variable (in Vercel or locally) to point to this new backend URL (`https://polylance-backend.onrender.com/api`).
   - Redeploy the frontend.

## Troubleshooting
- **Build Failed**: Check the logs. Ensure `package.json` is valid.
- **Runtime Error**: Check logs for missing environment variables or database connection errors.
- **CORS Error**: Ensure `FRONTEND_URL` is set correctly without trailing slashes.
