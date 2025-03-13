# Drug Discovery Platform

A web application that helps in drug discovery using the Gemini API and molecular structure analysis. The application allows users to upload CSV datasets, analyze molecular structures, and get predictions about drug existence and properties.

## Features

- CSV dataset upload and processing
- Molecular structure visualization
- Molecular formula analysis
- Drug existence prediction
- Property analysis using Gemini API
- 3D molecular structure viewer

## Prerequisites

- Python 3.8+
- Node.js 14+
- Google Gemini API key

## Setup

1. Clone the repository
2. Set up the backend:
   ```bash
   cd backend
   pip install -r ../requirements.txt
   cp ../.env.example .env
   # Edit .env file with your Gemini API key
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   ```

## Running the Application

1. Start the backend server:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Upload a CSV file containing molecular data (optional)
2. Enter the molecular formula
3. Enter the molecular structure in SMILES format
4. Add any additional properties as JSON
5. Click "Analyze Molecule" to get results

## API Endpoints

- `POST /upload-csv`: Upload and process CSV dataset
- `POST /analyze-molecule`: Analyze molecular structure and properties

## Environment Variables

Create a `.env` file in the backend directory with the following variables:
```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8000
HOST=0.0.0.0
```

## Technologies Used

- Backend:
  - FastAPI
  - RDKit
  - Google Gemini API
  - Pandas

- Frontend:
  - React
  - Material-UI
  - Axios
  - React 3D Molecule Viewer 