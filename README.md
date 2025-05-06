# TaskFlow

A full-stack task management platform built with React, Node.js, Express, and MongoDB. It includes features such as board and ticket creation, real-time collaboration with Socket.io, user authentication, calendar integration with Google Calendar API, and AI-powered ticket generation using OpenAI.

## Table of Contents

* [Features](#features)
* [Prerequisites](#prerequisites)
* [Getting Started](#getting-started)
* [Running the Application](#running-the-application)
* [Project Structure](#project-structure)
* [Environment Variables](#environment-variables)
* [Scripts](#scripts)
* [Technologies Used](#technologies-used)

## Features

* User authentication (register, login, profile management)
* Create and manage boards
* Create, assign, and comment on tickets
* Real-time notifications and updates (Socket.io)
* Google Calendar integration
* AI-powered ticket generation
* File upload support (comments and profile pictures)
* Daily standup reports using OpenAI

## Prerequisites

Make sure you have the following installed:

* Node.js (v16 or higher recommended)
* MongoDB (start locally using Homebrew on macOS: `brew services start mongodb-community`)
* npm
* Google account for calendar integration

Required npm packages (will be installed during setup):

* `express`, `mongoose`, `bcrypt`, `dotenv`, `cors`
* `axios`, `openai`, `socket.io`, `googleapis`, `ejs`
* `react`, `react-dom`, `react-router-dom`, `react-calendar`, `react-datepicker`
* `cypress` (for UI testing)

## Getting Started

1. **Clone the repository:**

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

2. **Install dependencies for both client and server:**

```bash
cd backend
npm install

cd ../frontend
npm install
```

3. **Setup your `.env` files**

Create `.env` files in both `backend/` and `frontend/` directories based on `.env.example`.

## Running the Application

1. **Start the MongoDB service (macOS):**

```bash
brew services start mongodb-community
```

2. **Run the backend:**

```bash
cd backend
npm run dev
```

3. **Run the frontend:**

```bash
cd frontend
npm start
```

4. **Open Cypress for UI testing:**

```bash
npx cypress open
```

## Project Structure

```
root/
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── Uploads/
│   ├── .env
│   └── server.js
├── frontend/
│   ├── src/
│   ├── public/
│   ├── .env
│   └── package.json
└── README.md
```

## Environment Variables

Create `.env` file in `backend/` 

### `.env.example` (Backend)

```
PORT=5000
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_google_redirect_uri
```


## Scripts

### Backend

* `npm run dev`: Runs backend using `nodemon`

### Frontend

* `npm start`: Runs frontend in development mode
* `npm run build`: Builds frontend for production

### Cypress

* `npx cypress open`: Opens Cypress UI
* `npx cypress run`: Runs all Cypress tests in CLI

## Technologies Used

* **Frontend:** React, React Router, Axios, React Calendar, React Datepicker
* **Backend:** Express, MongoDB, Mongoose, JWT, bcrypt, dotenv
* **Real-Time:** Socket.io
* **Testing:** Cypress
* **AI:** OpenAI API
* **Calendar:** Google Calendar API
* **UI Templating:** EJS (for email templates or server-side rendering if used)
