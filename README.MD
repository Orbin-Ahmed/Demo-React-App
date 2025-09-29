# Click Counter App

A full-stack web application with real-time click tracking, distributed across multiple cloud services.

## Live URLs

- **Frontend**: https://click-tracker-firebase.web.app
- **Backend API**: https://click-counter-backend-574048910029.us-central1.run.app
- **GPU Service**: http://146.148.75.22:8000 (Internal)

## Architecture

- **Frontend**: React app with Firebase Authentication
- **Backend**: Node.js (Fastify) API with WebSocket support (Socket.IO)
- **GPU Service**: Python (FastAPI) compute service
- **Database**: Firestore for persistent storage
- **Authentication**: Firebase Authentication (email/password)
- **Real-time**: Socket.IO for live updates across clients

## Features

- User registration and authentication
- Click tracking per user
- Real-time counter updates across multiple browser tabs
- GPU compute integration for processing tasks
- Persistent data storage in Firestore
- Secure API endpoints with Firebase token verification

## Tech Stack

### Frontend
- React 18
- Firebase SDK (Auth & Firestore)
- Socket.IO Client
- Create React App

### Backend
- Node.js 18
- Fastify (Web Framework)
- Socket.IO (WebSockets)
- Firebase Admin SDK
- Axios (HTTP Client)

### GPU Service
- Python 3.11
- FastAPI
- NumPy
- Uvicorn

### Infrastructure
- Google Cloud Platform (GCP)
- Firebase Hosting
- Cloud Run
- Google Compute Engine
- Firestore
- Secret Manager

---

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Redis (optional, for caching)
- Google Cloud SDK
- Firebase CLI

### 1. Clone Repository

```bash
git clone https://github.com/Orbin-Ahmed/Demo-React-App.git
cd YOUR_REPO_NAME
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Create .env file
cat > .env << EOF
REACT_APP_API_URL=http://localhost:3001
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your-app-id
EOF

# Update src/firebase/config.js with your Firebase config

# Start development server
npm start
```

Frontend will run on http://localhost:3000

### 3. Backend Setup

```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
PORT=3001
REDIS_URL=redis://localhost:6379
GPU_SERVICE_URL=http://localhost:8000
GPU_SERVICE_TOKEN=your-gpu-service-secret-token
GOOGLE_APPLICATION_CREDENTIALS=./firebase-admin-key.json
REDIS_TTL=300
CORS_ORIGIN=http://localhost:3000
EOF

# Download Firebase Admin SDK key from Firebase Console
# Place it as firebase-admin-key.json in backend directory

# Start Redis (optional)
redis-server

# Start development server
npm run dev
```

Backend will run on http://localhost:3001

### 4. GPU Service Setup

```bash
cd gpu-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt

# Create .env file
cat > .env << EOF
PORT=8000
HOST=0.0.0.0
GPU_SERVICE_TOKEN=your-gpu-service-secret-token
ENVIRONMENT=development
MAX_COMPUTATION_TIME=30
SIMULATE_GPU_DELAY=2
EOF

# Start service
python main.py
```

GPU service will run on http://localhost:8000

---

## Deployment

### Frontend Deployment (Firebase Hosting)

```bash
cd frontend

# Build for production
npm run build

# Deploy to Firebase
firebase login
firebase init hosting
firebase deploy --only hosting
```

### Backend Deployment (Cloud Run)

```bash
cd backend

# Set up Firebase Admin key in Secret Manager
gcloud secrets create firebase-admin-key --data-file=firebase-admin-key.json

# Grant Secret Manager access
gcloud secrets add-iam-policy-binding firebase-admin-key \
    --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Build and deploy
PROJECT_ID=$(gcloud config get-value project)
gcloud builds submit --tag gcr.io/$PROJECT_ID/click-counter-backend

gcloud run deploy click-counter-backend \
  --image gcr.io/$PROJECT_ID/click-counter-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port=8080 \
  --timeout=300 \
  --set-env-vars="GPU_SERVICE_URL=http://GPU_INTERNAL_IP:8000,GPU_SERVICE_TOKEN=your-token,REDIS_TTL=300,CORS_ORIGIN=https://your-app.web.app" \
  --set-secrets="GOOGLE_APPLICATION_CREDENTIALS=firebase-admin-key:latest"
```

### GPU Service Deployment (Google Compute Engine)

```bash
# Create VM instance
gcloud compute instances create gpu-service-vm \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --image-family=debian-11 \
    --image-project=debian-cloud \
    --boot-disk-size=20GB \
    --tags=gpu-service

# Configure firewall for internal access
gcloud compute firewall-rules create allow-gpu-service-internal \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:8000 \
    --source-ranges=10.0.0.0/8 \
    --target-tags=gpu-service

# SSH into VM
gcloud compute ssh gpu-service-vm --zone=us-central1-a

# On the VM:
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME/gpu-service

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create production .env file
nano .env
# Add production environment variables

# Set up systemd service for auto-start
sudo nano /etc/systemd/system/gpu-service.service
# Copy systemd configuration from docs

sudo systemctl daemon-reload
sudo systemctl start gpu-service
sudo systemctl enable gpu-service
```

---

## Environment Variables

