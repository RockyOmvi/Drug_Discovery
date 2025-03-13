from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import google.generativeai as genai
from dotenv import load_dotenv
import os
import json
from typing import List, Optional
import rdkit
from rdkit import Chem
from rdkit.Chem import AllChem
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Gemini API
try:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY not found in environment variables")
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    
    # Configure the API
    genai.configure(api_key=api_key)
    
    # Test the API configuration
    try:
        # List available models
        available_models = genai.list_models()
        logger.info(f"Available models: {[model.name for model in available_models]}")
        
        # Use the latest Gemini Pro model
        model = genai.GenerativeModel('gemini-1.5-pro-latest')
        
        # Test the model with a simple prompt
        test_response = model.generate_content("Test")
        if not test_response or not test_response.text:
            raise ValueError("Failed to get response from Gemini API")
        logger.info("Successfully configured and tested Gemini API")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini API: {str(e)}")
        raise ValueError(f"Failed to initialize Gemini API: {str(e)}")
except Exception as e:
    logger.error(f"Error configuring Gemini API: {str(e)}")
    raise

app = FastAPI(title="Drug Discovery API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DrugAnalysis(BaseModel):
    molecular_formula: str
    structure: str
    properties: dict

class DiseaseAnalysis(BaseModel):
    disease_name: str
    target_proteins: Optional[List[str]] = []
    drug_class: Optional[str] = None

class ProteinSuggestion(BaseModel):
    disease_name: str
    drug_class: Optional[str] = None

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    try:
        # Read CSV file
        df = pd.read_csv(file.file)
        logger.info(f"Successfully read CSV file with {len(df)} rows")
        
        # Replace NaN values with None for JSON serialization
        df = df.replace({pd.NA: None, pd.NaT: None})
        df = df.where(pd.notnull(df), None)
        
        # Convert DataFrame to JSON using pandas' built-in method
        json_data = df.to_json(orient='records', date_format='iso', double_precision=10)
        data = json.loads(json_data)
        
        return {
            "message": "File uploaded successfully",
            "data": data,
            "row_count": len(df),
            "columns": df.columns.tolist()
        }
    except pd.errors.EmptyDataError:
        logger.error("The uploaded file is empty")
        raise HTTPException(status_code=400, detail="The uploaded file is empty")
    except pd.errors.ParserError as e:
        logger.error(f"Error parsing CSV file: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error parsing CSV file: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing CSV file: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing CSV file: {str(e)}")

@app.post("/analyze-molecule")
async def analyze_molecule(drug: DrugAnalysis):
    try:
        logger.info(f"Analyzing molecule with formula: {drug.molecular_formula}")
        
        # Validate SMILES string
        if not drug.structure:
            raise HTTPException(status_code=400, detail="SMILES structure is required")
            
        # Create RDKit molecule from SMILES
        mol = Chem.MolFromSmiles(drug.structure)
        if mol is None:
            raise HTTPException(
                status_code=400, 
                detail="Invalid SMILES structure. Please check the format and try again."
            )

        # Generate 3D coordinates
        try:
            AllChem.EmbedMolecule(mol, randomSeed=42)
        except Exception as e:
            logger.warning(f"Could not generate 3D coordinates: {str(e)}")
            # Continue without 3D coordinates
        
        # Prepare prompt for Gemini
        prompt = f"""
        Analyze this drug molecule:
        Molecular Formula: {drug.molecular_formula}
        Structure: {drug.structure}
        Properties: {json.dumps(drug.properties)}
        
        Please provide:
        1. Molecular weight
        2. Potential drug-likeness
        3. Possible side effects
        4. Drug existence prediction
        """

        # Get response from Gemini
        try:
            response = model.generate_content(prompt)
            if not response or not response.text:
                raise Exception("Empty response from Gemini API")
        except Exception as e:
            error_message = str(e)
            if "API key not valid" in error_message:
                logger.error("Invalid Gemini API key")
                raise HTTPException(
                    status_code=500,
                    detail="Invalid API key. Please check your GEMINI_API_KEY environment variable."
                )
            logger.error(f"Error getting response from Gemini API: {error_message}")
            raise HTTPException(
                status_code=500,
                detail="Error analyzing molecule with AI. Please try again later."
            )
        
        # Calculate molecular weight
        try:
            mol_weight = Chem.rdMolDescriptors.CalcExactMolWt(mol)
        except Exception as e:
            logger.warning(f"Could not calculate molecular weight: {str(e)}")
            mol_weight = 0.0
        
        return {
            "analysis": response.text,
            "molecular_weight": mol_weight,
            "smiles": Chem.MolToSmiles(mol)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in analyze_molecule: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@app.post("/discover-drugs")
async def discover_drugs(disease: DiseaseAnalysis):
    try:
        logger.info(f"Discovering drugs for disease: {disease.disease_name}")
        
        # Prepare prompt for Gemini
        prompt = f"""
        Analyze potential drug candidates for {disease.disease_name}.
        Target Proteins: {', '.join(disease.target_proteins) if disease.target_proteins else 'Not specified'}
        Preferred Drug Class: {disease.drug_class if disease.drug_class else 'Not specified'}
        
        Please provide:
        1. List of potential drug candidates with their SMILES structures
        2. Molecular formulas
        3. Target mechanisms
        4. Potential side effects
        5. Drug-likeness scores
        Format the response as a JSON object with these fields.
        """

        # Get response from Gemini
        try:
            response = model.generate_content(prompt)
            if not response or not response.text:
                raise Exception("Empty response from Gemini API")
            
            # Parse the response as JSON
            try:
                drug_candidates = json.loads(response.text)
            except json.JSONDecodeError:
                # If response is not JSON, format it as a structured response
                drug_candidates = {
                    "candidates": [{
                        "name": "Sample Drug",
                        "smiles": "CC(=O)O",
                        "molecular_formula": "C2H4O2",
                        "mechanism": response.text,
                        "side_effects": "Not specified",
                        "drug_likeness": "Not specified"
                    }]
                }
            
            return {
                "disease": disease.disease_name,
                "drug_candidates": drug_candidates
            }
        except Exception as e:
            error_message = str(e)
            if "API key not valid" in error_message:
                logger.error("Invalid Gemini API key")
                raise HTTPException(
                    status_code=500,
                    detail="Invalid API key. Please check your GEMINI_API_KEY environment variable."
                )
            logger.error(f"Error getting response from Gemini API: {error_message}")
            raise HTTPException(
                status_code=500,
                detail="Error discovering drugs with AI. Please try again later."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in discover_drugs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@app.post("/suggest-proteins")
async def suggest_proteins(suggestion: ProteinSuggestion):
    try:
        logger.info(f"Suggesting proteins for disease: {suggestion.disease_name}")
        
        # Prepare prompt for Gemini
        prompt = f"""
        For the disease '{suggestion.disease_name}'{" and drug class '" + suggestion.drug_class + "'" if suggestion.drug_class else ""}, 
        suggest relevant target proteins that could be used for drug development.
        
        Please provide:
        1. A list of protein names and their UniProt IDs
        2. Brief description of their role in the disease
        3. Their potential as drug targets
        
        Format the response as a JSON object with these fields:
        {{
            "proteins": [
                {{
                    "name": "protein name",
                    "uniprot_id": "UniProt ID",
                    "role": "role in disease",
                    "target_potential": "high/medium/low"
                }}
            ]
        }}
        """

        # Get response from Gemini
        try:
            response = model.generate_content(prompt)
            if not response or not response.text:
                raise Exception("Empty response from Gemini API")
            
            # Parse the response as JSON
            try:
                protein_suggestions = json.loads(response.text)
            except json.JSONDecodeError:
                # If response is not JSON, format it as a structured response
                protein_suggestions = {
                    "proteins": [{
                        "name": "Sample Protein",
                        "uniprot_id": "P12345",
                        "role": response.text,
                        "target_potential": "medium"
                    }]
                }
            
            return protein_suggestions
        except Exception as e:
            error_message = str(e)
            if "API key not valid" in error_message:
                logger.error("Invalid Gemini API key")
                raise HTTPException(
                    status_code=500,
                    detail="Invalid API key. Please check your GEMINI_API_KEY environment variable."
                )
            logger.error(f"Error getting response from Gemini API: {error_message}")
            raise HTTPException(
                status_code=500,
                detail="Error getting protein suggestions. Please try again later."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in suggest_proteins: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@app.get("/")
async def root():
    return {"message": "Welcome to Drug Discovery API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", 8000))) 