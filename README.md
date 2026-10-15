# CCN CSE HUB

A full-stack starter for the CCN University of Science & Technology CSE 18th Batch question library.

## Stack
- Client: React + TypeScript + Vite
- API: Express + TypeScript
- Database: MongoDB Atlas + Mongoose
- Authentication: JWT in an HttpOnly cookie, bcrypt password hashing
- UI: responsive dark navy / gold design with CSS animations

**Important:** Semester and subject lists are intentionally not hardcoded as official curriculum. Admins create subjects and questions based on verified course information.

## Requirements
- Node.js 20+
- MongoDB Atlas database (or local MongoDB)
- Git (optional)

## 1. Configure the API
```bash
cd server
cp .env.example .env
```
On Windows CMD, use `copy .env.example .env` instead of `cp`.

Set `MONGODB_URI`, a long random `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `server/.env`.
Do not commit `.env` to Git.

## 2. Install and run locally
Open two terminals:

Terminal A:
```bash
cd server
npm install
npm run dev
```

Terminal B:
```bash
cd client
npm install
npm run dev
```
Open the URL Vite prints (normally http://localhost:5173).

The server creates the initial admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD` on startup if it doesn't already exist. Keep those credentials private and change them before production.

## 3. What is included
- Public question library and search
- Filters for semester, subject, exam type and question type
- Public question detail cards with answers
- Admin login
- Admin create/edit/delete/publish question flow
- Subject creation through the question editor's subject field
- MongoDB persistence
- Responsive design and motion effects

## 4. Before public launch
1. Use a strong unique admin password and a long random JWT secret.
2. Deploy the API with `server` as the root directory on Render or another Node host.
3. Set the server environment variables from `.env.example` in the hosting dashboard.
4. Deploy `client` on Vercel with `VITE_API_URL` set to the deployed API base URL (include `/api`, e.g. `https://your-api.onrender.com/api`).
5. Set API `CLIENT_ORIGIN` to the exact Vercel website origin, e.g. `https://your-site.vercel.app`.
6. If using a custom domain, update both values accordingly.
7. The sample uses cookies; HTTPS is required in production. Never put admin credentials in frontend code.
8. Add real official course titles/subjects only after checking the university's current curriculum.

## API overview
- `GET /api/health`
- `GET /api/questions` (public published questions)
- `GET /api/questions/:id` (public published question)
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/admin/questions` (admin)
- `POST /api/admin/questions` (admin)
- `PUT /api/admin/questions/:id` (admin)
- `DELETE /api/admin/questions/:id` (admin)

## Notes
This is a functional starter, not a university-endorsed service. Use the university name descriptively and don't use an official logo without permission.