### Frontend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `https://click-counter-backend-574048910029.us-central1.run.app` |
| `REACT_APP_FIREBASE_API_KEY` | Firebase API Key | AIzaSyBB4Tw7Nf4kEWgK_cKs8NkxkhGNDj8PHH4 |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `click-tracker-firebase.firebaseapp.com` |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase Project ID | `click-tracker-firebase` |

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `8080` (Cloud Run) or `3001` (local) |
| `REDIS_URL` | Redis connection string | `redis://host:6379` |
| `GPU_SERVICE_URL` | GPU service endpoint | `http://10.128.0.2:8000` |
| `GPU_SERVICE_TOKEN` | GPU service auth token | `eeaeef6bd2a5786475f45bb5703ddef8` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firebase Admin key path | `./firebase-admin-key.json` |
| `CORS_ORIGIN` | Allowed frontend origin | `https://click-tracker-firebase.web.app` |

### GPU Service (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Service port | `8000` |
| `HOST` | Bind address | `0.0.0.0` |
| `GPU_SERVICE_TOKEN` | Auth token | AIzaSyBB4Tw7Nf4kEWgK_cKs8NkxkhGNDj8PHH4 |
| `ENVIRONMENT` | Environment mode | `production` or `development` |

---

## Security

### Firestore Security Rules

The following rules ensure users can only access their own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userCounts/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Apply these rules in Firebase Console → Firestore → Rules.

### API Security

- **Firebase Token Verification**: All protected backend endpoints verify Firebase ID tokens before processing requests
- **GPU Service Authentication**: GPU service requires Bearer token authentication for all compute endpoints
- **CORS Configuration**: Backend restricts cross-origin requests to specified frontend domains only
- **Secret Management**: Sensitive credentials stored in Google Cloud Secret Manager, not in code

### Network Security

- **GPU Service**: Deployed on private GCE instance with firewall rules restricting access to internal GCP network
- **Backend**: Cloud Run service with HTTPS enforcement
- **Redis**: Not publicly exposed (note: Redis caching currently not implemented due to VPC connector limitations)

### Best Practices Implemented

- Environment variables for all sensitive configuration
- Service account with minimal required permissions
- HTTPS for all external communications
- Token-based authentication for service-to-service communication
- Input validation on all API endpoints

---

## Project Structure

```
.
├── frontend/               # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React context providers
│   │   ├── firebase/      # Firebase configuration
│   │   └── App.js
│   ├── package.json
│   └── Dockerfile
│
├── backend/               # Node.js backend API
│   ├── config/           # Configuration files
│   │   ├── firebase.js   # Firebase Admin setup
│   │   └── redis.js      # Redis client
│   ├── server.js         # Main server file
│   ├── package.json
│   └── Dockerfile
│
├── gpu-service/          # Python GPU service
│   ├── main.py           # FastAPI application
│   ├── models.py         # Pydantic models
│   ├── security.py       # Authentication
│   ├── compute_engine.py # Computation logic
│   ├── requirements.txt
│   └── Dockerfile
│
└── README.md
```

---

## Testing

### Local Testing

1. Start all services (Redis, GPU Service, Backend, Frontend)
2. Open http://localhost:3000
3. Sign up with a test account
4. Test click counter functionality
5. Test real-time updates by opening multiple tabs
6. Test GPU compute button

### Production Testing

1. Visit your Firebase Hosting URL
2. Create a new account
3. Verify click tracking persists
4. Test real-time updates across devices
5. Test GPU computation feature

---

## Known Limitations

- **Redis Caching**: Not implemented in production due to VPC Access Connector setup issues. The app functions correctly using Firestore directly, but lacks the caching layer specified in requirements.

---

## Troubleshooting

### Frontend Issues

**Problem**: Cannot connect to backend
- Check `REACT_APP_API_URL` in `.env`
- Verify backend is running and accessible
- Check CORS settings in backend

**Problem**: Authentication fails
- Verify Firebase configuration in `src/firebase/config.js`
- Check Firebase Console for authentication errors
- Ensure email/password auth is enabled in Firebase

### Backend Issues

**Problem**: Firebase token verification fails
- Ensure `firebase-admin-key.json` is present
- Check `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Verify service account has correct permissions

**Problem**: Cannot connect to GPU service
- Check `GPU_SERVICE_URL` environment variable
- Verify GPU service is running
- Ensure tokens match between services

### GPU Service Issues

**Problem**: Service won't start
- Check Python version (3.11+ required)
- Verify all dependencies installed: `pip install -r requirements.txt`
- Check logs: `sudo journalctl -u gpu-service -f`

---

## API Documentation

### Backend Endpoints

#### Health Check
```
GET /health
Response: { "status": "OK", "timestamp": "2025-09-29T..." }
```

#### Get User Count (Protected)
```
GET /api/count
Headers: Authorization: Bearer <firebase-id-token>
Response: { "count": 5, "userId": "..." }
```

#### Update Count (Protected)
```
POST /api/count
Headers: Authorization: Bearer <firebase-id-token>
Body: { "count": 10 }
Response: { "success": true, "count": 10, "userId": "..." }
```

#### Run GPU Computation (Protected)
```
POST /api/compute
Headers: Authorization: Bearer <firebase-id-token>
Body: { "data": "computation data" }
Response: { "success": true, "result": {...}, "userId": "..." }
```

### GPU Service Endpoints

#### Health Check
```
GET /health
Response: { "status": "healthy", "timestamp": "...", "gpu_available": true }
```

#### Run Computation (Protected)
```
POST /compute
Headers: Authorization: Bearer <gpu-service-token>
Body: {
  "data": "test data",
  "parameters": { "type": "matrix_multiplication", "matrix_size": 100 }
}
Response: { "status": "success", "computation": {...} }
```

---

## Contributing

This is a demonstration project. For improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues or questions:
- Open an issue on GitHub
- Check troubleshooting section above
- Review GCP and Firebase documentation