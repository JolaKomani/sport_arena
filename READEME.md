# Sport Zone

# Frontend (React + Vite)
```
cd front
npm install
npm run dev
```
Vite runs on `http://localhost:5173/`.

# Backend (Django)
# Navigate to backend directory
```
cd back
```

# Create virtual environment
```
python -m venv .venv
```

# Activate virtual environment (Windows)
```
.\.venv\Scripts\activate
```

# Upgrade pip and install dependencies
```
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

# Apply database migrations
```
python manage.py migrate
```

# MongoDB (notifications — required when MONGODB_URI is set in `.env`)
Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) locally, or run Docker:
```
docker run -d --name sportz-mongo -p 27017:27017 mongo:7
```
Copy `back/.env.example` to `back/.env` and set:
```
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=sportz
```
Then create indexes:
```
python manage.py ensure_mongo_indexes
```
Without `MONGODB_URI`, notifications fall back to the SQL `Notifications` table.

# Populate database with sample data
```
python manage.py populate
```

# Run development server (HTTP + WebSockets via Daphne)
```
python manage.py runserver
```
WebSocket notifications: `ws://127.0.0.1:8000/ws/notifications/?token=<access_token>` (JWT from login).

When using Vite (`localhost:5173`), the bell connects to Django on port **8000** for live updates. Check the bell icon: a green **●** means live WebSocket is connected.

**MongoDB is only for storing notifications** (optional). Live delivery uses WebSockets, not Mongo. If `MONGODB_URI` is set but Mongo is not running, the app falls back to SQL automatically.

# Notes
- For Django pages (`/`, `/matches/`, `/squads/`, `/users/...`) the backend serves `front/html/spa.html`.
- In development it loads the Vite dev server automatically; in production run `npm run build` to generate `front/dist/`.

# Open in browser:
### http://127.0.0.1:8000/