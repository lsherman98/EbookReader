# AI Reader

A modern web application for reading and managing books with AI-powered features, built with React, TypeScript, Vite, and PocketBase.

## Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (package manager)
- **Go** (v1.24.1 or higher)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ai-reader
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

## Running the Project

### Development Mode

You need to run both the frontend and backend servers:

1. **Start the PocketBase backend**

   ```bash
   pnpm run pb:serve
   ```

   This will start the PocketBase server on `http://localhost:8092`

2. **Start the Vite development server** (in a new terminal)

   ```bash
   pnpm run dev
   ```

   This will start the frontend development server (typically on `http://localhost:5173`)

3. **Open your browser** and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

## Building for Production

1. **Build the frontend**

   ```bash
   pnpm run build
   ```

2. **Build the PocketBase backend**
   ```bash
   pnpm run pb:build
   ```

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Tanstack Router
- **Backend**: PocketBase (Go-based backend)
- **Editor**: Plate.js (rich text editor)
- **Styling**: TailwindCSS, Radix UI
