import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  Autocomplete,
  Chip,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import axios from 'axios';
import MoleculeViewer from './components/MoleculeViewer';
import config from './config';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
});

function App() {
  const [file, setFile] = useState(null);
  const [molecularFormula, setMolecularFormula] = useState('');
  const [structure, setStructure] = useState('');
  const [properties, setProperties] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
  
  // New state for disease discovery
  const [diseaseInput, setDiseaseInput] = useState('');
  const [diseaseSuggestions, setDiseaseSuggestions] = useState([]);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [targetProteins, setTargetProteins] = useState([]);
  const [drugClass, setDrugClass] = useState('');
  const [discoveryResults, setDiscoveryResults] = useState(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // New state for protein suggestions
  const [proteinSuggestions, setProteinSuggestions] = useState(null);
  const [proteinLoading, setProteinLoading] = useState(false);
  const [showProteinSuggestions, setShowProteinSuggestions] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    setFile(file);
    setError(null);
  };

  const showSnackbar = (message, severity = 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const validateInputs = () => {
    if (!molecularFormula.trim()) {
      showSnackbar('Please enter a molecular formula', 'error');
      return false;
    }
    if (!structure.trim()) {
      showSnackbar('Please enter a molecular structure (SMILES)', 'error');
      return false;
    }
    try {
      if (properties.trim()) {
        JSON.parse(properties);
      }
    } catch (e) {
      showSnackbar('Properties must be valid JSON', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateInputs()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, upload the CSV file if it exists
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post(`${config.apiUrl}/upload-csv`, formData);
        showSnackbar('CSV file uploaded successfully', 'success');
      }

      // Then analyze the molecule
      const response = await axios.post(`${config.apiUrl}/analyze-molecule`, {
        molecular_formula: molecularFormula,
        structure: structure,
        properties: JSON.parse(properties || '{}'),
      });

      setResult(response.data);
      showSnackbar('Analysis completed successfully', 'success');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'An error occurred during analysis';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDiseaseSearch = async (input) => {
    setDiseaseInput(input);
    if (input.length > 2) {
      try {
        const response = await axios.get(`https://api.datamuse.com/words?sp=${input}*&max=10`);
        setDiseaseSuggestions(response.data.map(item => item.word));
      } catch (error) {
        console.error('Error fetching disease suggestions:', error);
      }
    } else {
      setDiseaseSuggestions([]);
    }
  };

  const handleDiseaseSelect = (event, newValue) => {
    setSelectedDisease(newValue);
    setDiseaseInput(newValue || '');
  };

  const handleAddTargetProtein = (event) => {
    if (event.key === 'Enter' && event.target.value.trim()) {
      setTargetProteins([...targetProteins, event.target.value.trim()]);
      event.target.value = '';
    }
  };

  const handleRemoveTargetProtein = (protein) => {
    setTargetProteins(targetProteins.filter(p => p !== protein));
  };

  const handleDiscoverDrugs = async () => {
    if (!selectedDisease) {
      showSnackbar('Please select a disease', 'error');
      return;
    }

    setDiscoveryLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${config.apiUrl}/discover-drugs`, {
        disease_name: selectedDisease,
        target_proteins: targetProteins,
        drug_class: drugClass || undefined
      });

      setDiscoveryResults(response.data);
      showSnackbar('Drug discovery completed successfully', 'success');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'An error occurred during drug discovery';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const handleSuggestProteins = async () => {
    if (!selectedDisease) {
      showSnackbar('Please select a disease first', 'error');
      return;
    }

    setProteinLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${config.apiUrl}/suggest-proteins`, {
        disease_name: selectedDisease,
        drug_class: drugClass || undefined
      });

      setProteinSuggestions(response.data);
      setShowProteinSuggestions(true);
      showSnackbar('Protein suggestions generated successfully', 'success');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'An error occurred while getting protein suggestions';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setProteinLoading(false);
    }
  };

  const handleAddSuggestedProtein = (protein) => {
    if (!targetProteins.includes(protein.name)) {
      setTargetProteins([...targetProteins, protein.name]);
      showSnackbar(`Added ${protein.name} to target proteins`, 'success');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            Drug Discovery Platform
          </Typography>

          {/* Disease Discovery Section */}
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Disease-Based Drug Discovery
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Autocomplete
                  freeSolo
                  options={diseaseSuggestions}
                  value={selectedDisease}
                  onChange={handleDiseaseSelect}
                  onInputChange={(event, newInputValue) => handleDiseaseSearch(newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search Disease"
                      fullWidth
                      required
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Preferred Drug Class (Optional)"
                  value={drugClass}
                  onChange={(e) => setDrugClass(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  onClick={handleSuggestProteins}
                  disabled={proteinLoading || !selectedDisease}
                  sx={{ mb: 2 }}
                >
                  {proteinLoading ? <CircularProgress size={24} /> : 'Get Protein Suggestions'}
                </Button>

                {showProteinSuggestions && proteinSuggestions && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Suggested Target Proteins
                    </Typography>
                    {proteinSuggestions.proteins.map((protein, index) => (
                      <Paper key={index} sx={{ p: 2, mb: 1 }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={8}>
                            <Typography variant="subtitle1">
                              {protein.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              UniProt ID: {protein.uniprot_id}
                            </Typography>
                            <Typography variant="body2">
                              Role: {protein.role}
                            </Typography>
                            <Typography variant="body2">
                              Target Potential: {protein.target_potential}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
                            <Button
                              variant="outlined"
                              color="primary"
                              onClick={() => handleAddSuggestedProtein(protein)}
                              disabled={targetProteins.includes(protein.name)}
                            >
                              {targetProteins.includes(protein.name) ? 'Added' : 'Add Protein'}
                            </Button>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Target Proteins (Press Enter to add)"
                  onKeyPress={handleAddTargetProtein}
                  helperText="Enter protein names and press Enter to add them"
                />
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {targetProteins.map((protein) => (
                    <Chip
                      key={protein}
                      label={protein}
                      onDelete={() => handleRemoveTargetProtein(protein)}
                    />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={handleDiscoverDrugs}
                  disabled={discoveryLoading || !selectedDisease}
                >
                  {discoveryLoading ? <CircularProgress size={24} /> : 'Discover Drugs'}
                </Button>
              </Grid>
            </Grid>

            {discoveryResults && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Discovery Results for {discoveryResults.disease}
                </Typography>
                {discoveryResults.drug_candidates.candidates.map((candidate, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {candidate.name}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2">
                          <strong>SMILES:</strong> {candidate.smiles}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Molecular Formula:</strong> {candidate.molecular_formula}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2">
                          <strong>Mechanism:</strong> {candidate.mechanism}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Side Effects:</strong> {candidate.side_effects}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Drug-Likeness:</strong> {candidate.drug_likeness}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <MoleculeViewer smiles={candidate.smiles} />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>

          {/* Existing Molecule Analysis Section */}
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Molecule Analysis
            </Typography>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    component="label"
                    fullWidth
                  >
                    Upload CSV Dataset
                    <input
                      type="file"
                      hidden
                      accept=".csv"
                      onChange={handleFileUpload}
                    />
                  </Button>
                  {file && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Selected file: {file.name}
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Molecular Formula"
                    value={molecularFormula}
                    onChange={(e) => setMolecularFormula(e.target.value)}
                    required
                    error={!!error && error.includes('formula')}
                    helperText={error && error.includes('formula') ? error : ''}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Molecular Structure (SMILES)"
                    value={structure}
                    onChange={(e) => setStructure(e.target.value)}
                    required
                    error={!!error && error.includes('SMILES')}
                    helperText={error && error.includes('SMILES') ? error : ''}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Properties (JSON)"
                    multiline
                    rows={4}
                    value={properties}
                    onChange={(e) => setProperties(e.target.value)}
                    error={!!error && error.includes('JSON')}
                    helperText={error && error.includes('JSON') ? error : 'Enter properties as JSON object'}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Analyze Molecule'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Analysis Results
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6">Molecular Viewer</Typography>
                  <MoleculeViewer smiles={result.smiles} />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6">Analysis</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {result.analysis}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Molecular Weight: {result.molecular_weight.toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
        </Box>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App; 