# PlanAtEase – **Smart Travel Itinerary Builder**

PlanAtEase is a full-stack travel planning web application that helps users build, share, and visualise trips effortlessly. It supports guest itineraries, collaborative trip editing, and per-day weather views — combining Django for backend logic and React for a modern, responsive frontend.

---

## 🌐 Live Application

- **Frontend:** https://planatease.site  
- **Backend API:** https://planatease.onrender.com

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React (Vite), Bootstrap 5 |
| Backend | Django & Django REST Framework |
| Database | PostgreSQL |
| Hosting | Render (Backend) & Netlify (Frontend) |
| Authentication | JWT (SimpleJWT) |
| API | Custom Django REST API + external integrations (Weather, Maps) |

---

## 🚀 Key Features

### 👤 Guest & Member Flow
- Guests can start building trips without logging in — data saved locally.  
- Registering or logging in automatically transfers guest trips to the user’s account.

### 🧭 Trip Management
- Create, edit, and delete trips.  
- Add itinerary items with time, description, and location.  
- Interactive per-day **map view** with markers and paths.

### 👥 Collaboration
- Invite other users to join a trip.  
- Role-based permissions: **Owner**, **Editor**, **Viewer**.  
- Live updates for shared itineraries.

### 🌤 Day View & Weather Integration
- Each day includes a mini forecast fetched from a weather API to plan around conditions.

### 🗺 Map Visualisation
- Trips visualised on an interactive map showing all activities.  
- Uses country/city data with dynamic pin placement.

### 📧 Contact Form
- Public contact form that sends email to the designated administrator email.  
- Built-in throttling for spam protection.

### 📱 Responsive Design
- Fully responsive Bootstrap layout for mobile, tablet, and desktop.

---

## ⚙️ Installation & Setup

### Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL**
- **pip**, **virtualenv**

### 1) Clone the Repository
```bash
git clone https://github.com/yourusername/planatease.git
cd planatease
```

### 2) Backend Setup (Django)
```
cd planatease-backend  
python -m venv venv  
source venv/bin/activate  # Windows: venv\Scripts\activate  
pip install -r requirements.txt  
```

Create a `.env` file:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME  
EMAIL_HOST_USER=your-email@example.com  
EMAIL_PASS=your-email-password  
EMAIL_HOST=smtp.yourprovider.com  
DEFAULT_FROM_EMAIL=PlanAtEase <your-email@example.com>  
SECRET_KEY=your-secret-key  
CORS_ALLOWED_ORIGINS=http://localhost:5173  
CSRF_TRUSTED_ORIGINS=http://localhost:5173  
ALLOWED_HOSTS=planatease.site,localhost,127.0.0.1  
FRONTEND_DOMAIN=planatease.site  
FRONTEND_PROTOCOL=https  
SITE_NAME=PlanAtEase  
```

Run migrations and start:

```
python manage.py migrate  
python manage.py runserver  
```

---

### 3) Frontend Setup (React)
```
cd ../planatease-frontend  
npm install  
npm run dev  
```

Create a `.env` (or `.env.local`) file in the frontend:

```
VITE_API_BASE_URL=https://<your_django_project>.onrender.com/api  
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key  
VITE_GOOGLE_MAPS_MAP_ID=your-map-id  
```

---
### 🚢 Deployment

**Backend (Render)**  

**Build Command:**  
```
pip install -r requirements.txt && python manage.py collectstatic --noinput  
```

**Start Command:**  
```
gunicorn <your_django_project>.wsgi:application  
```

**Environment:**  
Set `DATABASE_URL`, `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and email settings.  

---

**Frontend (Netlify)**  

**Build Command:** ```npm run build ``` 
**Publish Directory:** dist  
**Env Vars:**  
```
VITE_API_BASE=https://<your_django_project>.onrender.com/api  
```
---

### ✅ Assignment Requirements Mapping

| Assignment Criterion | Implementation in PlanAtEase |
|----------------------|-------------------------------|
| Frontend concepts | Responsive React + Bootstrap UI; guest trips via localStorage |
| Backend concepts | Django REST Framework; PostgreSQL ORM; role-based permissions |
| Secure web app | JWT auth; throttling; environment variables; CORS configuration |
| Communication | Deployed site with clear documentation and feature descriptions |
| Hosted web app | Live frontend at planatease.site and backend on Render |

---

### 💡 Future Enhancements

- Export trip as a PDF itinerary.  
- Calendar sync (Google/Outlook).  
- Shared expenses and budgeting tools.

