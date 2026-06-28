# 🚀 WebDev Playground

A modern, full-stack collaborative code playground built with **React**, **Node.js/Express**, **Socket.io**, and **MongoDB**. WebDev Playground supports real-time rendering, execution, and collaboration for **HTML**, **CSS**, and **JavaScript**, paired with an intelligent, streaming **AI Assistant (Myra)** powered by Google Gemini.

![WebDev Playground Screenshot](./public/readme.png)

## 🔗 [Visit the Live Project ✨](https://milind-code-editor.netlify.app/)

---

## 🛠️ Tech Stack

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![CodeMirror](https://img.shields.io/badge/CodeMirror-1E1E1E?style=for-the-badge&logo=codemirror&logoColor=white)
![React Icons](https://img.shields.io/badge/React_Icons-E91E63?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=5B3ADF)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)

<br>

### Frontend

- **Framework & Build Tools**: React 19, Vite
- **Code Editor**: CodeMirror (`@uiw/react-codemirror` with CSS, HTML, JS packs and One Dark theme)
- **Icons**: React Icons (Fa, Md, Io, etc.)
- **Real-Time Communication**: Socket.io-client
- **Styling**: Vanilla CSS with variables for seamless theme toggle

### Backend

- **Server Framework**: Express.js
- **Real-Time Synchronisation**: Socket.io
- **Database (persistence)**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT) & Password Hashing (bcryptjs)
- **AI Integration**: LangChain (`@langchain/core` & `@langchain/google-genai`) for streaming AI responses

---

## ✨ Features

- 🧠 **Multi-Language Web Sandbox**: Instant live rendering for HTML, CSS, and JavaScript.
- 👥 **Real-Time Collaborative Coding**: Create protected developer rooms, share unique links, and code together live. Features automatic cursor synchronization and room administrative controls (admins can delete rooms).
- 🔑 **Secure Authentication**: User sign-up and sign-in powered by JWT. Ensures that only authorized users can create collaborative rooms, open the AI assistant, or download their projects.
- 🤖 **Myra — Streaming AI Assistant**: An integrated AI developer companion powered by Google Gemini. Myra streams code answers chunk-by-chunk and directly injects/updates HTML, CSS, and JS blocks in your playground.
- 💾 **Persisted Chat History**: Conversation histories with Myra are saved securely in MongoDB. Load, continue, or delete past chat rooms at any time.
- 🔀 **Flexible Layouts & Dark Mode**: Seamlessly switch between Split and Tabbed editor layouts. Toggle dark/light theme dynamically.
- 📁 **Download Project Bundle**: Package and download your work with a single click. Bundles your playground code into clean `index.html`, `style.css`, and `script.js` files.
- 🔔 **Interactive Toast Notifications**: Context-driven notifications for actions such as room joining, session logging, and network errors.

---

## 📦 Installation & Setup

### Prerequisites

- Node.js (v16+)
- MongoDB running locally or a MongoDB Atlas cloud URI
- Google Gemini API Key (for the AI Assistant)

### 1. Clone the Repository

```bash
git clone https://github.com/Milind-Yadav07/CodeEditor.git
cd CodeEditor
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory and define the following properties (refer to `.env.example`):

```env
# Server Config
PORT=5000
MONGODB_URI=mongodb://localhost:27017/webdev_playground
JWT_SECRET=your_jwt_secret_key_here
ALLOWED_ORIGIN=http://localhost:5173

# Gemini AI Config
GEMINI_API_KEY=your_gemini_api_key_here

# Frontend Config (Vite)
VITE_API_URL=http://localhost:5000
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Project

Start both the Express backend server and the Vite frontend dev server:

**Start the Backend Server:**

```bash
npm run server
```

**Start the Frontend Dev Server:**

```bash
npm run dev
```

The frontend will run at `http://localhost:5173` and communicate with the backend at `http://localhost:5000`.

---

## 🧪 Usage Guide

1. **Authentication**: Use the **Log In** button on the navbar to Sign In or Create an Account.
2. **Writing Code**: Enter your HTML, CSS, and JS into the corresponding tabs/panes in the editor.
3. **Collaboration**:
   - Open the menu, select **Create New Room**, copy the unique room URL, and share it with your peers.
   - Or, select **Join by Code** and paste a valid room ID to join an ongoing session.
   - Review your created spaces under the **My Active Rooms** history list.
4. **AI Developer Companion**:
   - Toggle the **AI Assistant** from the hamburger menu to open Myra.
   - Type your requests (e.g. _"create a landing page with a glassmorphism card"_).
   - Myra will stream the response and automatically apply the HTML/CSS/JS updates to your editor.
   - View, load, or delete previous AI chat transcripts by opening the **Chat History** icon.
5. **Layouts & Themes**: Toggle between Split & Tabbed layouts, and switch themes using the toggles in the top navbar.
6. **Code Export**: Click **Download Code** in the sidebar menu to get your workspace code as a structured folder.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have any feature enhancements, bug fixes, or design proposals.
